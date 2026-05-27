-- Security audit follow-up migration.
--
-- Two pieces:
-- 1. Replace the over-permissive "Full access" RLS policies on
--    billing_subscriptions and notification_queue (VULN-007, VULN-008)
--    with policies that gate on private.is_admin() / current_client_id().
-- 2. Add a rate-limit table for the send-password-reset Edge Function so the
--    public anon-key endpoint can't be abused for email flooding (VULN-005).

-- ───────────────────────────────────────────────────────────────
-- 1. Tighten RLS on billing_subscriptions + notification_queue
-- ───────────────────────────────────────────────────────────────

-- billing_subscriptions: admins manage everything; clients read their own only.
drop policy if exists "Full access" on public.billing_subscriptions;
drop policy if exists "Admins have full access" on public.billing_subscriptions;
drop policy if exists "Clients can view own subscriptions" on public.billing_subscriptions;

create policy "Admins have full access"
  on public.billing_subscriptions
  for all
  using (private.is_admin())
  with check (private.is_admin());

create policy "Clients can view own subscriptions"
  on public.billing_subscriptions
  for select
  using (client_id = private.current_client_id());

-- notification_queue: system-internal queue, admins only via PostgREST.
-- Edge Functions write to this via the service_role key which bypasses RLS,
-- so no policy is needed for those workers.
drop policy if exists "Full access" on public.notification_queue;
drop policy if exists "Admins have full access" on public.notification_queue;

create policy "Admins have full access"
  on public.notification_queue
  for all
  using (private.is_admin())
  with check (private.is_admin());

-- ───────────────────────────────────────────────────────────────
-- 2. Rate-limit table for password reset requests
-- ───────────────────────────────────────────────────────────────

create table if not exists private.password_reset_rate_limit (
  email             text primary key,
  last_requested_at timestamptz not null default now(),
  request_count     int         not null default 1
);

-- Only the service_role (used by Edge Functions) should touch this.
revoke all on table private.password_reset_rate_limit from public, authenticated, anon;
grant  all on table private.password_reset_rate_limit to service_role;

-- RPC function the Edge Function calls via supabase.rpc(). Lives in `public`
-- because PostgREST only exposes the public schema, but is SECURITY DEFINER
-- so it can operate on the private rate-limit table. Grants are revoked from
-- anon/authenticated so only service_role can actually invoke it.
--
-- Throttle rules:
--   * at most 1 request per 60 seconds per email
--   * at most 5 requests per hour per email
create or replace function public.check_password_reset_rate_limit(p_email text)
returns boolean
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_row private.password_reset_rate_limit%rowtype;
  v_now timestamptz := now();
begin
  select * into v_row from private.password_reset_rate_limit where email = p_email;

  if v_row.email is null then
    insert into private.password_reset_rate_limit (email, last_requested_at, request_count)
    values (p_email, v_now, 1);
    return true;
  end if;

  -- Reset the hourly counter if the window elapsed.
  if v_row.last_requested_at < v_now - interval '1 hour' then
    update private.password_reset_rate_limit
       set last_requested_at = v_now, request_count = 1
     where email = p_email;
    return true;
  end if;

  -- Per-minute throttle.
  if v_row.last_requested_at > v_now - interval '60 seconds' then
    return false;
  end if;

  -- Per-hour throttle.
  if v_row.request_count >= 5 then
    return false;
  end if;

  update private.password_reset_rate_limit
     set last_requested_at = v_now, request_count = request_count + 1
   where email = p_email;
  return true;
end;
$$;

revoke all on function public.check_password_reset_rate_limit(text) from public, authenticated, anon;
grant execute on function public.check_password_reset_rate_limit(text) to service_role;
