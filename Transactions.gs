/**
 * Transactions.gs
 * Core business functions: initialization and saving transactions.
 */

function setupPhotobooth() {
  var ss = ensureSheets_();
  var folders = ensureFolders_();
  Logger.log('SETUP COMPLETE.');
  Logger.log('Spreadsheet ID: ' + ss.getId());
  Logger.log('Root Folder ID: ' + folders.root.getId());
  return { success: true, spreadsheetId: ss.getId() };
}

function saveTransaction(payload) {
  try {
    var settingsRes = getSettings();
    var settings = settingsRes.settings || DEFAULT_SETTINGS;
    var folders = ensureFolders_();

    var transactionId = getNextTransactionNumber_();
    var now = new Date();
    var tz = Session.getScriptTimeZone() || 'Asia/Manila';
    var dateStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    var timeStr = Utilities.formatDate(now, tz, 'HH:mm:ss');

    // 1. Save original photos
    var origIds = [];
    var origUrls = [];
    if (payload.photos && payload.photos.length) {
      for (var i = 0; i < payload.photos.length; i++) {
        var pName = transactionId + '-Original-' + ('0' + (i + 1)).slice(-2) + '.jpg';
        var file = saveFileToFolder_(folders.originals, payload.photos[i], 'image/jpeg', pName);
        origIds.push(file.getId());
        origUrls.push(getDirectImageUrl_(file.getId()));
      }
    }

    // 2. Save photo strip
    var stripId = '';
    var stripUrl = '';
    var photoQrUrl = '';
    if (payload.photoStrip) {
      var sName = transactionId + '-PhotoStrip.png';
      var stripFile = saveFileToFolder_(folders.strips, payload.photoStrip, 'image/png', sName);
      stripId = stripFile.getId();
      stripUrl = getDirectImageUrl_(stripId);
      photoQrUrl = getQrCodeUrl_(stripUrl, 150);
    }

    // 3. Payment QR logic
    var paymentQrUrl = '';
    if (settings.paymentQrImageUrl) {
      paymentQrUrl = settings.paymentQrImageUrl;
    } else if (payload.paymentQrData) {
      paymentQrUrl = getQrCodeUrl_(payload.paymentQrData, 150);
    }

    // 4. Calculate total
    var qty = Number(payload.quantity) || 1;
    var price = Number(payload.price) || 0;
    var discount = Number(payload.discount) || 0;
    var total = Math.max(0, (qty * price) - discount);

    // 5. Append transaction row to sheet
    var row = [
      transactionId,
      dateStr,
      timeStr,
      payload.customerName || 'Walk-in',
      payload.photoLabel || '',
      payload.package || '',
      qty,
      price,
      discount,
      total,
      payload.paymentMethod || 'CASH',
      origIds.join(','),
      origUrls.join(','),
      stripId,
      stripUrl,
      photoQrUrl,
      payload.paymentQrData || '',
      'COMPLETED',
      Session.getActiveUser().getEmail() || 'System'
    ];
    appendTransactionRow_(row);

    // 6. Return printable receipt payload
    return {
      success: true,
      receipt: {
        transactionId: transactionId,
        date: dateStr,
        time: timeStr,
        businessName: settings.businessName,
        photoLabel: payload.photoLabel,
        package: payload.package,
        quantity: qty,
        price: price,
        discount: discount,
        total: total,
        currency: settings.currency || '₱',
        paymentMethod: payload.paymentMethod,
        photoQrUrl: photoQrUrl,
        paymentQrUrl: paymentQrUrl,
        paymentInstructions: settings.paymentInstructions,
        thankYouMessage: settings.thankYouMessage,
        footer: settings.footer,
        receiptWidthClass: (settings.receiptWidth === '80mm') ? 'receipt-80' : (settings.receiptWidth === 'a4' ? 'receipt-a4' : 'receipt-58')
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}