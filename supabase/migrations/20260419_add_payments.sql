-- ============================================================
-- Payments (Razorpay + simulation)
-- ============================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  txn_id text,
  razorpay_payment_id text,
  razorpay_order_id text,
  razorpay_signature text,
  method text check (method in ('card', 'upi', 'netbanking', 'wallet', 'emi', 'paylater')),
  amount numeric not null,
  currency text not null default 'INR',
  status text not null default 'captured' check (status in ('created', 'authorized', 'captured', 'failed', 'refunded')),
  provider text not null default 'razorpay' check (provider in ('razorpay', 'simulation')),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

create index if not exists payments_client_email_idx on public.payments (client_email);
create index if not exists payments_created_at_idx on public.payments (created_at desc);
create index if not exists payments_razorpay_payment_id_idx on public.payments (razorpay_payment_id);

alter table public.payments enable row level security;

-- Matches the permissive policies used by other tables in this project.
-- Tighten once auth.uid() is wired end-to-end.
create policy "Full access" on public.payments for all using (true) with check (true);
