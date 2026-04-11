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

// Sync Supabase Auth state with existing UI logic
window.supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
    if (session && session.user) {
      const meta = session.user.user_metadata || {};
      const name = meta.full_name || session.user.email;
      
      localStorage.setItem('nri_session', JSON.stringify({ name: name, email: session.user.email }));

      // Dual-write: upsert into clients table for admin dashboard
      window.supabaseClient.from('clients').select('id').eq('email', session.user.email).then(function(res) {
        if (!res.data || res.data.length === 0) {
          window.supabaseClient.from('clients').insert({
            name: name,
            email: session.user.email,
            country: meta.country || '',
            city: '',
            services: [],
            status: 'Pending'
          });
        }
      });
      
      // Check if this is a login missing phone or country (e.g. from Google OAuth)
      const currentPath = window.location.pathname.split('/').pop() || '';
      if ((!meta.phone || !meta.country) && currentPath !== 'complete-profile.html') {
          window.location.href = 'complete-profile.html' + window.location.search;
          return;
      }
      
      // Update the navigation UI immediately to fix the lag (no page refresh required)
      var navActions = document.getElementById('navActions');
      if (navActions) {
        navActions.innerHTML =
          '<span style="color:var(--text-light);font-size:0.85rem;opacity:0.8;margin-right:12px;">Hi, ' + name.split(' ')[0] + '</span>' +
          '<a href="account.html" class="btn-outline" style="border-color: rgba(255,255,255,0.4); color: white;">My Account</a>';
      }
      
      // If we just came back from an OAuth redirect, cleanly remove the bulky URL hash
      if (window.location.hash.includes('access_token=')) {
        window.history.replaceState(null, null, window.location.pathname + window.location.search);
      }
    }
  } else if (event === 'SIGNED_OUT') {
    localStorage.removeItem('nri_session');
  }
});
