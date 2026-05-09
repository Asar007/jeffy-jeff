-- ============================================================
-- Invoice numbering — sequential, fiscal-year aware (Apr–Mar)
-- Format: INV-YYYY-YY-NNNN  e.g. INV-2026-27-0001
-- ============================================================

-- Counter table: one row per fiscal year, atomic increment via UPSERT.
create table if not exists public.invoice_counters (
  fiscal_year text primary key,
  counter int not null default 0,
  updated_at timestamptz not null default now()
);

-- Internal table — block direct client access. Function below is SECURITY DEFINER.
alter table public.invoice_counters enable row level security;
-- (No policies = default deny for non-superusers and non-owners.)

-- Generates the next invoice number for the current fiscal year (Indian FY: Apr 1 – Mar 31).
-- SECURITY DEFINER so callers without privileges on invoice_counters can still allocate one.
create or replace function public.next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  fy text;
  c int;
  yr int := extract(year from now())::int;
  mo int := extract(month from now())::int;
begin
  if mo >= 4 then
    fy := yr::text || '-' || lpad(((yr + 1) % 100)::text, 2, '0');
  else
    fy := (yr - 1)::text || '-' || lpad((yr % 100)::text, 2, '0');
  end if;

  insert into public.invoice_counters (fiscal_year, counter)
  values (fy, 1)
  on conflict (fiscal_year)
    do update set counter = invoice_counters.counter + 1, updated_at = now()
  returning counter into c;

  return 'INV-' || fy || '-' || lpad(c::text, 4, '0');
end;
$$;

revoke all on function public.next_invoice_number() from public;
grant execute on function public.next_invoice_number() to authenticated, service_role;

-- Add invoice_number column to payments.
alter table public.payments
  add column if not exists invoice_number text;

-- Unique constraint (after backfill, see below)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payments_invoice_number_unique'
  ) then
    alter table public.payments
      add constraint payments_invoice_number_unique unique (invoice_number);
  end if;
end$$;

-- Backfill existing rows in deterministic created_at order so older invoices get lower numbers.
do $$
declare
  r record;
begin
  for r in select id from public.payments where invoice_number is null order by created_at asc, id asc loop
    update public.payments set invoice_number = public.next_invoice_number() where id = r.id;
  end loop;
end$$;

-- Trigger: assign invoice_number on insert if caller did not supply one.
create or replace function public.payments_set_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_number is null then
    new.invoice_number := public.next_invoice_number();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payments_set_invoice_number on public.payments;
create trigger trg_payments_set_invoice_number
  before insert on public.payments
  for each row
  execute function public.payments_set_invoice_number();
