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
 *   - Onboarding submissions → "Onboarding" sheet (multi-service)
 *   - Vehicle inquiries → "Vehicle Inquiries" sheet
 *   - Parental care inquiries → "Parental Inquiries" sheet
 *   - Legal inquiries → "Legal Inquiries" sheet
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var type = data.type || 'unknown';

    if (type === 'signup') {
      var sheet = ss.getSheetByName('Signups') || ss.insertSheet('Signups');

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

    } else if (type === 'onboarding') {
      var sheet = ss.getSheetByName('Onboarding') || ss.insertSheet('Onboarding');

      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          'Timestamp', 'Name', 'Email', 'Selected Services',
          'Service Details (JSON)', 'Plans (JSON)', 'Billing',
          'Total Monthly', 'Payment Method', 'Transaction ID'
        ]);
        sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
      }

      sheet.appendRow([
        new Date().toISOString(),
        data.name || '',
        data.email || '',
        (data.selectedServices || []).join(', '),
        JSON.stringify(data.serviceDetails || {}),
        JSON.stringify(data.servicePlans || {}),
        data.billing || 'monthly',
        data.totalMonthly || 0,
        data.paymentMethod || 'card',
        data.transactionId || ''
      ]);

      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success', message: 'Onboarding recorded' }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (type === 'vehicle-inquiry') {
      var sheet = ss.getSheetByName('Vehicle Inquiries') || ss.insertSheet('Vehicle Inquiries');

      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          'Timestamp', 'Name', 'Email', 'Phone',
          'Vehicle Type', 'Registration Number', 'City',
          'Service Needed', 'Message'
        ]);
        sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
      }

      sheet.appendRow([
        new Date().toISOString(),
        data.name || '',
        data.email || '',
        data.phone || '',
        data.vehicleType || '',
        data.regNumber || '',
        data.city || '',
        data.serviceNeeded || '',
        data.message || ''
      ]);

      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success', message: 'Vehicle inquiry recorded' }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (type === 'parental-inquiry') {
      var sheet = ss.getSheetByName('Parental Inquiries') || ss.insertSheet('Parental Inquiries');

      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          'Timestamp', 'Name', 'Email', 'Phone',
          'Parent Name', 'Parent City', 'Parent Age',
          'Health Conditions', 'Service Needed', 'Message'
        ]);
        sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
      }

      sheet.appendRow([
        new Date().toISOString(),
        data.name || '',
        data.email || '',
        data.phone || '',
        data.parentName || '',
        data.parentCity || '',
        data.parentAge || '',
        data.healthConditions || '',
        data.serviceNeeded || '',
        data.message || ''
      ]);

      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success', message: 'Parental inquiry recorded' }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (type === 'legal-inquiry') {
      var sheet = ss.getSheetByName('Legal Inquiries') || ss.insertSheet('Legal Inquiries');

      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          'Timestamp', 'Name', 'Email', 'Phone',
          'Case Type', 'City', 'Urgency',
          'Description', 'Message'
        ]);
        sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
      }

      sheet.appendRow([
        new Date().toISOString(),
        data.name || '',
        data.email || '',
        data.phone || '',
        data.caseType || '',
        data.city || '',
        data.urgency || 'normal',
        data.description || '',
        data.message || ''
      ]);

      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success', message: 'Legal inquiry recorded' }))
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
