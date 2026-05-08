-- ============================================================
-- Authorization Rebuild
-- ============================================================
-- Replaces every `using (true) with check (true)` policy with
-- per-role scoped policies driven by:
--   * Admin    : auth.jwt() -> app_metadata.role = 'admin'
--   * Employee : employees row matching auth.uid() with status='approved'
--   * Client   : clients row matching auth.uid()
--   * Anon     : explicit allow-list (signup forms only)
--
-- Notes from the Supabase security checklist:
--   * SECURITY DEFINER helpers live in `private` schema (not exposed
--     via PostgREST).
--   * UPDATE policies always pair with SELECT policies (RLS UPDATE
--     silently no-ops if the row isn't visible to SELECT).
--   * Storage policies on the `documents` bucket are scoped by path.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Private schema for SECURITY DEFINER helpers.
--    `private` is NOT exposed via the Data API, so functions
--    here can't be called from the browser even if granted.
-- ------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
-- USAGE is needed so authenticated/anon can resolve `private.is_admin()`
-- when a policy references it. The schema is NOT added to the Data API
-- exposure list (config.toml `db.schemas`), so PostgREST won't expose
-- anything inside `private` to the browser.
grant usage on schema private to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 2. Identity columns (FK to auth.users)
--    Email stays for display; user_id is the security key.
-- ------------------------------------------------------------
alter table public.clients
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.employees
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists clients_user_id_idx on public.clients(user_id);
create index if not exists employees_user_id_idx on public.employees(user_id);

-- Backfill user_id by matching email (case-insensitive).
update public.clients c
   set user_id = u.id
  from auth.users u
 where c.user_id is null
   and lower(c.email) = lower(u.email);

update public.employees e
   set user_id = u.id
  from auth.users u
 where e.user_id is null
   and lower(e.email) = lower(u.email);

-- ------------------------------------------------------------
-- 3. Helpers (SECURITY DEFINER, in private schema).
--    Stable so RLS planner can cache results within a query.
-- ------------------------------------------------------------

-- True iff caller's JWT has app_metadata.role = 'admin'.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- True iff caller has an approved employee row.
create or replace function private.is_employee_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.employees
     where user_id = auth.uid()
       and status  = 'approved'
  );
$$;

-- Caller's clients.id (if any). NULL if caller is not a client.
create or replace function private.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.clients where user_id = auth.uid() limit 1;
$$;

-- Caller's email lower-cased (employees use email-as-FK on tasks).
create or replace function private.current_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce(auth.email(), ''));
$$;

revoke all on function private.is_admin()             from public;
revoke all on function private.is_employee_approved() from public;
revoke all on function private.current_client_id()    from public;
revoke all on function private.current_email()        from public;
grant execute on function private.is_admin()             to authenticated, anon, service_role;
grant execute on function private.is_employee_approved() to authenticated, service_role;
grant execute on function private.current_client_id()    to authenticated, service_role;
grant execute on function private.current_email()        to authenticated, anon, service_role;

-- ------------------------------------------------------------
-- 3b. Table-level grants
--     Postgres RLS only filters AFTER the basic table privilege
--     check. Without these grants, `select from public.X` errors
--     out before the RLS policy is even evaluated.
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;
-- Anon: deliberately limited. Allow only the public-form tables.
grant insert on public.requests, public.appointments, public.employees to anon;
-- Default for tables added later by future migrations.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

-- ------------------------------------------------------------
-- 4. Drop ALL old "Full access" / "Authenticated full access"
--    policies so the new scoped ones replace them cleanly.
-- ------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and policyname in ('Full access', 'Authenticated full access')
  loop
    execute format('drop policy if exists %I on %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 5. Per-table policies
-- ------------------------------------------------------------

-- clients ----------------------------------------------------
alter table public.clients enable row level security;

create policy "clients_admin_all" on public.clients
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "clients_self_select" on public.clients
  for select to authenticated
  using (user_id = auth.uid());

create policy "clients_self_update" on public.clients
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Self-signup: a freshly authenticated user can create their own
-- clients row (auth listener does this in supabase-client.js).
create policy "clients_self_insert" on public.clients
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and lower(email) = private.current_email()
  );

