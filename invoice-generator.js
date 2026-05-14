// invoice-generator.js
// Generates an invoice PDF via html2pdf.js.
//
// Edit BUSINESS below before going live: address, email, phone.
// SAC_BY_KEYWORD maps service-line text to SAC codes; tweak with your CA.

var BUSINESS = {
  name: 'NRI Bridge India',
  address: 'S.No 340B/1A3B1, Vinayaka Avenue, Okkiyam Thoraipakkam, OMR, Chennai – 600 097.',
  state: 'Tamil Nadu',
  stateCode: '33',
  email: 'support@nribridgeindia.com',
  phone: '+91 7824844999',
  website: 'www.nribridgeindia.com'
};

// SAC code lookup. Order matters — first matching keyword wins.
var SAC_BY_KEYWORD = [
  { match: /\b(rent|tenant|lease)\b/i, code: '997221' },
  { match: /\b(property|inspection|maintenance|utility)\b/i, code: '997222' },
  { match: /\b(doctor|medicine|health|wellness|companion|caretaker|emergency|elder|parent)\b/i, code: '999316' },
  { match: /\bvehicle\b/i, code: '998596' },
  { match: /\b(legal|compliance|court|will|succession|power\s*of\s*attorney|registration|tax|government)\b/i, code: '998211' }
];
var SAC_DEFAULT = '998599';

function lookupSac(description) {
  var d = String(description || '');
  for (var i = 0; i < SAC_BY_KEYWORD.length; i++) {
    if (SAC_BY_KEYWORD[i].match.test(d)) return SAC_BY_KEYWORD[i].code;
  }
  return SAC_DEFAULT;
}

window.downloadInvoice = function(invoiceData, sessionData) {
  if (!window.html2pdf) {
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = function() { _generatePdf(invoiceData, sessionData); };
    document.head.appendChild(script);
  } else {
    _generatePdf(invoiceData, sessionData);
  }
};

