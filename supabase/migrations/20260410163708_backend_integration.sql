-- ============================================================
-- Backend Integration: new tables + quotation columns
-- ============================================================

-- 1. Documents table
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  service_type text,
  doc_name text not null,
  file_name text,
  storage_path text,
  status text not null default 'uploaded' check (status in ('uploaded', 'verified', 'rejected')),
  uploaded_at timestamptz default now()
);

-- 2. Appointments table (contact form submissions)
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  message text,
  status text not null default 'New' check (status in ('New', 'Contacted', 'Done')),
  created_at timestamptz default now()
);

-- 3. Add quotation columns to requests
alter table public.requests add column if not exists quoted_amount int default 0;
alter table public.requests add column if not exists quote_items jsonb default '[]'::jsonb;
alter table public.requests add column if not exists quoted_at timestamptz;
alter table public.requests add column if not exists customer_email text;
alter table public.requests add column if not exists customer_response text check (customer_response in ('accepted', 'declined', null));
alter table public.requests add column if not exists responded_at timestamptz;

-- 4. RLS for new tables
alter table public.documents enable row level security;
alter table public.appointments enable row level security;

-- Allow both anon and authenticated full access
-- (admin access gated by email whitelist in app code)
create policy "Full access" on public.documents for all using (true) with check (true);
create policy "Full access" on public.appointments for all using (true) with check (true);

-- Fix existing tables: allow anon access too (for localStorage-only logins)
drop policy if exists "Authenticated full access" on public.clients;
drop policy if exists "Authenticated full access" on public.tasks;
drop policy if exists "Authenticated full access" on public.requests;

create policy "Full access" on public.clients for all using (true) with check (true);
create policy "Full access" on public.tasks for all using (true) with check (true);
create policy "Full access" on public.requests for all using (true) with check (true);

-- 5. Create Storage bucket for documents (if not exists)
-- NOTE: Storage buckets must be created via Supabase Dashboard or API,
-- not via SQL. Create a private bucket named "documents" in the dashboard.
