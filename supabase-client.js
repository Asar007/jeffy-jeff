// c:\Users\Arfan\jeffy\jeffy-jeff\supabase-client.js
// IMPORTANT: Replace the empty strings below with your actual Supabase project URL and anon key.
// You can find these in your Supabase Dashboard under Settings > API.
//
// STORAGE SETUP (for document uploads on the dashboard):
// 1. Go to Supabase Dashboard > Storage > Create a new bucket named "documents"
// 2. Set the bucket to private (not public)
// 3. Add RLS policy: authenticated users can INSERT/SELECT files where path starts with their email prefix
//    e.g. (auth.email() = split_part(name, '/', 1))

const SUPABASE_URL = "https://rrplwtzskrutjvdskfmz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycGx3dHpza3J1dGp2ZHNrZm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Mzk1NjksImV4cCI6MjA5MDUxNTU2OX0.CFK0J0cilUO15dfj7ZH1odvVODsIdecNP_8HZ0GoJbA";

if (!SUPABASE_URL || SUPABASE_URL === "YOUR_SUPABASE_URL") {
    console.warn("Supabase URL and Anon Key are missing. Please add them to supabase-client.js");
}

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Role detection ───────────────────────────────────────────────────────────
// Returns one of: 'admin' | 'employee-approved' | 'employee-pending'
// | 'employee-rejected' | 'employee-suspended' | 'client'.
// Cached in sessionStorage under `nri_role` for the session lifetime.
var ADMIN_EMAILS = ['iqbalahmedkm@gmail.com','arfan@nribridgeindia.com','admin@nribridgeindia.com','admin@gmail.com','asif.mohamed1616@gmail.com','jeffrinmac@gmail.com'];

function detectRole(email) {
  email = (email || '').toLowerCase();
  if (!email) return Promise.resolve('client');
  if (ADMIN_EMAILS.indexOf(email) !== -1) return Promise.resolve('admin');
  return window.supabaseClient.from('employees').select('status').eq('email', email).maybeSingle().then(function(r) {
    if (r && r.data && r.data.status) return 'employee-' + r.data.status;
    return 'client';
  }).catch(function() { return 'client'; });
}

window.getUserRole = function() {
  var cached = sessionStorage.getItem('nri_role');
  if (cached) return Promise.resolve(cached);
  var session = JSON.parse(localStorage.getItem('nri_session') || 'null');
  var email = session && session.email;
  if (!email) return Promise.resolve('client');
  return detectRole(email).then(function(role) {
    sessionStorage.setItem('nri_role', role);
    return role;
  });
};

window.homePathForRole = function(role) {
  if (role === 'admin') return 'admin.html';
  if (role && role.indexOf('employee-') === 0) return 'employee.html';
  return 'dashboard.html';
};

// Sync Supabase Auth state with existing UI logic
var _clientInsertDone = {};
window.supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
    if (session && session.user) {
      const meta = session.user.user_metadata || {};
      const name = meta.full_name || session.user.email;
      var userEmail = session.user.email;
      var lowerEmail = (userEmail || '').toLowerCase();

      localStorage.setItem('nri_session', JSON.stringify({ name: name, email: userEmail }));

      // Cache role for this tab (admin check is synchronous; employee check is async)
      detectRole(userEmail).then(function(role) {
        sessionStorage.setItem('nri_role', role);
      });

      var isEmployee = meta.role === 'employee';

      // Dual-write: insert into clients table for admin dashboard (deduplicated).
      // Skip for admins and employee signups.
      if (!isEmployee && ADMIN_EMAILS.indexOf(lowerEmail) === -1 && !_clientInsertDone[userEmail]) {
        _clientInsertDone[userEmail] = true;
        window.supabaseClient.from('clients').select('id').eq('email', userEmail).then(function(res) {
          if (res.data && res.data.length > 0) return;
          window.supabaseClient.from('clients').insert([{
            name: name,
            email: userEmail,
            country: meta.country || '',
            city: '',
            services: [],
            status: 'Pending'
          }]).select().then(function(r) {
            if (r.error) console.error('Client insert failed:', r.error);
          });
        });
      }

      // Check if this is a login missing phone or country (e.g. from Google OAuth).
      // Employees have their own onboarding flow — skip the complete-profile redirect.
      const currentPath = window.location.pathname.split('/').pop() || '';
      if (!isEmployee && (!meta.phone || !meta.country) && currentPath !== 'complete-profile.html' && currentPath !== 'employee-signup.html' && currentPath !== 'employee.html') {
          window.location.href = 'complete-profile.html' + window.location.search;
          return;
      }

      // If we just came back from an OAuth redirect, cleanly remove the bulky URL hash
      if (window.location.hash.includes('access_token=')) {
        window.history.replaceState(null, null, window.location.pathname + window.location.search);
      }
    }
  } else if (event === 'SIGNED_OUT') {
    localStorage.removeItem('nri_session');
    sessionStorage.removeItem('nri_role');
  }
});
