// NRI Bridge India — Shared Navigation
// Injected into all pages via <script src="nav.js"></script>
(function() {
  // Determine current page for active state
  var currentPage = window.location.pathname.split('/').pop() || 'propnri-saas-site.html';
  var isServicesPage = ['home-management.html','vehicle-management.html','parental-care.html','legal-documentation.html','services.html'].indexOf(currentPage) !== -1;
  var isServiceDetail = currentPage.indexOf('service-') === 0;

  function activeClass(page) {
    if (page === currentPage) return ' class="active"';
    if (page === 'propnri-saas-site.html' && currentPage === page) return ' class="active"';
    return '';
  }

  var navHTML = '' +
    '<div class="nav-logo"><a href="propnri-saas-site.html"><img src="NRI-BRIDGE-INDIA_LOGO-WHITE-PNG.png" alt="NRI Bridge India" style="height:80px;width:auto;display:block;"></a></div>' +
    '<ul class="nav-links">' +
      '<li><a href="propnri-saas-site.html"' + activeClass('propnri-saas-site.html') + '>Home</a></li>' +
      '<li class="nav-dropdown">' +
        '<a href="services.html"' + (isServicesPage || isServiceDetail ? ' class="active"' : '') + '>Services <span class="nav-arrow">&#9662;</span></a>' +
        '<div class="nav-dropdown-menu">' +
          '<a href="home-management.html"><span class="dd-icon dd-icon-home"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>Home Management</a>' +
          '<a href="vehicle-management.html"><span class="dd-icon dd-icon-vehicle"><svg viewBox="0 0 24 24"><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-6l2-5h9l4 5h3v6h-2"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>Vehicle Management</a>' +
          '<a href="parental-care.html"><span class="dd-icon dd-icon-parental"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>Parental Care</a>' +
          '<a href="legal-documentation.html"><span class="dd-icon dd-icon-legal"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>Legal & Documentation</a>' +
        '</div>' +
      '</li>' +
      '<li><a href="propnri-saas-site.html#pricing">Pricing</a></li>' +
      '<li><a href="propnri-saas-site.html#how">How It Works</a></li>' +
      '<li><a href="contact.html">Contact</a></li>' +
    '</ul>' +
    '<div class="nav-actions" id="navActions">' +
      '<a href="login.html" class="btn-outline">Sign In</a>' +
      '<a href="signup.html" class="btn-primary">Get Started</a>' +
    '</div>';

  // Find the <nav> element and inject
  var navEl = document.querySelector('nav');
  if (navEl) {
    navEl.innerHTML = navHTML;
  }

  // ── Helper: render the logged-in nav state ────────────────────────────────
  function renderLoggedIn(name) {
    var navActions = document.getElementById('navActions');
    if (navActions) {
      navActions.innerHTML =
        '<span style="color:var(--text-light);font-size:0.85rem;opacity:0.8;margin-right:12px;">Hi, ' + name.split(' ')[0] + '</span>' +
        '<a href="account.html" class="btn-outline" style="border-color: rgba(255,255,255,0.4); color: white;">My Account</a>';
    }
    // Hide signup CTAs on landing page if logged in
    var heroBtn = document.getElementById('hero-signup-btn');
    var footerBtn = document.getElementById('footer-signup-btn');
    if (heroBtn) heroBtn.style.display = 'none';
    if (footerBtn) footerBtn.style.display = 'none';
  }

  // ── 1. Immediate render from localStorage (avoids flash on normal page loads) ──
  var session = JSON.parse(localStorage.getItem('nri_session') || 'null');
  if (session && session.name) {
    renderLoggedIn(session.name);
  }

  // ── 2. Subscribe to Supabase auth state (handles Google OAuth redirect) ────
  // supabase-client.js is loaded AFTER nav.js, so we wait for it to be ready.
  function subscribeToAuth() {
    if (window.supabaseClient && window.supabaseClient.auth) {
      window.supabaseClient.auth.getSession().then(function(result) {
        var s = result.data && result.data.session;
        if (s && s.user) {
          var meta = s.user.user_metadata || {};
          var name = meta.full_name || s.user.email || 'User';
          renderLoggedIn(name);
        }
      });

      window.supabaseClient.auth.onAuthStateChange(function(event, s) {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && s && s.user) {
          var meta = s.user.user_metadata || {};
          var name = meta.full_name || s.user.email || 'User';
          renderLoggedIn(name);
        } else if (event === 'SIGNED_OUT') {
          var navActions = document.getElementById('navActions');
          if (navActions) {
            navActions.innerHTML =
              '<a href="login.html" class="btn-outline">Sign In</a>' +
              '<a href="signup.html" class="btn-primary">Get Started</a>';
          }
          // Show signup CTAs on landing page if logged out
          var heroBtn = document.getElementById('hero-signup-btn');
          var footerBtn = document.getElementById('footer-signup-btn');
          if (heroBtn) heroBtn.style.display = 'inline-block';
          if (footerBtn) footerBtn.style.display = 'inline-block';
        }
      });
    } else {
      // Supabase hasn't loaded yet — retry in 50 ms
      setTimeout(subscribeToAuth, 50);
    }
  }

  // Start polling once the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', subscribeToAuth);
  } else {
    subscribeToAuth();
  }
})();