-- Approved employees see clients whose tasks they own.
create policy "clients_employee_assigned_select" on public.clients
  for select to authenticated
  using (
    private.is_employee_approved()
    and exists (
      select 1 from public.tasks t
       where t.client_id = clients.id
         and lower(t.assigned_employee_email) = private.current_email()
    )
  );

-- tasks ------------------------------------------------------
alter table public.tasks enable row level security;

create policy "tasks_admin_all" on public.tasks
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "tasks_client_select" on public.tasks
  for select to authenticated
  using (client_id = private.current_client_id());

create policy "tasks_employee_select" on public.tasks
  for select to authenticated
  using (
    private.is_employee_approved()
    and lower(assigned_employee_email) = private.current_email()
  );

create policy "tasks_employee_update" on public.tasks
  for update to authenticated
  using (
    private.is_employee_approved()
    and lower(assigned_employee_email) = private.current_email()
  )
  with check (
    private.is_employee_approved()
    and lower(assigned_employee_email) = private.current_email()
  );

-- requests (custom one-off requests) -------------------------
alter table public.requests enable row level security;

create policy "requests_admin_all" on public.requests
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "requests_client_select" on public.requests
  for select to authenticated
  using (lower(coalesce(customer_email, '')) = private.current_email());

create policy "requests_client_update" on public.requests
  for update to authenticated
  using (lower(coalesce(customer_email, '')) = private.current_email())
  with check (lower(coalesce(customer_email, '')) = private.current_email());

-- Anonymous quote requests from the marketing site.
create policy "requests_anon_insert" on public.requests
  for insert to anon
  with check (status = 'New');

create policy "requests_self_insert" on public.requests
  for insert to authenticated
  with check (
    status = 'New'
    and lower(coalesce(customer_email, '')) = private.current_email()
  );

-- documents (table — files metadata) --------------------------
alter table public.documents enable row level security;

create policy "documents_admin_all" on public.documents
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "documents_client_rw" on public.documents
  for all to authenticated
  using (lower(client_email) = private.current_email())
  with check (lower(client_email) = private.current_email());

-- appointments (contact form) --------------------------------
alter table public.appointments enable row level security;

create policy "appointments_admin_all" on public.appointments
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "appointments_anon_insert" on public.appointments
  for insert to anon
  with check (true);

create policy "appointments_auth_insert" on public.appointments
  for insert to authenticated
  with check (true);

-- disputes ---------------------------------------------------
alter table public.disputes enable row level security;

create policy "disputes_admin_all" on public.disputes
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "disputes_client_rw" on public.disputes
  for all to authenticated
  using (lower(client_email) = private.current_email())
  with check (lower(client_email) = private.current_email());

-- Assigned employee can see disputes about their work.
create policy "disputes_employee_select" on public.disputes
  for select to authenticated
  using (
    private.is_employee_approved()
    and lower(coalesce(employee_email, '')) = private.current_email()
  );

-- payments ---------------------------------------------------
alter table public.payments enable row level security;

create policy "payments_admin_all" on public.payments
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "payments_client_select" on public.payments
  for select to authenticated
  using (lower(client_email) = private.current_email());

-- task_updates -----------------------------------------------
alter table public.task_updates enable row level security;

create policy "task_updates_admin_all" on public.task_updates
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "task_updates_client_select" on public.task_updates
  for select to authenticated
  using (
    task_id in (
      select t.id from public.tasks t
       where t.client_id = private.current_client_id()
    )
  );

-- Client can ack/raise concern on their own task updates.
create policy "task_updates_client_update_ack" on public.task_updates
  for update to authenticated
  using (
    task_id in (
      select t.id from public.tasks t
       where t.client_id = private.current_client_id()
    )
  )
  with check (
    task_id in (
      select t.id from public.tasks t
       where t.client_id = private.current_client_id()
    )
  );

create policy "task_updates_employee_rw" on public.task_updates
  for all to authenticated
  using (
    private.is_employee_approved()
    and task_id in (
      select t.id from public.tasks t
       where lower(t.assigned_employee_email) = private.current_email()
    )
  )
  with check (
    private.is_employee_approved()
    and task_id in (
      select t.id from public.tasks t
       where lower(t.assigned_employee_email) = private.current_email()
    )
  );

