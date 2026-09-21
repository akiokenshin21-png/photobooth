/**
 * ============================================================
 * PHOTO BOOTH RECEIPT APP
 * Code.gs
 *
 * Features:
 * - Photo Booth web app
 * - Upload original photos to Google Drive
 * - Create unique session folder
 * - Create gallery URL
 * - Generate QR code URL
 * - Gallery page for customers
 * - Download original photos
 * ============================================================
 */


/* ============================================================
 * CONFIGURATION
 * ============================================================ */

const PHOTO_BOOTH_FOLDER_NAME = 'Photo Booth Sessions';

// QR service
const QR_SERVICE_URL = 'https://quickchart.io/qr';


/* ============================================================
 * WEB APP
 * ============================================================ */

function doGet(e) {

  e = e || {};
  const params = e.parameter || {};

  // Customer photo gallery
  if (params.page === 'gallery' && params.session) {
    return renderGallery_(params.session);
  }

  // Main Photo Booth application
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Photo Booth Receipt')
    .addMetaTag(
      'viewport',
      'width=device-width, initial-scale=1, maximum-scale=1'
    )
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/* ============================================================
 * HTML INCLUDE
 * ============================================================ */

function include(filename) {

  if (!filename) {
    throw new Error('HTML include filename is required.');
  }

  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();
}


/* ============================================================
 * GOOGLE DRIVE
 * ============================================================ */

/**
 * Get or create the main Photo Booth folder.
 */
function getPhotoBoothRootFolder_() {

  const props = PropertiesService.getScriptProperties();

  let folderId = props.getProperty('PHOTO_BOOTH_ROOT_FOLDER_ID');

  // Existing folder
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (err) {
      // Folder no longer exists.
      props.deleteProperty('PHOTO_BOOTH_ROOT_FOLDER_ID');
    }
  }

  // Find existing folder
  const folders = DriveApp.getFoldersByName(
    PHOTO_BOOTH_FOLDER_NAME
  );

  if (folders.hasNext()) {

    const folder = folders.next();

    props.setProperty(
      'PHOTO_BOOTH_ROOT_FOLDER_ID',
      folder.getId()
    );

    return folder;
  }

  // Create folder
  const folder = DriveApp.createFolder(
    PHOTO_BOOTH_FOLDER_NAME
  );

  props.setProperty(
    'PHOTO_BOOTH_ROOT_FOLDER_ID',
    folder.getId()
  );

  return folder;
}


/* ============================================================
 * CREATE PHOTO SESSION
 * ============================================================ */

/**
 * Upload original photos to Google Drive.
 *
 * @param {Array} photos
 * Array of objects:
 *
 * {
 *   dataUrl: "data:image/jpeg;base64,...",
 *   name: "photo-1.jpg"
 * }
 *
 * @param {Object} metadata
 * Optional receipt/session information.
 *
 * @return {Object}
 */
