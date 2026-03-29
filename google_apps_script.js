/**
 * NRI Bridge India — Google Apps Script Backend
 *
 * Deploy as Web App:
 *   Execute as: "Me"
 *   Access: "Anyone"
 *
 * After deploying, copy the Web App URL and update GOOGLE_SCRIPT_URL
 * in login.html and signup.html.
 *
 * This script handles:
 *   - Signup form submissions → "Signups" sheet
 *   - Login attempts → "Logins" sheet (for tracking/analytics)
 *   - Contact/consultation requests → "Contacts" sheet
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var type = data.type || 'unknown';

    if (type === 'signup') {
      var sheet = ss.getSheetByName('Signups') || ss.insertSheet('Signups');

      // Add headers if sheet is empty
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          'Timestamp', 'Name', 'Email', 'Phone', 'Country', 'Status'
        ]);
        sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
      }

      sheet.appendRow([
        new Date().toISOString(),
        data.name || '',
        data.email || '',
        data.phone || '',
        data.country || '',
        'New'
      ]);

      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success', message: 'Signup recorded' }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (type === 'login') {
      var sheet = ss.getSheetByName('Logins') || ss.insertSheet('Logins');

      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Timestamp', 'Email', 'Status']);
        sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
      }

      sheet.appendRow([
        new Date().toISOString(),
        data.email || '',
        'Attempted'
      ]);

      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success', message: 'Login recorded' }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (type === 'contact') {
      var sheet = ss.getSheetByName('Contacts') || ss.insertSheet('Contacts');

      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Timestamp', 'Name', 'Email', 'Phone', 'Message', 'Source']);
        sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
      }

      sheet.appendRow([
        new Date().toISOString(),
        data.name || '',
        data.email || '',
        data.phone || '',
        data.message || '',
        data.source || 'website'
      ]);

      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success', message: 'Contact recorded' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown type: ' + type }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle CORS preflight requests
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'NRI Bridge India API is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}