-- employees --------------------------------------------------
alter table public.employees enable row level security;

create policy "employees_admin_all" on public.employees
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- Self-signup. Newly-authenticated user creates their own row,
-- always pending.
create policy "employees_self_signup" on public.employees
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and lower(email) = private.current_email()
    and status = 'pending'
  );

-- Backwards-compat: anonymous applicant flow (signup before
-- email confirmation). Constrains status + leaves user_id null.
create policy "employees_anon_signup" on public.employees
  for insert to anon
  with check (status = 'pending' and user_id is null);

-- Read own row.
create policy "employees_self_select" on public.employees
  for select to authenticated
  using (user_id = auth.uid());

-- Update own row, BUT cannot self-promote: status must remain
-- whatever the row already had, and approval fields can't be
-- self-assigned. We enforce this via a trigger below since RLS
-- can't reference OLD.
create policy "employees_self_update" on public.employees
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function private.fn_employees_block_self_promote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Backend / no user context (auth.uid() null) bypasses: cron jobs,
  -- service_role connections, direct DB access by ops staff.
  if auth.uid() is null then
    return NEW;
  end if;
  -- Admins bypass.
  if (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' then
    return NEW;
  end if;
  -- Non-admin updaters cannot change auth-sensitive fields.
  if NEW.status         is distinct from OLD.status         then
    raise exception 'employee status changes require admin';
  end if;
  if NEW.approved_at    is distinct from OLD.approved_at    then
    raise exception 'employee approved_at is admin-only';
  end if;
  if NEW.approved_by    is distinct from OLD.approved_by    then
    raise exception 'employee approved_by is admin-only';
  end if;
  if NEW.user_id        is distinct from OLD.user_id        then
    raise exception 'employee user_id is immutable';
  end if;
  if NEW.email          is distinct from OLD.email          then
    raise exception 'employee email is immutable';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_employees_block_self_promote on public.employees;
create trigger trg_employees_block_self_promote
  before update on public.employees
  for each row
  execute function private.fn_employees_block_self_promote();

-- service_pipelines ------------------------------------------
alter table public.service_pipelines enable row level security;

create policy "service_pipelines_admin_all" on public.service_pipelines
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- Authenticated users (clients, employees) read pipelines so
-- the dashboards can render step names and descriptions.
create policy "service_pipelines_auth_select" on public.service_pipelines
  for select to authenticated
  using (true);

-- task_steps -------------------------------------------------
alter table public.task_steps enable row level security;

create policy "task_steps_admin_all" on public.task_steps
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "task_steps_client_select" on public.task_steps
  for select to authenticated
  using (
    task_id in (
      select t.id from public.tasks t
       where t.client_id = private.current_client_id()
    )
  );

create policy "task_steps_employee_rw" on public.task_steps
  for all to authenticated
  using (
    private.is_employee_approved()
    and lower(coalesce(assigned_employee_email, '')) = private.current_email()
  )
  with check (
    private.is_employee_approved()
    and lower(coalesce(assigned_employee_email, '')) = private.current_email()
  );

-- step_proofs ------------------------------------------------
alter table public.step_proofs enable row level security;

create policy "step_proofs_admin_all" on public.step_proofs
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- Assigned employee submits and reads their own proofs.
create policy "step_proofs_employee_rw" on public.step_proofs
  for all to authenticated
  using (
    private.is_employee_approved()
    and task_step_id in (
      select ts.id from public.task_steps ts
       where lower(coalesce(ts.assigned_employee_email, '')) = private.current_email()
    )
  )
  with check (
    private.is_employee_approved()
    and task_step_id in (
      select ts.id from public.task_steps ts
       where lower(coalesce(ts.assigned_employee_email, '')) = private.current_email()
    )
  );

-- Client reads + responds (accept/dispute) to proofs on their tasks.
create policy "step_proofs_client_select" on public.step_proofs
  for select to authenticated
  using (
    task_step_id in (
      select ts.id from public.task_steps ts
       join public.tasks t on t.id = ts.task_id
       where t.client_id = private.current_client_id()
    )
  );

create policy "step_proofs_client_respond" on public.step_proofs
  for update to authenticated
  using (
    task_step_id in (
      select ts.id from public.task_steps ts
       join public.tasks t on t.id = ts.task_id
       where t.client_id = private.current_client_id()
    )
  )
  with check (
    task_step_id in (
      select ts.id from public.task_steps ts
       join public.tasks t on t.id = ts.task_id
       where t.client_id = private.current_client_id()
    )
  );

-- employee_metrics -------------------------------------------
alter table public.employee_metrics enable row level security;

create policy "employee_metrics_admin_all" on public.employee_metrics
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "employee_metrics_self_select" on public.employee_metrics
  for select to authenticated
  using (lower(employee_email) = private.current_email());

-- recurring_schedules ----------------------------------------
alter table public.recurring_schedules enable row level security;

create policy "recurring_schedules_admin_all" on public.recurring_schedules
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "recurring_schedules_client_rw" on public.recurring_schedules
  for all to authenticated
  using (client_id = private.current_client_id())
  with check (client_id = private.current_client_id());

-- recurring_schedule_log -------------------------------------
alter table public.recurring_schedule_log enable row level security;

create policy "recurring_schedule_log_admin_all" on public.recurring_schedule_log
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "recurring_schedule_log_client_select" on public.recurring_schedule_log
  for select to authenticated
  using (
    schedule_id in (
      select s.id from public.recurring_schedules s
       where s.client_id = private.current_client_id()
    )
  );

-- ------------------------------------------------------------
-- 6. Trigger functions: SECURITY DEFINER so signup-time inserts
--    can fan out into tasks/task_steps without the inserting
--    user holding INSERT on those tables.
-- ------------------------------------------------------------
alter function public.fn_create_tasks_from_client() security definer set search_path = '';
alter function public.fn_create_task_steps(uuid, text) security definer set search_path = '';
alter function public.fn_auto_assign_task(uuid) security definer set search_path = '';
alter function public.fn_on_proof_submitted() security definer set search_path = '';
alter function public.fn_on_client_response() security definer set search_path = '';
alter function public.fn_sync_task_progress(uuid) security definer set search_path = '';
alter function public.fn_recalculate_employee_metrics(text) security definer set search_path = '';

-- These trigger functions don't need to be callable from the API.
revoke execute on function public.fn_create_tasks_from_client()        from public, anon, authenticated;
revoke execute on function public.fn_on_proof_submitted()              from public, anon, authenticated;
revoke execute on function public.fn_on_client_response()              from public, anon, authenticated;
-- These are explicitly called as RPCs by triggers/recurring fire flow
-- so keep them callable. (Restricted by who can reach them via RLS
-- on the source tables.)
-- fn_create_task_steps, fn_auto_assign_task, fn_sync_task_progress,
-- fn_recalculate_employee_metrics: leave defaults.

-- ------------------------------------------------------------
-- 7. Recurring fire RPC: gate caller before doing privileged work.
--    Worker stays SECURITY INVOKER but is wrapped by a manual RPC
--    that checks (admin OR owner-of-schedule) before delegating.
-- ------------------------------------------------------------
create or replace function public.fn_fire_recurring_schedule_manual(
  p_schedule_id uuid,
  p_trigger_type text default 'admin_manual'
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_client_id uuid;
  v_caller_client_id uuid;
begin
  if p_trigger_type not in ('admin_manual', 'client_manual') then
    p_trigger_type := 'admin_manual';
  end if;

  -- Admin: can fire any schedule.
  if private.is_admin() then
    return public.fn_fire_recurring_schedule(p_schedule_id, p_trigger_type);
  end if;

  -- Client: can only fire schedules they own.
  select client_id into v_owner_client_id
    from public.recurring_schedules
   where id = p_schedule_id;
  v_caller_client_id := private.current_client_id();

  if v_owner_client_id is null or v_caller_client_id is null
     or v_owner_client_id <> v_caller_client_id then
    raise exception 'not authorised to fire this schedule';
  end if;

  return public.fn_fire_recurring_schedule(p_schedule_id, 'client_manual');
end;
$$;

revoke execute on function public.fn_fire_recurring_schedule_manual(uuid, text) from public, anon;
grant  execute on function public.fn_fire_recurring_schedule_manual(uuid, text) to authenticated, service_role;

-- The raw worker is no longer callable from the Data API directly;
-- only via the gated wrapper above.
revoke execute on function public.fn_fire_recurring_schedule(uuid, text) from public, anon, authenticated;
grant  execute on function public.fn_fire_recurring_schedule(uuid, text) to service_role;

-- ------------------------------------------------------------
-- 8. Storage policies on the documents bucket.
--    Replace the permissive read/insert with path-scoped rules.
-- ------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select policyname
      from pg_policies
     where schemaname = 'storage'
       and tablename  = 'objects'
       and policyname in (
         'Documents bucket read',
         'Documents bucket insert'
       )
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- Admin: full control.
do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                 and policyname='documents_admin_all') then
    create policy "documents_admin_all"
      on storage.objects for all to authenticated
      using  (bucket_id = 'documents' and private.is_admin())
      with check (bucket_id = 'documents' and private.is_admin());
  end if;
end $$;

-- Client paths: <client-email>/...
do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                 and policyname='documents_client_own_select') then
    create policy "documents_client_own_select"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'documents'
        and split_part(name, '/', 1) = private.current_email()
      );
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                 and policyname='documents_client_own_insert') then
    create policy "documents_client_own_insert"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'documents'
        and split_part(name, '/', 1) = private.current_email()
      );
  end if;
