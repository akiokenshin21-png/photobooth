/**
 * Config.gs
 * Central configuration: Script Properties helpers, sheet names,
 * header definitions, and default settings values.
 */

function getScriptProperties_() {
  return PropertiesService.getScriptProperties();
}

function getProp_(key, fallback) {
  var v = getScriptProperties_().getProperty(key);
  return (v === null || v === undefined) ? fallback : v;
}

function setProp_(key, value) {
  getScriptProperties_().setProperty(key, String(value));
}

var SHEET_NAMES = {
  TRANSACTIONS: 'Transactions',
  SETTINGS: 'Setting',
  COUNTERS: 'Counters'
};

var TRANSACTION_HEADERS = [
  'Transaction ID', 'Date', 'Time', 'Customer Name', 'Photo Label',
  'Package', 'Quantity', 'Price', 'Discount', 'Total', 'Payment Method',
  'Original Photo IDs', 'Original Photo URLs', 'Photo Strip File ID',
  'Photo Strip URL', 'Photo QR URL', 'Payment QR Data', 'Status', 'Created By'
];

// Keys here also define the expected TYPE of each setting (number/boolean/string)
// which Settings.gs uses to coerce values read back from the sheet.
var DEFAULT_SETTINGS = {
  businessName: 'Photo Booth',
  address: '',
  phone: '',
  email: '',
  logoUrl: '',
  thankYouMessage: 'Thank You!',

  defaultLabel: 'Photo Booth by Aki',
  numPhotos: 4,
  stripWidth: 600,
  stripHeight: 1800,
  stripSpacing: 20,
  stripBackground: '#ffffff',
  labelFont: 'Poppins, sans-serif',
  labelFontSize: 30,
  labelBold: true,
  labelAlign: 'center',
  showDate: true,
  showTransactionNumber: true,

  paymentProvider: 'GCash',
  paymentAccount: '',
  paymentUrl: '',
  paymentQrImageUrl: '',
  paymentInstructions: 'Scan to pay',

  currency: '₱',
  receiptWidth: '58mm',
  footer: 'Thank you for visiting!',
  defaultPackage: 'Photo Booth Session',
  defaultPrice: 100
};