function createPhotoSession(photos, metadata) {

  if (!photos || !photos.length) {
    throw new Error('No photos were supplied.');
  }

  metadata = metadata || {};

  const rootFolder = getPhotoBoothRootFolder_();

  // Unique session ID
  const sessionId =
    'PB-' +
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone() || 'Asia/Manila',
      'yyyyMMdd-HHmmss'
    ) +
    '-' +
    Utilities.getUuid()
      .replace(/-/g, '')
      .substring(0, 8)
      .toUpperCase();


  // Create individual session folder
  const sessionFolder = rootFolder.createFolder(
    sessionId
  );


  const uploadedPhotos = [];


  photos.forEach(function(photo, index) {

    if (!photo || !photo.dataUrl) {
      return;
    }

    const dataUrl = photo.dataUrl;

    const match = dataUrl.match(
      /^data:([^;]+);base64,(.+)$/
    );

    if (!match) {
      throw new Error(
        'Invalid photo data for photo ' + (index + 1)
      );
    }

    const contentType = match[1];
    const base64Data = match[2];

    const bytes = Utilities.base64Decode(
      base64Data
    );

    const extension =
      contentType === 'image/png'
        ? 'png'
        : 'jpg';

    const fileName =
      photo.name ||
      'Original-Photo-' +
      String(index + 1).padStart(2, '0') +
      '.' +
      extension;

    const blob = Utilities.newBlob(
      bytes,
      contentType,
      fileName
    );

    const file = sessionFolder.createFile(blob);


    /*
     * Make the individual photo accessible
     * through its link.
     */
    try {

      file.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW
      );

    } catch (sharingError) {

      console.warn(
        'Unable to change sharing permission: ' +
        sharingError
      );

    }


    uploadedPhotos.push({
      id: file.getId(),
      name: file.getName(),
      url:
        'https://drive.google.com/uc?export=download&id=' +
        file.getId()
    });

  });


  /*
   * Create a manifest file.
   *
   * This allows the gallery to know which photos
   * belong to this particular session.
   */
  const manifest = {
    sessionId: sessionId,
    createdAt: new Date().toISOString(),
    metadata: metadata,
    photos: uploadedPhotos
  };


  sessionFolder.createFile(
    'session.json',
    JSON.stringify(manifest, null, 2),
    MimeType.PLAIN_TEXT
  );


  /*
   * Create customer gallery URL.
   */
  const webAppUrl =
    ScriptApp.getService().getUrl();


  if (!webAppUrl) {
    throw new Error(
      'Web App URL is not available. ' +
      'Please deploy the project as a Web App first.'
    );
  }


  const galleryUrl =
    webAppUrl +
    '?page=gallery&session=' +
    encodeURIComponent(sessionId);


  /*
   * QR code image URL.
   */
  const qrCodeUrl =
    QR_SERVICE_URL +
    '?size=500' +
    '&margin=2' +
    '&text=' +
    encodeURIComponent(galleryUrl);


  return {
    success: true,
    sessionId: sessionId,
    galleryUrl: galleryUrl,
    qrCodeUrl: qrCodeUrl,
    folderId: sessionFolder.getId(),
    photos: uploadedPhotos
  };
}


/* ============================================================
 * FIND SESSION
 * ============================================================ */

/**
 * Find the session folder.
 */
function findSessionFolder_(sessionId) {

  if (!sessionId) {
    return null;
  }

  const rootFolder =
    getPhotoBoothRootFolder_();

  const folders =
    rootFolder.getFoldersByName(sessionId);

  if (!folders.hasNext()) {
    return null;
  }

  return folders.next();
}


/* ============================================================
 * LOAD SESSION
 * ============================================================ */

function getPhotoSession(sessionId) {

  const folder =
    findSessionFolder_(sessionId);

  if (!folder) {
    throw new Error(
      'Photo session not found.'
    );
  }


  const files =
    folder.getFilesByName('session.json');


  if (!files.hasNext()) {
    throw new Error(
      'Session information was not found.'
    );
  }


  const manifestFile =
    files.next();


  const manifestText =
    manifestFile.getBlob()
      .getDataAsString();


  return JSON.parse(manifestText);
}


/* ============================================================
 * GALLERY PAGE
 * ============================================================ */

function renderGallery_(sessionId) {

  const session =
    getPhotoSession(sessionId);


  const template =
    HtmlService.createTemplateFromFile(
      'Gallery'
    );


  template.session =
    session;


  return template
    .evaluate()
    .setTitle(
      'Your Photo Booth Photos'
    )
    .addMetaTag(
      'viewport',
      'width=device-width, initial-scale=1'
    )
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}


/* ============================================================
 * GET PHOTO SESSION DATA FOR FRONTEND
 * ============================================================ */

function getGalleryData(sessionId) {

  return getPhotoSession(sessionId);

}


/* ============================================================
 * UTILITY
 * ============================================================ */

/**
 * Test Drive configuration.
 */
function testPhotoBoothFolder() {

  const folder =
    getPhotoBoothRootFolder_();

  Logger.log(
    'Photo Booth folder: ' +
    folder.getName()
  );

  Logger.log(
    'Folder ID: ' +
    folder.getId()
  );

  return {
    name: folder.getName(),
    id: folder.getId()
  };
}