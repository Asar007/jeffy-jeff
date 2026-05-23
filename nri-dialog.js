/* ══════════════════════════════════════════
   NRI Dialog — themed confirm / alert / prompt
   Drop-in replacement for window.confirm/alert.

   Usage:
     await nriAlert('Saved.')
     await nriAlert({ title: 'Error', message: 'Could not save', variant: 'danger' })
     if (await nriConfirm('Delete this client?')) { ... }
     if (await nriConfirm({ title: 'Delete client?', message: '…', variant: 'danger', confirmLabel: 'Delete' })) { ... }
     const reason = await nriPrompt({ title: 'Reason for rejection', placeholder: '…' })
   ══════════════════════════════════════════ */
(function () {
  if (window.nriConfirm && window.nriAlert) return;

  var ICONS = {
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    question: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };

  function normalize(opts, defaults) {
    if (opts == null) opts = {};
    if (typeof opts === 'string') opts = { message: opts };
    return Object.assign({}, defaults, opts);
  }

  function buildDialog(opts, kind) {
    var variant = opts.variant || (kind === 'confirm' ? 'info' : 'info');
    var iconKey = opts.icon || (variant === 'info' && kind === 'confirm' ? 'question' : variant);
    var overlay = document.createElement('div');
    overlay.className = 'nri-dialog-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    var classes = ['nri-dialog'];
    if (variant && variant !== 'info') classes.push(variant);

    var title = opts.title || (kind === 'confirm' ? 'Please confirm' : kind === 'prompt' ? 'Enter a value' : 'Notice');
    var message = opts.message != null ? String(opts.message) : '';
    var confirmLabel = opts.confirmLabel || (kind === 'confirm' ? 'Confirm' : 'OK');
    var cancelLabel = opts.cancelLabel || 'Cancel';
    var showCancel = (kind !== 'alert');

    var inputHTML = '';
    if (kind === 'prompt') {
      var tag = opts.multiline ? 'textarea' : 'input';
      var typeAttr = opts.multiline ? '' : ' type="text"';
      var rowsAttr = opts.multiline ? ' rows="3"' : '';
      var placeholder = opts.placeholder ? ' placeholder="' + escapeAttr(opts.placeholder) + '"' : '';
      var preset = opts.value != null ? escapeHtml(opts.value) : '';
      inputHTML = '<' + tag + ' class="nri-dialog-input"' + typeAttr + rowsAttr + placeholder + '>' + preset + (opts.multiline ? '</textarea>' : '');
      if (!opts.multiline) inputHTML = '<input class="nri-dialog-input" type="text"' + placeholder + ' value="' + escapeAttr(preset) + '">';
    }

    overlay.innerHTML =
      '<div class="' + classes.join(' ') + '">' +
        '<div class="nri-dialog-head">' +
          '<div class="nri-dialog-icon">' + (ICONS[iconKey] || ICONS.info) + '</div>' +
          '<h3 class="nri-dialog-title">' + escapeHtml(title) + '</h3>' +
        '</div>' +
        (message ? '<div class="nri-dialog-body">' + (opts.html ? message : escapeHtml(message).replace(/\n/g, '<br>')) + '</div>' : '') +
        inputHTML +
        '<div class="nri-dialog-actions">' +
          (showCancel ? '<button type="button" class="nri-dialog-btn nri-dialog-btn-cancel">' + escapeHtml(cancelLabel) + '</button>' : '') +
          '<button type="button" class="nri-dialog-btn nri-dialog-btn-confirm">' + escapeHtml(confirmLabel) + '</button>' +
        '</div>' +
      '</div>';

    return overlay;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function show(overlay) {
    document.body.appendChild(overlay);
    // Force reflow before adding .show so transitions run
    void overlay.offsetWidth;
    overlay.classList.add('show');
  }

  function teardown(overlay) {
    overlay.classList.remove('show');
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 250);
  }

  function open(kind, options) {
    var opts = normalize(options);
    return new Promise(function (resolve) {
      var overlay = buildDialog(opts, kind);
      var confirmBtn = overlay.querySelector('.nri-dialog-btn-confirm');
      var cancelBtn = overlay.querySelector('.nri-dialog-btn-cancel');
      var input = overlay.querySelector('.nri-dialog-input');

      function done(result) {
        document.removeEventListener('keydown', onKey, true);
        teardown(overlay);
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); done(kind === 'prompt' ? null : (kind === 'alert' ? true : false)); }
        else if (e.key === 'Enter' && (!input || (input.tagName !== 'TEXTAREA'))) {
          if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
          e.preventDefault();
          confirmBtn.click();
        }
      }

      confirmBtn.addEventListener('click', function () {
        if (kind === 'prompt') done(input ? input.value : '');
        else if (kind === 'alert') done(true);
        else done(true);
      });
      if (cancelBtn) cancelBtn.addEventListener('click', function () { done(kind === 'prompt' ? null : false); });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay && opts.dismissable !== false) {
          done(kind === 'prompt' ? null : (kind === 'alert' ? true : false));
        }
      });
      document.addEventListener('keydown', onKey, true);

      show(overlay);
      setTimeout(function () {
        if (input) input.focus();
        else confirmBtn.focus();
      }, 50);
    });
  }

  window.nriConfirm = function (opts) { return open('confirm', opts); };
  window.nriAlert = function (opts) { return open('alert', opts); };
  window.nriPrompt = function (opts) { return open('prompt', opts); };
})();
