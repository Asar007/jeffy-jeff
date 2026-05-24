-- ============================================================
-- Billing Automation Migration
-- ============================================================

-- 1. Billing Subscriptions Tracking
create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  plan_name text not null,
  amount numeric not null,
  currency text not null default 'INR',
  billing_cycle text check (billing_cycle in ('monthly', 'annual')) default 'monthly',
  next_due_at timestamptz not null,
  last_reminder_sent_at timestamptz,
  status text check (status in ('active', 'past_due', 'cancelled')) default 'active',
  created_at timestamptz default now()
);

-- Index for cron performance
create index if not exists billing_subscriptions_next_due_idx on public.billing_subscriptions (next_due_at) where status = 'active';

-- 2. Notification Queue (to be processed by Edge Function or Webhook)
create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  recipient_email text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  error_msg text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

-- 3. Trigger for Real-time Payment Notifications
create or replace function public.fn_on_payment_insert()
returns trigger language plpgsql as $$
declare
  v_client_name text;
begin
  -- Get client name for personalization (if available)
  select name into v_client_name from public.clients where email = new.client_email limit 1;

  if new.status = 'captured' then
    insert into public.notification_queue (event_name, recipient_email, payload)
    values (
      'billing.payment_succeeded',
      new.client_email,
      jsonb_build_object(
        'FIRST_NAME', coalesce(v_client_name, 'Valued Client'),
        'AMOUNT', new.amount,
        'DATE', to_char(new.created_at, 'DD Mon YYYY'),
        'PLAN_NAME', 'NRI Bridge Services', -- Can be refined if items JSON contains plan
        'TXN_ID', new.txn_id,
        'INVOICE_URL', 'https://nribridgeindia.com/dashboard.html?tab=payments'
      )
    );
  elsif new.status = 'failed' then
    insert into public.notification_queue (event_name, recipient_email, payload)
    values (
      'billing.payment_failed',
      new.client_email,
      jsonb_build_object(
        'FIRST_NAME', coalesce(v_client_name, 'Valued Client'),
        'AMOUNT', new.amount,
        'DATE', to_char(new.created_at, 'DD Mon YYYY'),
        'PLAN_NAME', 'NRI Bridge Services',
        'BILLING_URL', 'https://nribridgeindia.com/dashboard.html?tab=payments'
      )
    );
  end if;
  return new;
end;
$$;

create trigger tr_payment_notifications
after insert on public.payments
for each row execute function public.fn_on_payment_insert();

-- 4. Daily Cron for Upcoming Billing Reminders
create or replace function public.fn_check_billing_reminders()
returns void language plpgsql as $$
declare
  v_sub record;
  v_client record;
begin
  -- Find active subscriptions due in exactly 7 days
  -- We only fire the event ONCE at the 7-day mark.
  -- Resend's Automation then handles the 3-day and 1-day reminders automatically via delays.
  for v_sub in
    select * from public.billing_subscriptions
    where status = 'active'
      and next_due_at::date = (current_date + interval '7 days')::date
      and (last_reminder_sent_at is null or last_reminder_sent_at < current_date - interval '1 day')
  loop
    select * into v_client from public.clients where id = v_sub.client_id;
    
    if found then
      insert into public.notification_queue (event_name, recipient_email, payload)
      values (
        'billing.upcoming',
        v_client.email,
        jsonb_build_object(
          'FIRST_NAME', v_client.name,
          'PLAN_NAME', v_sub.plan_name,
          'AMOUNT', v_sub.amount,
          'DUE_DATE', to_char(v_sub.next_due_at, 'DD Mon YYYY'),
          'BILLING_URL', 'https://nribridgeindia.com/dashboard.html?tab=payments'
        )
      );

      update public.billing_subscriptions
      set last_reminder_sent_at = now()
      where id = v_sub.id;
    end if;
  end loop;
end;
$$;

-- 5. Register pg_cron Job (runs daily at 01:00 UTC)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'check-billing-reminders',
      '0 1 * * *',
      'select public.fn_check_billing_reminders();'
    );
  end if;
end;
$$;

-- 6. RLS and Permissions
alter table public.billing_subscriptions enable row level security;
alter table public.notification_queue enable row level security;

create policy "Full access" on public.billing_subscriptions for all using (true) with check (true);
create policy "Full access" on public.notification_queue for all using (true) with check (true);
