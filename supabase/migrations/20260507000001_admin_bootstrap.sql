-- ============================================================
-- Admin Bootstrap
-- ============================================================
-- Promotes the project's known admin emails to
-- raw_app_meta_data.role = 'admin' so private.is_admin() works
-- after the authorization rebuild.
--
-- Subsequent admin grants/revokes go through fn_grant_admin /
-- fn_revoke_admin RPCs (callable only by an existing admin).
-- ============================================================

-- One-time backfill: promote known admin emails. Idempotent.
do $$
declare
  admin_email text;
  admin_emails text[] := array[
    'iqbalahmedkm@gmail.com',
    'arfan@nribridgeindia.com',
    'admin@nribridgeindia.com',
    'admin@gmail.com',
    'asif.mohamed1616@gmail.com',
    'jeffrinmac@gmail.com'
  ];
begin
  foreach admin_email in array admin_emails
  loop
    update auth.users
       set raw_app_meta_data =
             jsonb_set(
               coalesce(raw_app_meta_data, '{}'::jsonb),
               '{role}',
               '"admin"'::jsonb,
               true
             )
     where lower(email) = lower(admin_email)
       and coalesce(raw_app_meta_data ->> 'role', '') <> 'admin';
  end loop;
end $$;

-- ------------------------------------------------------------
-- fn_grant_admin / fn_revoke_admin — admin-only RPCs.
-- SECURITY DEFINER so they can write to auth.users (which
-- belongs to the supabase_auth_admin role). Caller must already
-- be an admin; we re-check inside.
-- ------------------------------------------------------------
create or replace function public.fn_grant_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'fn_grant_admin: caller is not admin';
  end if;

  update auth.users
     set raw_app_meta_data =
           jsonb_set(
             coalesce(raw_app_meta_data, '{}'::jsonb),
             '{role}',
             '"admin"'::jsonb,
             true
           )
   where lower(email) = lower(p_email);
end;
$$;

create or replace function public.fn_revoke_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'fn_revoke_admin: caller is not admin';
  end if;
  if lower(p_email) = lower(coalesce(auth.email(), '')) then
    raise exception 'cannot revoke your own admin role';
  end if;

  update auth.users
     set raw_app_meta_data = (raw_app_meta_data - 'role')
   where lower(email) = lower(p_email);
end;
$$;

revoke execute on function public.fn_grant_admin(text)  from public, anon;
revoke execute on function public.fn_revoke_admin(text) from public, anon;
grant  execute on function public.fn_grant_admin(text)  to authenticated, service_role;
grant  execute on function public.fn_revoke_admin(text) to authenticated, service_role;