function _generatePdf(invoiceData, sessionData) {
  var wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '0';
  wrapper.style.zIndex = '-9999';
  wrapper.style.opacity = '0.01';
  wrapper.style.pointerEvents = 'none';
  document.body.appendChild(wrapper);

  var date = new Date(invoiceData.date || new Date());
  var formattedDate = date.toLocaleDateString('en-GB').replace(/\//g, '.');

  // Prefer the canonical invoice_number from the payments row; fall back to legacy logic
  // for older rows that pre-date the numbering migration.
  var invoiceNo = invoiceData.invoiceNumber
    || invoiceData.invoiceNo
    || (invoiceData.txnId ? 'INV-' + invoiceData.txnId.substring(3, 11).toUpperCase() : 'INV-' + Date.now());

  var methods = { card: 'Credit/Debit Card', upi: 'UPI', netbanking: 'Net Banking' };
  var payMethod = methods[invoiceData.method] || invoiceData.method || 'Card';

  var itemsHtml = '';
  var subtotal = 0;

  (invoiceData.items || []).forEach(function(item) {
    var price = parseFloat(item.price);
    var qty = parseInt(item.qty || 1);
    var lineTotal = price * qty;
    subtotal += lineTotal;
    var sac = item.sac || lookupSac(item.description);

    itemsHtml += '<tr>' +
      '<td class="td-desc">' + item.description + '</td>' +
      '<td class="td-center">' + sac + '</td>' +
      '<td class="td-center">' + qty + '</td>' +
      '<td class="td-center">₹' + price.toLocaleString('en-IN') + '</td>' +
      '<td class="td-right">₹' + lineTotal.toLocaleString('en-IN') + '</td>' +
    '</tr>';
  });

  var totalDiscount = invoiceData.discount ? parseFloat(invoiceData.discount) : 0;
  var netAmount = subtotal - totalDiscount;

  var html = `
    <style>
      .pdf-wrap {
        width: 794px;
        min-height: 1123px;
        background: #fafaf7;
        font-family: 'DM Sans', sans-serif;
        color: #1e3a5f;
        position: relative;
        overflow: hidden;
      }
      .pdf-header {
        background: #5b694b;
        height: 240px;
        position: relative;
        overflow: hidden;
        color: #ffffff;
        padding: 40px 60px;
        box-sizing: border-box;
      }
      .circle-1 {
        position: absolute; width: 800px; height: 800px; border-radius: 50%;
        background: rgba(255,255,255,0.04); top: -300px; right: -200px;
      }
      .circle-2 {
        position: absolute; width: 600px; height: 600px; border-radius: 50%;
        background: rgba(0,0,0,0.06); bottom: -300px; left: -150px;
      }
      .header-title {
        font-size: 2.8rem; font-weight: 700; letter-spacing: 0.15em;
        margin: 0 0 8px 0;
      }
      .header-subtitle {
        font-size: 0.85rem; letter-spacing: 0.18em; font-weight: 600;
        opacity: 0.9; margin-bottom: 14px;
      }
      .header-meta {
        font-size: 0.85rem; line-height: 1.7; font-weight: 500;
      }
      .header-meta strong { font-weight: 700; }
      .supplier-block {
        position: absolute; top: 40px; right: 60px;
        text-align: right; font-size: 0.78rem; line-height: 1.55;
        max-width: 320px;
      }
      .supplier-block .supplier-name {
        font-size: 1.15rem; font-weight: 700; margin-bottom: 6px;
      }
      .client-card {
        background: #ffffff; border-radius: 12px;
        margin: -40px 60px 0; padding: 22px 28px;
        display: flex; justify-content: space-between; align-items: flex-start;
        position: relative; z-index: 10;
        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      }
      .client-label {
        font-size: 0.75rem; font-weight: 700; color: #9a9d7e;
        text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;
      }
      .client-name {
        font-size: 1.4rem; font-weight: 700; color: #4a5d3f;
      }
      .client-details {
        text-align: right; font-size: 0.82rem; color: #3d4228; line-height: 1.6;
      }
      .table-area { padding: 18px 60px 16px; }
      .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      .inv-table th {
        font-weight: 700; font-size: 0.82rem; color: #1e3a5f;
        padding: 12px 6px; border-top: 2px solid #1e3a5f; border-bottom: 1.5px solid #1e3a5f;
      }
      .inv-table th:first-child { text-align: left; }
      .inv-table th.center { text-align: center; }
      .inv-table th.right { text-align: right; }
      .td-desc {
        padding: 14px 6px; font-size: 0.86rem; color: #1e3a5f; font-weight: 600; text-align: left;
        border-bottom: 1px solid rgba(0,0,0,0.04);
      }
      .td-center {
        padding: 14px 6px; font-size: 0.86rem; color: #1e3a5f; font-weight: 600; text-align: center;
        border-bottom: 1px solid rgba(0,0,0,0.04);
      }
      .td-right {
        padding: 14px 6px; font-size: 0.86rem; color: #1e3a5f; font-weight: 600; text-align: right;
        border-bottom: 1px solid rgba(0,0,0,0.04);
      }
      .totals-area { display: flex; justify-content: flex-end; padding: 0 60px 24px; }
      .totals-grid {
        display: grid; grid-template-columns: 160px 120px;
        gap: 8px 12px; font-size: 0.88rem; color: #1e3a5f;
      }
      .totals-grid .label { font-weight: 600; }
      .totals-grid .val { text-align: right; font-weight: 600; }
      .pay-total-area {
        margin: 0 60px; border-top: 2px solid #1e3a5f;
        padding-top: 18px; display: flex; justify-content: space-between;
      }
      .pay-details h4 {
        font-size: 0.9rem; font-weight: 700; margin: 0 0 8px 0; color: #1e3a5f;
      }
      .pay-grid {
        display: grid; grid-template-columns: auto auto; column-gap: 14px; row-gap: 4px;
        font-size: 0.8rem; color: #1e3a5f;
      }
      .pay-grid .label { font-weight: 600; }
      .grand-total-block { display: flex; align-items: center; gap: 24px; }
      .grand-total-block .label { font-size: 1.05rem; font-weight: 700; color: #1e3a5f; }
      .grand-total-block .val { font-size: 1.35rem; font-weight: 700; color: #1e3a5f; }

      .footer-card {
        background: #ffffff; border-radius: 12px;
        margin: 24px 60px 0; padding: 18px 24px;
        display: flex; justify-content: space-between; align-items: center;
        box-shadow: 0 4px 15px rgba(0,0,0,0.03);
      }
      .footer-contact h4 {
        font-size: 0.9rem; font-weight: 700; color: #1e3a5f; margin: 0 0 6px 0;
      }
      .footer-contact p { font-size: 0.78rem; color: #1e3a5f; margin: 0; line-height: 1.5; font-weight: 500; }
      .footer-thanks { font-size: 1.4rem; font-weight: 700; color: #1e3a5f; }

      .legal-footer {
        margin: 14px 60px 0; font-size: 0.7rem; color: #6a7058;
        font-style: italic; text-align: center; line-height: 1.5;
      }
      .bottom-bar {
        position: absolute; bottom: 0; left: 0; width: 100%; height: 30px;
        background: linear-gradient(135deg, #44543b 0%, #687955 100%);
      }
    </style>
    <div class="pdf-wrap">
      <div class="pdf-header">
        <div class="circle-1"></div>
        <div class="circle-2"></div>
        <div style="position: relative; z-index: 5;">
          <h1 class="header-title">INVOICE</h1>
          <div class="header-subtitle">SERVICE INVOICE</div>
          <div class="header-meta">
            <strong>Invoice No:</strong> ${invoiceNo}<br>
            <strong>Date:</strong> ${formattedDate}
          </div>
        </div>
        <div class="supplier-block">
          <div class="supplier-name">${BUSINESS.name}</div>
          ${BUSINESS.address}<br>
          <strong>State:</strong> ${BUSINESS.state} (${BUSINESS.stateCode})
        </div>
      </div>

      <div class="client-card">
        <div>
          <div class="client-label">Bill To</div>
          <div class="client-name">${sessionData.name || 'CLIENT'}</div>
        </div>
        <div class="client-details">
          ${sessionData.email || ''}<br>
          ${sessionData.phone || ''}
        </div>
      </div>

      <div class="table-area">
        <table class="inv-table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="center">SAC</th>
              <th class="center">Qty</th>
              <th class="center">Rate</th>
              <th class="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <div class="totals-area">
        <div class="totals-grid">
          <div class="label">Subtotal</div>
          <div class="val">₹${subtotal.toLocaleString('en-IN')}</div>
          ${totalDiscount > 0 ? '<div class="label">Discount</div><div class="val">-₹' + totalDiscount.toLocaleString('en-IN') + '</div>' : ''}
          <div class="label">Total Due</div>
          <div class="val">₹${Math.round(netAmount).toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div class="pay-total-area">
        <div class="pay-details">
          <h4>Payment Details</h4>
          <div class="pay-grid">
            <div class="label">Method:</div> <div>${payMethod}</div>
            <div class="label">Status:</div> <div style="color: #4a5d3f; font-weight: 700;">Paid</div>
            ${invoiceData.txnId ? '<div class="label">Txn ID:</div> <div>' + invoiceData.txnId + '</div>' : ''}
          </div>
        </div>
        <div class="grand-total-block">
          <div class="label">Total</div>
          <div class="val">₹${Math.round(netAmount).toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div class="footer-card">
        <div class="footer-contact">
          <h4>Contact Us</h4>
          <p>
            ${BUSINESS.address}<br>
            ${BUSINESS.website} | ${BUSINESS.phone}
          </p>
        </div>
        <div class="footer-thanks">Thank You!</div>
      </div>

      <div class="legal-footer">
        This is a computer-generated invoice and does not require a physical signature.
      </div>

      <div class="bottom-bar"></div>
    </div>
  `;

  wrapper.innerHTML = html;

  var element = wrapper.querySelector('.pdf-wrap');
  var safeFile = String(invoiceNo).replace(/[^A-Za-z0-9._-]/g, '_');
  var opt = {
    margin: 0,
    filename: safeFile + '.pdf',
    image: { type: 'jpeg', quality: 1 },
    html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
    jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save().then(function() {
    setTimeout(function() { document.body.removeChild(wrapper); }, 2000);
  });
}
