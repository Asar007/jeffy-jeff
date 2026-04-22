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
      '<a href="login.html" class="btn-outline">Log in</a>' +
      '<a href="signup.html" class="btn-primary">Get Started</a>' +
    '</div>';

  // Find the <nav> element and inject
  var navEl = document.querySelector('nav');
  if (navEl) {
    navEl.innerHTML = navHTML;
  }

  // ── Helper: hide "Get Started" CTAs on the page when logged in ─────────────
  function hideGetStartedButtons() {
    var btns = document.querySelectorAll('.hide-when-logged-in');
    for (var i = 0; i < btns.length; i++) {
      btns[i].style.display = 'none';
    }
  }

  // ── Helper: show "Get Started" CTAs when logged out ───────────────────────
  function showGetStartedButtons() {
    var btns = document.querySelectorAll('.hide-when-logged-in');
    for (var i = 0; i < btns.length; i++) {
      btns[i].style.display = '';
    }
  }

  var ADMIN_EMAILS = ['iqbalahmedkm@gmail.com', 'arfan@nribridgeindia.com', 'admin@nribridgeindia.com', 'admin@gmail.com', 'asif.mohamed1616@gmail.com', 'jeffrinmac@gmail.com'];

  // ── Helper: render the logged-in nav state ────────────────────────────────
  function renderLoggedIn(name, email, role) {
    hideGetStartedButtons();
    var navActions = document.getElementById('navActions');
    if (!navActions) return;

    var firstName = name.split(' ')[0];
    var initials = name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
    var isAdmin = email && ADMIN_EMAILS.indexOf(email.toLowerCase()) !== -1;
    var isEmployee = role && role.indexOf('employee-') === 0;

    var adminLink = isAdmin
      ? '<a href="admin.html"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Admin Portal</a>'
      : '';

    var menuItems;
    if (isEmployee) {
      menuItems =
        '<a href="employee.html"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> My Work</a>';
    } else {
      menuItems =
        '<a href="dashboard.html"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> Dashboard</a>' +
        '<a href="onboarding.html"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Manage Services</a>';
    }

    // Hide "Request Service" links for employees
    if (isEmployee) {
      document.querySelectorAll('.nav-links a[href="services.html"], .nav-links a[href^="home-management"], .nav-links a[href^="vehicle-management"], .nav-links a[href^="parental-care"], .nav-links a[href^="legal-documentation"]').forEach(function(el) {
        var li = el.closest('li');
        if (li && li.classList.contains('nav-dropdown')) li.style.display = 'none';
      });
    }

    // Replace Login/Get Started buttons with a clickable user pill + dropdown
    navActions.innerHTML =
      '<div class="nav-user-dropdown" id="navUserDropdown">' +
        '<button class="nav-user-pill" id="navUserPillBtn" type="button">' +
          '<div class="nav-user-avatar">' + initials + '</div>' +
          '<span class="nav-user-name">' + firstName + '</span>' +
          '<svg class="nav-user-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</button>' +
        '<div class="nav-user-menu" id="navUserMenu">' +
          menuItems +
          adminLink +
          '<div class="nav-user-menu-divider"></div>' +
          '<a href="#" class="nav-signout-link" id="navSignOut"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Sign Out</a>' +
        '</div>' +
      '</div>';

    // Toggle dropdown on click
    var pillBtn = document.getElementById('navUserPillBtn');
    var menu = document.getElementById('navUserMenu');
    var dropdown = document.getElementById('navUserDropdown');

    pillBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    // Close on outside click
    document.addEventListener('click', function() {
      dropdown.classList.remove('open');
    });

    // Sign out handler
    document.getElementById('navSignOut').addEventListener('click', function(e) {
      e.preventDefault();
      if (window.supabaseClient) {
        window.supabaseClient.auth.signOut();
      }
      localStorage.removeItem('nri_session');
      window.location.href = 'login.html';
    });
  }

  // ── 1. Immediate render from localStorage (avoids flash on normal page loads) ──
  var session = JSON.parse(localStorage.getItem('nri_session') || 'null');
  if (session && session.name) {
    var cachedRole = sessionStorage.getItem('nri_role') || '';
    renderLoggedIn(session.name, session.email || '', cachedRole);
  }

  // ── 2. Subscribe to Supabase auth state (handles Google OAuth redirect) ────
  // supabase-client.js is loaded AFTER nav.js, so we wait for it to be ready.
  function renderWithRole(user) {
    var meta = user.user_metadata || {};
    var name = meta.full_name || user.email || 'User';
    var rolePromise = typeof window.getUserRole === 'function' ? window.getUserRole() : Promise.resolve(sessionStorage.getItem('nri_role') || '');
    rolePromise.then(function(role) {
      renderLoggedIn(name, user.email || '', role || '');
    });
  }

  function subscribeToAuth() {
    if (window.supabaseClient && window.supabaseClient.auth) {
      window.supabaseClient.auth.getSession().then(function(result) {
        var s = result.data && result.data.session;
        if (s && s.user) renderWithRole(s.user);
      });

      window.supabaseClient.auth.onAuthStateChange(function(event, s) {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && s && s.user) {
          renderWithRole(s.user);
        } else if (event === 'SIGNED_OUT') {
          showGetStartedButtons();
          var navActions = document.getElementById('navActions');
          if (navActions) {
            navActions.innerHTML =
              '<a href="login.html" class="btn-outline">Log in</a>' +
              '<a href="signup.html" class="btn-primary">Get Started</a>';
          }
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
