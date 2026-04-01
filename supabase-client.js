// c:\Users\Arfan\jeffy\jeffy-jeff\supabase-client.js
// IMPORTANT: Replace the empty strings below with your actual Supabase project URL and anon key.
// You can find these in your Supabase Dashboard under Settings > API.

const SUPABASE_URL = "https://rrplwtzskrutjvdskfmz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycGx3dHpza3J1dGp2ZHNrZm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Mzk1NjksImV4cCI6MjA5MDUxNTU2OX0.CFK0J0cilUO15dfj7ZH1odvVODsIdecNP_8HZ0GoJbA";

if (!SUPABASE_URL || SUPABASE_URL === "YOUR_SUPABASE_URL") {
    console.warn("Supabase URL and Anon Key are missing. Please add them to supabase-client.js");
}

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
