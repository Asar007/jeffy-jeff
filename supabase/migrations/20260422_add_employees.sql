-- ============================================================
-- Employees — field team that executes service delivery.
-- Applicants self-onboard through employee-signup.html,
-- admin verifies KYC (id + address doc) and approves.
-- ============================================================

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  phone text not null,
  city text,
  pin_code text,
  skills text[] not null default '{}',
  id_doc_path text,
  address_doc_path text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason text,
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz default now()
);

create index if not exists employees_status_idx on public.employees(status);

alter table public.employees enable row level security;

-- Idempotent policy re-creation
drop policy if exists "Authenticated full access" on public.employees;
create policy "Authenticated full access" on public.employees
  for all using (auth.role() = 'authenticated');

-- Pending applicants must be able to insert their own row during signup
-- (auth.uid() is set after signUp but before admin approval).
drop policy if exists "Anon signup insert" on public.employees;
create policy "Anon signup insert" on public.employees
  for insert to anon
  with check (status = 'pending');
