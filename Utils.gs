/**
 * Utils.gs
 * Helper functions for conversions, dates, and QR code generation URLs.
 */

function toNumber_(val, fallback) {
  var num = Number(val);
  return isNaN(num) ? fallback : num;
}

function getQrCodeUrl_(data, size) {
  var s = size || 150;
  return 'https://api.qrserver.com/v1/create-qr-code/?size=' + s + 'x' + s + '&data=' + encodeURIComponent(data);
}

function formatDate_(date, format) {
  var tz = Session.getScriptTimeZone() || 'Asia/Manila';
  return Utilities.formatDate(date, tz, format);
}