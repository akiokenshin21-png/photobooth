/**
 * Drive.gs
 * Google Drive folder structure and file save/share helpers.
 *
 * Folder structure created under the user's My Drive:
 *   PhotoBooth/
 *     Original Photos/
 *     Photo Strips/
 *     Receipts/
 *
 * Sharing note (see item 14 in the spec):
 * Apps Script web apps cannot serve arbitrary binary files at a clean
 * public URL the way a normal web server can. The safest practical
 * approach inside Apps Script is:
 *   1. Save the file to Drive.
 *   2. Set sharing to "Anyone with the link - Viewer".
 *   3. Point the QR code at https://drive.google.com/uc?export=view&id=FILE_ID
 *      which renders the image directly in the browser (not just a Drive
 *      preview page), so scanning the QR code shows the actual photo.
 * If Drive sharing is restricted by a Workspace domain policy, the file
 * still saves successfully; the shared link simply won't work outside
 * the organization, which is a Workspace admin policy limitation, not
 * a bug in this app.
 */

function getOrCreateFolder_(name, parent) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function ensureFolders_() {
  var rootId = getProp_('ROOT_FOLDER_ID', null);
  var root = null;
  if (rootId) {
    try { root = DriveApp.getFolderById(rootId); } catch (e) { root = null; }
  }
  if (!root) {
    // Reuse an existing "PhotoBooth" folder if one is already there.
    var existing = DriveApp.getFoldersByName('PhotoBooth');
    root = existing.hasNext() ? existing.next() : DriveApp.createFolder('PhotoBooth');
    setProp_('ROOT_FOLDER_ID', root.getId());
  }

  var originals = getOrCreateFolder_('Original Photos', root);
  var strips = getOrCreateFolder_('Photo Strips', root);
  var receipts = getOrCreateFolder_('Receipts', root);

  setProp_('ORIGINAL_PHOTOS_FOLDER_ID', originals.getId());
  setProp_('PHOTO_STRIPS_FOLDER_ID', strips.getId());
  setProp_('RECEIPTS_FOLDER_ID', receipts.getId());

  return { root: root, originals: originals, strips: strips, receipts: receipts };
}

function base64ToBlob_(base64Data, mimeType, filename) {
  var parts = String(base64Data).split(',');
  var data = parts.length > 1 ? parts[1] : parts[0];
  var bytes = Utilities.base64Decode(data);
  return Utilities.newBlob(bytes, mimeType, filename);
}

/**
 * Saves a base64 image into the given folder and makes it link-shareable.
 * Returns the created DriveApp File object.
 */
function saveFileToFolder_(folder, base64Data, mimeType, filename) {
  var blob = base64ToBlob_(base64Data, mimeType, filename);
  var file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    // Domain policy may block public link sharing. The file is still
    // saved; only the public QR link will be restricted to the org.
  }
  return file;
}

function saveHtmlAsFile_(folder, htmlContent, filename) {
  var blob = Utilities.newBlob(htmlContent, 'text/html', filename);
  var file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) { /* ignore */ }
  return file;
}

function getDirectImageUrl_(fileId) {
  return 'https://drive.google.com/uc?export=view&id=' + fileId;
}
