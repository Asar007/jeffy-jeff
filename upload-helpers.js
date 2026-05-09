// upload-helpers.js
// Shared client-side file upload validation. Backend storage bucket cap is 5 MB;
// allowed types are per-page based on use case (PROFILES below).
(function() {
  'use strict';

  var MAX_BYTES = 5 * 1024 * 1024;

  var MIME = {
    PDF: 'application/pdf',
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    WEBP: 'image/webp',
    GIF: 'image/gif',
    DOC: 'application/msword',
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  var EXT_TO_MIME = {
    pdf: MIME.PDF,
    jpg: MIME.JPEG, jpeg: MIME.JPEG,
    png: MIME.PNG,
    webp: MIME.WEBP,
    gif: MIME.GIF,
    doc: MIME.DOC,
    docx: MIME.DOCX
  };

  // KYC / identity (PDF + standard images)
  var DOCS = [MIME.PDF, MIME.JPEG, MIME.PNG, MIME.WEBP];
  // Proof / status photos (images + PDF)
  var PHOTOS = [MIME.JPEG, MIME.PNG, MIME.WEBP, MIME.GIF, MIME.PDF];
  // Mixed user docs (incl. Office)
  var OFFICE_DOCS = [MIME.PDF, MIME.JPEG, MIME.PNG, MIME.WEBP, MIME.DOC, MIME.DOCX];

  var PROFILES = { DOCS: DOCS, PHOTOS: PHOTOS, OFFICE_DOCS: OFFICE_DOCS };

  function formatBytes(bytes) {
    if (bytes == null) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function fileExt(name) {
    var i = (name || '').lastIndexOf('.');
    return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
  }

  // file.type can be empty on some browsers — fall back to extension lookup.
  function detectMime(file) {
    if (file && file.type) return file.type;
    return EXT_TO_MIME[fileExt(file && file.name)] || '';
  }

  function profileLabels(allowed) {
    var seen = {};
    return allowed.map(function(m) {
      var s = m.split('/').pop();
      if (s.indexOf('wordprocessingml') !== -1) return 'DOCX';
      if (s === 'msword') return 'DOC';
      if (s === 'jpeg') return 'JPG';
      return s.toUpperCase();
    }).filter(function(l) {
      if (seen[l]) return false;
      seen[l] = true; return true;
    }).join(', ');
  }

  function validateFile(file, opts) {
    opts = opts || {};
    var allowed = opts.allowed || OFFICE_DOCS;
    var maxBytes = opts.maxBytes || MAX_BYTES;

    if (!file) return { ok: false, error: 'No file selected' };
    if (file.size > maxBytes) {
      return {
        ok: false,
        error: '"' + file.name + '" is ' + formatBytes(file.size) + ' (max ' + formatBytes(maxBytes) + ')'
      };
    }
    var mime = detectMime(file);
    if (!mime || allowed.indexOf(mime) === -1) {
      return {
        ok: false,
        error: '"' + file.name + '" is not a supported type. Allowed: ' + profileLabels(allowed)
      };
    }
    return { ok: true };
  }

  function validateFiles(fileList, opts) {
    opts = opts || {};
    var arr = Array.prototype.slice.call(fileList || []);
    var errors = [];
    var valid = [];

    if (opts.maxCount && arr.length > opts.maxCount) {
      errors.push('Too many files: ' + arr.length + ' (max ' + opts.maxCount + ')');
    }
    arr.forEach(function(f) {
      var r = validateFile(f, opts);
      if (r.ok) valid.push(f);
      else errors.push(r.error);
    });
    return { ok: errors.length === 0, errors: errors, valid: valid };
  }

  window.UploadHelpers = {
    MAX_BYTES: MAX_BYTES,
    MIME: MIME,
    PROFILES: PROFILES,
    formatBytes: formatBytes,
    detectMime: detectMime,
    validateFile: validateFile,
    validateFiles: validateFiles
  };
})();
