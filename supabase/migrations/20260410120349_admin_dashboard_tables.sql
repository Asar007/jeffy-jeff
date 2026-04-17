-- ============================================================
-- Admin Dashboard Tables for NRI Bridge India
-- ============================================================

-- 1. Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  city text,
  country text,
  services text[] default '{}',
  status text not null default 'Pending' check (status in ('Active', 'Pending', 'In Review', 'Done')),
  created_at timestamptz default now()
);

-- 2. Tasks (work items per client)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  service text not null,
  status text not null default 'Pending' check (status in ('Pending', 'In Progress', 'In Review', 'Completed')),
  progress int default 0 check (progress >= 0 and progress <= 100),
  deadline date,
  description text,
  created_at timestamptz default now()
);

-- 3. Custom one-time requests
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  amount int default 0,
  description text,
  status text not null default 'New' check (status in ('New', 'In Review', 'Accepted', 'Declined', 'Quoted')),
  received_at date default current_date,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security — allow authenticated users full access
-- (admin-only access enforced at app level via email whitelist)
-- ============================================================

alter table public.clients enable row level security;
alter table public.tasks enable row level security;
alter table public.requests enable row level security;

-- Policies: authenticated users can do everything
create policy "Authenticated full access" on public.clients
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on public.tasks
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on public.requests
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- Seed data — realistic demo clients, tasks, and requests
-- ============================================================

insert into public.clients (name, email, city, country, services, status) values
  ('Rajan Mehta',   'rajan@example.com',   'Dubai',     'UAE', '{Property,Legal}',    'Active'),
  ('Priya Nair',    'priya@example.com',   'London',    'UK',  '{Tax Filing}',        'Pending'),
  ('Suresh Kumar',  'suresh@example.com',  'Toronto',   'CA',  '{Banking}',           'In Review'),
  ('Anita Sharma',  'anita@example.com',   'New York',  'US',  '{Property}',          'Done'),
  ('Vikram Iyer',   'vikram@example.com',  'Singapore', 'SG',  '{Aadhaar/OCI}',       'Pending'),
  ('Deepa Reddy',   'deepa@example.com',   'Melbourne', 'AU',  '{Property,Banking}',  'Active'),
  ('Karthik Rao',   'karthik@example.com', 'San Jose',  'US',  '{Tax Filing,Legal}',  'Active');

insert into public.tasks (client_id, service, status, progress, deadline, description)
select c.id, 'Property Legal', 'In Progress', 60, '2026-04-10'::date, 'Property verification and PoA drafting'
from public.clients c where c.name = 'Rajan Mehta'
union all
select c.id, 'Tax Filing', 'Pending', 10, '2026-04-05'::date, 'ITR-2 filing for FY 2025-26'
from public.clients c where c.name = 'Priya Nair'
union all
select c.id, 'Bank Account', 'In Review', 75, '2026-04-14'::date, 'NRO account opening with SBI'
from public.clients c where c.name = 'Suresh Kumar'
union all
select c.id, 'Property Reg.', 'Completed', 100, '2026-04-01'::date, 'Sub-registrar registration completed'
from public.clients c where c.name = 'Anita Sharma'
union all
select c.id, 'Aadhaar Update', 'Pending', 5, '2026-04-04'::date, 'Address update on Aadhaar via appointment'
from public.clients c where c.name = 'Vikram Iyer'
union all
select c.id, 'Property Legal', 'Pending', 0, '2026-04-18'::date, 'Lease renewal for Whitefield apartment'
from public.clients c where c.name = 'Deepa Reddy'
union all
select c.id, 'Tax Filing', 'In Progress', 45, '2026-04-12'::date, 'DTAA benefit computation with TRC'
from public.clients c where c.name = 'Karthik Rao'
union all
select c.id, 'Property Legal', 'Pending', 15, '2026-04-20'::date, 'Society NOC and mutation entry'
from public.clients c where c.name = 'Deepa Reddy'
union all
select c.id, 'Legal', 'In Review', 50, '2026-04-15'::date, 'Will drafting and succession planning'
from public.clients c where c.name = 'Karthik Rao';

insert into public.requests (client_name, amount, description, status, received_at) values
  ('Deepak Pillai', 8500,  'Urgent property verification in Chennai — single visit required within 1 week', 'New', '2026-04-01'),
  ('Kavitha Rao',   5000,  'Fetch and courier Encumbrance Certificate from Coimbatore sub-registrar office', 'New', '2026-03-31'),
  ('Arun Balaji',   12000, 'Power of Attorney drafting + notarisation for property sale in Madurai', 'Quoted', '2026-03-28'),
  ('Meera Iyer',    3500,  'Police clearance certificate application at local station', 'New', '2026-04-03'),
  ('Sanjay Gupta',  15000, 'Complete property tax reassessment for Pune municipal corporation', 'In Review', '2026-03-25');