end $$;

-- Employee KYC paths: employees/<email>/...
do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                 and policyname='documents_employee_kyc_select') then
    create policy "documents_employee_kyc_select"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'documents'
        and name like 'employees/%'
        and split_part(name, '/', 2) = private.current_email()
      );
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                 and policyname='documents_employee_kyc_insert') then
    create policy "documents_employee_kyc_insert"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'documents'
        and name like 'employees/%'
        and split_part(name, '/', 2) = private.current_email()
      );
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                 and policyname='documents_employee_kyc_anon_insert') then
    -- Anon signup: a brand-new applicant uploads BEFORE their auth
    -- session is established. Allow only the employees/ namespace.
    create policy "documents_employee_kyc_anon_insert"
      on storage.objects for insert to anon
      with check (
        bucket_id = 'documents'
        and name like 'employees/%'
      );
  end if;
end $$;

-- Dispute attachments: disputes/<client-email>/...
do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                 and policyname='documents_dispute_own_rw') then
    create policy "documents_dispute_own_rw"
      on storage.objects for all to authenticated
      using (
        bucket_id = 'documents'
        and name like 'disputes/%'
        and split_part(name, '/', 2) = private.current_email()
      )
      with check (
        bucket_id = 'documents'
        and name like 'disputes/%'
        and split_part(name, '/', 2) = private.current_email()
      );
  end if;
end $$;

-- Task-update photos: task-updates/<task-id>/...
-- Readable by admin, the assigned employee, or the owning client.
-- Writable by admin or the assigned employee.
do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                 and policyname='documents_task_updates_select') then
    create policy "documents_task_updates_select"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'documents'
        and name like 'task-updates/%'
        and (
          private.is_admin()
          or exists (
            select 1 from public.tasks t
             where t.id::text = split_part(name, '/', 2)
               and (
                 t.client_id = private.current_client_id()
                 or (
                   private.is_employee_approved()
                   and lower(coalesce(t.assigned_employee_email, '')) = private.current_email()
                 )
               )
          )
        )
      );
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                 and policyname='documents_task_updates_insert') then
    create policy "documents_task_updates_insert"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'documents'
        and name like 'task-updates/%'
        and (
          private.is_admin()
          or (
            private.is_employee_approved()
            and exists (
              select 1 from public.tasks t
               where t.id::text = split_part(name, '/', 2)
                 and lower(coalesce(t.assigned_employee_email, '')) = private.current_email()
            )
          )
        )
      );
  end if;
end $$;
