/**
 * Database.gs
 * Google Sheets database layer: spreadsheet + sheet creation,
 * header management, transaction row storage, and the daily
 * transaction-number counter.
 */

function getOrCreateSpreadsheet_() {
  var id = getProp_('SPREADSHEET_ID', null);
  var ss = null;
  if (id) {
    try {
      ss = SpreadsheetApp.openById(id);
    } catch (e) {
      ss = null; // stale/invalid ID, fall through and recreate
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('PhotoBooth Database');
    setProp_('SPREADSHEET_ID', ss.getId());
  }
  return ss;
}

function ensureSheets_() {
  var ss = getOrCreateSpreadsheet_();
  ensureTransactionsSheet_(ss);
  ensureSettingsSheet_(ss);
  ensureCountersSheet_(ss);

  // Clean up the default blank "Sheet1" Google creates automatically,
  // but only if we already have our real sheets in place.
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1 && sheet1.getLastRow() === 0) {
    try { ss.deleteSheet(sheet1); } catch (e) { /* ignore */ }
  }
  return ss;
}

function ensureTransactionsSheet_(ss) {
  var sheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.TRANSACTIONS);
  }
  var width = TRANSACTION_HEADERS.length;
  var firstRow = sheet.getRange(1, 1, 1, width).getValues()[0];
  var needsHeaders = firstRow.join('|') !== TRANSACTION_HEADERS.join('|');
  if (needsHeaders) {
    sheet.getRange(1, 1, 1, width).setValues([TRANSACTION_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#ffe1ef');
    sheet.autoResizeColumns(1, width);
  }
  return sheet;
}

function ensureSettingsSheet_(ss) {
  var sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.SETTINGS);
    sheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#ffe1ef');
    var rows = [];
    for (var key in DEFAULT_SETTINGS) {
      if (DEFAULT_SETTINGS.hasOwnProperty(key)) {
        rows.push([key, DEFAULT_SETTINGS[key]]);
      }
    }
    if (rows.length) {
      sheet.getRange(2, 1, rows.length, 2).setValues(rows);
    }
    sheet.autoResizeColumns(1, 2);
  }
  return sheet;
}

function ensureCountersSheet_(ss) {
  var sheet = ss.getSheetByName(SHEET_NAMES.COUNTERS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.COUNTERS);
    sheet.getRange(1, 1, 1, 2).setValues([['DateKey', 'LastNumber']]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#ffe1ef');
  }
  return sheet;
}

function appendTransactionRow_(rowArray) {
  var ss = ensureSheets_();
  var sheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
  sheet.appendRow(rowArray);
}

/**
 * Generates the next transaction number in the format PB-YYYYMMDD-0001.
 * Uses a script lock + a per-day counter row so numbers never collide,
 * even if two devices save at the same moment.
 */
function getNextTransactionNumber_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = ensureSheets_();
    var sheet = ss.getSheetByName(SHEET_NAMES.COUNTERS);
    var tz = Session.getScriptTimeZone() || 'Asia/Manila';
    var dateKey = Utilities.formatDate(new Date(), tz, 'yyyyMMdd');

    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    var lastNumber = 0;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === dateKey) {
        rowIndex = i + 1; // 1-based sheet row
        lastNumber = Number(data[i][1]) || 0;
        break;
      }
    }
    var nextNumber = lastNumber + 1;
    if (rowIndex === -1) {
      sheet.appendRow([dateKey, nextNumber]);
    } else {
      sheet.getRange(rowIndex, 2).setValue(nextNumber);
    }
    var padded = ('0000' + nextNumber).slice(-4);
    return 'PB-' + dateKey + '-' + padded;
  } finally {
    lock.releaseLock();
  }
}