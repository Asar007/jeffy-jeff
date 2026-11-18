// NRI Bridge India — Destruction timer lockout
// Reversible: set ENABLED to false, or remove the load from nav.js
(function () {
  var ENABLED = true;
  if (!ENABLED) return;

  var DEADLINE = new Date('2026-11-30T23:59:59+05:30').getTime();

  var style = document.createElement('style');
  style.textContent = [
    'html.nri-dt-lock, body.nri-dt-lock { overflow: hidden !important; height: 100% !important; }',
    '#nri-destruction-timer {',
    '  position: fixed; inset: 0; z-index: 2147483647;',
    '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
    '  gap: clamp(12px, 3vh, 28px);',
    '  padding: 24px;',
    '  box-sizing: border-box;',
    '  background:',
    '    radial-gradient(ellipse 80% 60% at 50% 40%, rgba(40, 0, 0, 0.55) 0%, transparent 70%),',
    '    radial-gradient(ellipse 100% 100% at 50% 100%, rgba(0, 0, 0, 0.9) 0%, transparent 55%),',
    '    linear-gradient(180deg, #0a0c08 0%, #050605 45%, #0b1008 100%);',
    '  color: #7cff6a;',
    '  font-family: "Courier New", Courier, monospace;',
    '  text-align: center;',
    '  cursor: none;',
    '  user-select: none;',
    '  -webkit-user-select: none;',
    '  touch-action: none;',
    '}',
    '#nri-destruction-timer::before {',
    '  content: ""; position: absolute; inset: 0; pointer-events: none;',
    '  background: repeating-linear-gradient(',
    '    0deg,',
    '    rgba(0, 0, 0, 0.15) 0px,',
    '    rgba(0, 0, 0, 0.15) 1px,',
    '    transparent 1px,',
    '    transparent 3px',
    '  );',
    '  opacity: 0.45;',
    '  mix-blend-mode: multiply;',
    '}',
    '#nri-destruction-timer::after {',
    '  content: ""; position: absolute; inset: 0; pointer-events: none;',
    '  box-shadow: inset 0 0 120px 40px rgba(0, 0, 0, 0.75);',
    '}',
    '#nri-destruction-timer .dt-heading {',
    '  position: relative; z-index: 1;',
    '  margin: 0;',
    '  font-size: clamp(1.1rem, 4vw, 2rem);',
    '  font-weight: 700;',
    '  letter-spacing: 0.35em; text-transform: uppercase;',
    '  color: #c44;',
    '  text-shadow: 0 0 12px rgba(255, 40, 40, 0.65);',
    '}',
    '#nri-destruction-timer .dt-clock {',
    '  position: relative; z-index: 1;',
    '  font-size: clamp(2.4rem, 14vw, 9rem);',
    '  font-weight: 700;',
    '  line-height: 1;',
    '  letter-spacing: 0.06em;',
    '  color: #8dff7a;',
    '  text-shadow:',
    '    0 0 12px rgba(100, 255, 80, 0.85),',
    '    0 0 40px rgba(60, 200, 40, 0.45),',
    '    0 0 80px rgba(40, 160, 20, 0.25);',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '#nri-destruction-timer .dt-goodbye {',
    '  position: relative; z-index: 1;',
    '  font-size: clamp(2.5rem, 12vw, 7rem);',
    '  font-weight: 700;',
    '  letter-spacing: 0.2em; text-transform: lowercase;',
    '  color: #c44;',
    '  text-shadow: 0 0 20px rgba(255, 40, 40, 0.6);',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.id = 'nri-destruction-timer';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Destruction countdown');
  root.innerHTML =
    '<h1 class="dt-heading">self destruct</h1>' +
    '<div class="dt-clock" id="nri-dt-clock">--:--:--:--</div>';

  function mount() {
    document.documentElement.classList.add('nri-dt-lock');
    document.body.classList.add('nri-dt-lock');
    document.body.appendChild(root);
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', mount);
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatRemaining(ms) {
    var totalSec = Math.floor(ms / 1000);
    var days = Math.floor(totalSec / 86400);
    var hours = Math.floor((totalSec % 86400) / 3600);
    var mins = Math.floor((totalSec % 3600) / 60);
    var secs = totalSec % 60;
    return pad(days) + ':' + pad(hours) + ':' + pad(mins) + ':' + pad(secs);
  }

  function showGoodbye() {
    root.innerHTML = '<div class="dt-goodbye">goodbye</div>';
  }

  function tick() {
    var ms = DEADLINE - Date.now();
    if (ms <= 0) {
      showGoodbye();
      return false;
    }
    var clock = document.getElementById('nri-dt-clock');
    if (clock) clock.textContent = formatRemaining(ms);
    return true;
  }

  function blockEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'contextmenu', 'wheel', 'scroll'].forEach(function (type) {
    root.addEventListener(type, blockEvent, true);
  });

  window.addEventListener(
    'keydown',
    function (e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    true
  );

  if (tick()) {
    var id = setInterval(function () {
      if (!tick()) clearInterval(id);
    }, 1000);
  }
})();
