-- ============================================================
-- Dispute Center
-- ============================================================

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  client_name text not null,
  service_key text not null,
  service_label text not null,
  service_item_label text,
  category text not null,
  title text not null,
  description text not null,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  status text not null default 'New' check (status in ('New', 'In Review', 'Waiting for Customer', 'Resolved', 'Rejected')),
  admin_notes text,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  resolved_at timestamptz
);

alter table public.disputes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'disputes' and policyname = 'Full access'
  ) then
    create policy "Full access" on public.disputes for all using (true) with check (true);
  end if;
end $$;
