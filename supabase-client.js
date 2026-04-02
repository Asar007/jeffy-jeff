// c:\Users\Arfan\jeffy\jeffy-jeff\supabase-client.js

const SUPABASE_URL = "https://rrplwtzskrutjvdskfmz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycGx3dHpza3J1dGp2ZHNrZm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Mzk1NjksImV4cCI6MjA5MDUxNTU2OX0.CFK0J0cilUO15dfj7ZH1odvVODsIdecNP_8HZ0GoJbA";

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sync Supabase Auth state with existing UI logic
window.supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
    if (session && session.user) {
      const meta = session.user.user_metadata || {};
      const name = meta.full_name || session.user.email;

      localStorage.setItem('nri_session', JSON.stringify({ name: name, email: session.user.email }));

      // Redirect to complete-profile if phone/country missing
      const currentPath = window.location.pathname;
      if ((!meta.phone || !meta.country) && currentPath !== '/complete-profile') {
        window.location.href = '/complete-profile' + window.location.search;
        return;
      }

      // Update navigation UI immediately
      var navActions = document.getElementById('navActions');
      if (navActions) {
        navActions.innerHTML =
          '<span style="color:var(--text-light);font-size:0.85rem;opacity:0.8;margin-right:12px;">Hi, ' + name.split(' ')[0] + '</span>' +
          '<a href="/account" class="btn-outline" style="border-color: rgba(255,255,255,0.4); color: white;">My Account</a>';
      }

      // Clean up OAuth hash from URL
      if (window.location.hash.includes('access_token=')) {
        window.history.replaceState(null, null, window.location.pathname + window.location.search);
      }
    }
  } else if (event === 'SIGNED_OUT') {
    localStorage.removeItem('nri_session');
  }
});
