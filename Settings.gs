/**
 * Settings.gs
 * Reads and writes admin-configurable settings from the "Settings"
 * sheet, so business name, pricing, payment info, label text, etc.
 * can be changed from the UI without touching any code.
 */

function getSettings() {
  try {
    var ss = ensureSheets_();
    var sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
    var data = sheet.getDataRange().getValues();

    var settings = {};
    for (var key in DEFAULT_SETTINGS) {
      if (DEFAULT_SETTINGS.hasOwnProperty(key)) settings[key] = DEFAULT_SETTINGS[key];
    }

    for (var i = 1; i < data.length; i++) {
      var k = data[i][0];
      var v = data[i][1];
      if (!k || !DEFAULT_SETTINGS.hasOwnProperty(k)) continue;
      var defaultType = typeof DEFAULT_SETTINGS[k];
      if (defaultType === 'number') {
        v = toNumber_(v, DEFAULT_SETTINGS[k]);
      } else if (defaultType === 'boolean') {
        v = (v === true || v === 'TRUE' || v === 'true' || v === 1);
      } else {
        v = (v === null || v === undefined) ? '' : String(v);
      }
      settings[k] = v;
    }
    return { success: true, settings: settings };
  } catch (err) {
    return { success: false, error: 'Unable to load settings: ' + err.message };
  }
}

function saveSettings(newSettings) {
  try {
    if (!newSettings || typeof newSettings !== 'object') {
      throw new Error('No settings data received.');
    }
    var ss = ensureSheets_();
    var sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
    var data = sheet.getDataRange().getValues();

    var rowMap = {};
    for (var i = 1; i < data.length; i++) {
      rowMap[data[i][0]] = i + 1; // 1-based row number
    }

    for (var key in newSettings) {
      if (!newSettings.hasOwnProperty(key)) continue;
      if (!DEFAULT_SETTINGS.hasOwnProperty(key)) continue; // ignore unknown keys
      var value = newSettings[key];
      if (rowMap[key]) {
        sheet.getRange(rowMap[key], 2).setValue(value);
      } else {
        sheet.appendRow([key, value]);
        rowMap[key] = sheet.getLastRow();
      }
    }
    return { success: true, settings: getSettings().settings };
  } catch (err) {
    return { success: false, error: 'Unable to save settings: ' + err.message };
  }
}