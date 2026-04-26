-- ============================================================
-- Operations Redesign — Phase 1: Tables & Columns
-- ============================================================

-- 1. Service Pipelines (moved from JS SERVICE_PIPELINES to DB)
create table if not exists public.service_pipelines (
  id uuid primary key default gen_random_uuid(),
  pipeline_key text unique not null,
  display_name text not null,
  service_match_patterns text[] not null,
  steps jsonb not null,
  created_at timestamptz default now()
);

alter table public.service_pipelines enable row level security;
drop policy if exists "Full access" on public.service_pipelines;
create policy "Full access" on public.service_pipelines for all using (true) with check (true);

insert into public.service_pipelines (pipeline_key, display_name, service_match_patterns, steps) values
(
  'home',
  'Home Management',
  '{"home","property","tenant","rent","maintenance","inspection","lease","utility"}',
  '[
    {"name":"Onboarding & PoA","description":"Collecting property documents. Power of Attorney execution initiated.","required_skill":"Property"},
    {"name":"Property Inspection","description":"Physical inspection underway. Condition report & society NOC being obtained.","required_skill":"Inspection"},
    {"name":"Tenant Acquisition","description":"Property listed. Screening tenants — ID verification, background check.","required_skill":"Tenant"},
    {"name":"Lease & Registration","description":"Drafting rental agreement on stamp paper. Sub-Registrar registration scheduled.","required_skill":"Legal"},
    {"name":"Rent Collection","description":"First rent collected. TDS compliance handled. Monthly reports begun.","required_skill":"Property"}
  ]'::jsonb
),
(
  'vehicle',
  'Vehicle Management',
  '{"vehicle","servicing","selling","registration","parking","insurance","fitness"}',
  '[
    {"name":"Document Verification","description":"Collecting RC, previous insurance, PUC. Verifying ownership chain.","required_skill":"Vehicle"},
    {"name":"Insurance Assessment","description":"Gathering quotes from 3+ insurers. Comparing coverage options.","required_skill":"Vehicle"},
    {"name":"Owner Approval","description":"Insurance comparison sheet ready. Awaiting owner approval.","required_skill":"Vehicle"},
    {"name":"Policy Issuance","description":"KYC completed, payment processed. Digital policy issued.","required_skill":"Vehicle"},
    {"name":"Ongoing Monitoring","description":"Calendar reminders set for renewals. Periodic checks scheduled.","required_skill":"Vehicle"}
  ]'::jsonb
),
(
  'parental',
  'Parental Care',
  '{"parental","care","doctor","medicine","emergency","companion","wellbeing","health"}',
  '[
    {"name":"Health Profile Setup","description":"Building digital health vault — medical history, medications, insurance.","required_skill":"Care"},
    {"name":"Coordinator Assigned","description":"Dedicated local coordinator assigned. Emergency contacts verified.","required_skill":"Care"},
    {"name":"Initial Check-up","description":"Doctor visit scheduled. Vitals recorded, baseline health report created.","required_skill":"Care"},
    {"name":"Ongoing Care Active","description":"Regular check-ups scheduled. Medicine tracking active. 24/7 helpline live.","required_skill":"Care"}
  ]'::jsonb
),
(
  'legal',
  'Legal & Tax',
  '{"legal","tax","power of attorney","property registration","will","succession","court","government","document","filing","aadhaar","oci","banking","bank"}',
  '[
    {"name":"Document Collection","description":"Gathering PAN, Passport, bank statements, Form 16/26AS.","required_skill":"Legal"},
    {"name":"Review & Computation","description":"Verifying residential status. Selecting ITR form. Computing tax liability.","required_skill":"Tax"},
    {"name":"Filing & Submission","description":"E-filing on incometax.gov.in in progress. E-verification initiated.","required_skill":"Tax"},
    {"name":"Verification & Closure","description":"CPC processed return. ITR-V received. Refund processed if applicable.","required_skill":"Legal"}
  ]'::jsonb
)
on conflict (pipeline_key) do nothing;

-- 2. Task Steps — one row per pipeline step per task
create table if not exists public.task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  step_index int not null,
  step_name text not null,
  step_description text,
  required_skill text,
  status text not null default 'pending'
    check (status in (
      'pending','in_progress','proof_submitted',
      'client_accepted','client_disputed','resubmitted',
      'escalated','admin_resolved','completed'
    )),
  assigned_employee_email text,
  max_resubmit_rounds int not null default 2,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique(task_id, step_index)
);

create index if not exists task_steps_task_id_idx on public.task_steps(task_id);
create index if not exists task_steps_status_idx on public.task_steps(status);
create index if not exists task_steps_assignee_idx on public.task_steps(assigned_employee_email);

alter table public.task_steps enable row level security;
drop policy if exists "Full access" on public.task_steps;
create policy "Full access" on public.task_steps for all using (true) with check (true);

-- 3. Step Proofs — each round of proof submission + client response
create table if not exists public.step_proofs (
  id uuid primary key default gen_random_uuid(),
  task_step_id uuid not null references public.task_steps(id) on delete cascade,
  round int not null default 1,
  submitted_by text not null,
  note text not null,
  photos jsonb not null default '[]'::jsonb,
  submitted_at timestamptz default now(),
  client_response text check (client_response in ('accepted', 'disputed')),
  client_response_note text,
  client_responded_at timestamptz,
  unique(task_step_id, round)
);

create index if not exists step_proofs_step_id_idx on public.step_proofs(task_step_id);

alter table public.step_proofs enable row level security;
drop policy if exists "Full access" on public.step_proofs;
create policy "Full access" on public.step_proofs for all using (true) with check (true);

-- 4. Employee Metrics — pre-computed performance data
create table if not exists public.employee_metrics (
  employee_email text primary key,
  tasks_completed int not null default 0,
  steps_completed int not null default 0,
  avg_step_hours numeric not null default 0,
  first_accept_rate numeric not null default 0,
  dispute_rate numeric not null default 0,
  escalation_rate numeric not null default 0,
  resubmit_rate numeric not null default 0,
  performance_score numeric not null default 50,
  current_active_steps int not null default 0,
  flag text check (flag in ('underperforming', 'top_performer')),
  updated_at timestamptz default now()
);

alter table public.employee_metrics enable row level security;
drop policy if exists "Full access" on public.employee_metrics;
create policy "Full access" on public.employee_metrics for all using (true) with check (true);

-- 5. Alter tasks — add pipeline tracking + auto-assignment columns
alter table public.tasks
  add column if not exists pipeline_key text,
  add column if not exists total_steps int default 0,
  add column if not exists auto_assigned boolean default false,
  add column if not exists auto_assigned_at timestamptz,
  add column if not exists assignment_score jsonb;

-- 6. Alter disputes — link to task step lifecycle
alter table public.disputes
  add column if not exists task_id uuid references public.tasks(id),
  add column if not exists task_step_id uuid references public.task_steps(id),
  add column if not exists employee_email text,
  add column if not exists source text default 'client_manual';

-- Add check constraint for source if not exists
do $$
begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'disputes_source_check'
  ) then
    alter table public.disputes
      add constraint disputes_source_check
      check (source in ('step_escalation', 'client_manual'));
  end if;
end $$;

alter table public.disputes
  add column if not exists proof_snapshot jsonb;

-- ============================================================
-- Functions & Triggers
-- ============================================================

-- Helper: given a service name, find the matching pipeline_key
create or replace function public.fn_match_pipeline_key(p_service text)
returns text language plpgsql as $$
declare
  v_key text;
  v_service_lower text := lower(trim(p_service));
begin
  select pipeline_key into v_key
  from public.service_pipelines
  where v_service_lower = any(
    select lower(unnest(service_match_patterns))
  )
  limit 1;

  if v_key is null then
    select pipeline_key into v_key
    from public.service_pipelines
    where exists (
      select 1 from unnest(service_match_patterns) as pat
      where v_service_lower like '%' || lower(pat) || '%'
    )
    limit 1;
  end if;

  return v_key;
end;
$$;

-- Create task_steps rows from a pipeline definition for a given task
create or replace function public.fn_create_task_steps(p_task_id uuid, p_pipeline_key text)
returns void language plpgsql as $$
declare
  v_steps jsonb;
  v_step jsonb;
  v_index int := 0;
begin
  select steps into v_steps
  from public.service_pipelines
  where pipeline_key = p_pipeline_key;

  if v_steps is null then return; end if;

  for v_step in select * from jsonb_array_elements(v_steps)
  loop
    insert into public.task_steps (task_id, step_index, step_name, step_description, required_skill)
    values (
      p_task_id,
      v_index,
      v_step->>'name',
      v_step->>'description',
      v_step->>'required_skill'
    )
    on conflict (task_id, step_index) do nothing;
    v_index := v_index + 1;
  end loop;

  update public.tasks set total_steps = v_index where id = p_task_id;
end;
$$;

-- Auto-assign the best-fit employee to a task
create or replace function public.fn_auto_assign_task(p_task_id uuid)
returns void language plpgsql as $$
declare
  v_task record;
  v_client record;
  v_first_skill text;
  v_best_email text;
  v_best_score numeric := -1;
  v_score_json jsonb;
  v_emp record;
  v_skill_pts numeric;
  v_city_pts numeric;
  v_workload_pts numeric;
  v_perf_pts numeric;
  v_total numeric;
  v_max_active int := 10;
begin
  select * into v_task from public.tasks where id = p_task_id;
  if v_task is null then return; end if;

  select * into v_client from public.clients where id = v_task.client_id;

  -- Get the required skill from the first step
  select required_skill into v_first_skill
  from public.task_steps
  where task_id = p_task_id
  order by step_index asc
  limit 1;

  for v_emp in
    select e.email, e.name, e.city, e.skills,
           coalesce(m.performance_score, 50) as perf_score,
           coalesce(m.current_active_steps, 0) as active_steps
    from public.employees e
    left join public.employee_metrics m on m.employee_email = e.email
    where e.status = 'approved'
  loop
    -- Skill match: 0 or 40
    v_skill_pts := 0;
    if v_first_skill is not null and v_first_skill = any(v_emp.skills) then
      v_skill_pts := 40;
    elsif v_first_skill is null then
      v_skill_pts := 40;
    end if;

    -- City match: 0 or 20
    v_city_pts := 0;
    if v_client is not null and v_emp.city is not null and v_client.city is not null
       and lower(trim(v_emp.city)) = lower(trim(v_client.city)) then
      v_city_pts := 20;
    end if;

    -- Workload inverse: 0-25
    v_workload_pts := greatest(0, 25.0 * (1.0 - v_emp.active_steps::numeric / v_max_active));

    -- Performance: 0-15
    v_perf_pts := v_emp.perf_score / 100.0 * 15.0;

    v_total := v_skill_pts + v_city_pts + v_workload_pts + v_perf_pts;

    if v_total > v_best_score or (v_total = v_best_score and v_emp.active_steps < coalesce((
      select coalesce(m2.current_active_steps, 0)
      from public.employees e2
      left join public.employee_metrics m2 on m2.employee_email = e2.email
      where e2.email = v_best_email
    ), 999)) then
      v_best_score := v_total;
      v_best_email := v_emp.email;
      v_score_json := jsonb_build_object(
        'skill_match', v_skill_pts,
        'city_match', v_city_pts,
        'workload_score', round(v_workload_pts, 1),
        'performance_score', round(v_perf_pts, 1),
        'total', round(v_total, 1)
      );
    end if;
  end loop;

  if v_best_email is not null then
    update public.tasks
    set assigned_employee_email = v_best_email,
        auto_assigned = true,
        auto_assigned_at = now(),
        assignment_score = v_score_json
    where id = p_task_id;

    update public.task_steps
    set assigned_employee_email = v_best_email
    where task_id = p_task_id;

    -- Increment active steps count
    insert into public.employee_metrics (employee_email, current_active_steps, updated_at)
    values (v_best_email, 1, now())
    on conflict (employee_email) do update
    set current_active_steps = employee_metrics.current_active_steps + 1,
        updated_at = now();
  end if;
end;
$$;

-- Trigger: auto-create tasks + steps when a client is inserted with services
create or replace function public.fn_create_tasks_from_client()
returns trigger language plpgsql as $$
declare
  v_service text;
  v_pipeline_key text;
  v_task_id uuid;
begin
  if NEW.services is null or array_length(NEW.services, 1) is null then
    return NEW;
  end if;

  foreach v_service in array NEW.services
  loop
    v_pipeline_key := public.fn_match_pipeline_key(v_service);

    insert into public.tasks (client_id, service, status, progress, pipeline_key)
    values (NEW.id, v_service, 'Pending', 0, v_pipeline_key)
    returning id into v_task_id;

    if v_pipeline_key is not null then
      perform public.fn_create_task_steps(v_task_id, v_pipeline_key);
    end if;

    perform public.fn_auto_assign_task(v_task_id);
  end loop;

  return NEW;
end;
$$;

drop trigger if exists trg_create_tasks_from_client on public.clients;
create trigger trg_create_tasks_from_client
  after insert on public.clients
  for each row
  when (NEW.services is not null and array_length(NEW.services, 1) > 0)
  execute function public.fn_create_tasks_from_client();

-- Trigger: when employee submits proof, update step status
create or replace function public.fn_on_proof_submitted()
returns trigger language plpgsql as $$
begin
  if NEW.round = 1 then
    update public.task_steps
    set status = 'proof_submitted'
    where id = NEW.task_step_id and status = 'in_progress';
  else
    update public.task_steps
    set status = 'resubmitted'
    where id = NEW.task_step_id and status = 'client_disputed';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_on_proof_submitted on public.step_proofs;
create trigger trg_on_proof_submitted
  after insert on public.step_proofs
  for each row
  execute function public.fn_on_proof_submitted();

-- Sync task progress and current_step from task_steps
create or replace function public.fn_sync_task_progress(p_task_id uuid)
returns void language plpgsql as $$
declare
  v_total int;
  v_completed int;
  v_current_step int;
  v_has_active boolean;
begin
  select total_steps into v_total from public.tasks where id = p_task_id;
  if v_total is null or v_total = 0 then return; end if;

  select count(*) into v_completed
  from public.task_steps
  where task_id = p_task_id and status = 'completed';

  select min(step_index) into v_current_step
  from public.task_steps
  where task_id = p_task_id and status != 'completed';

  select exists(
    select 1 from public.task_steps
    where task_id = p_task_id and status not in ('pending', 'completed')
  ) into v_has_active;

  update public.tasks
  set progress = round(v_completed::numeric / v_total * 100),
      current_step = v_current_step
  where id = p_task_id;

  -- Auto-set task status
  if v_has_active then
    update public.tasks set status = 'In Progress'
    where id = p_task_id and status = 'Pending';
  end if;
end;
$$;

-- Recalculate all metrics for a single employee
create or replace function public.fn_recalculate_employee_metrics(p_email text)
returns void language plpgsql as $$
declare
  v_steps_completed int;
  v_tasks_completed int;
  v_avg_hours numeric;
  v_first_accept int;
  v_disputed_steps int;
  v_escalated_steps int;
  v_resubmit_steps int;
  v_first_accept_rate numeric;
  v_dispute_rate numeric;
  v_escalation_rate numeric;
  v_resubmit_rate numeric;
  v_active_steps int;
  v_score numeric;
  v_flag text;
  v_speed_pctile numeric;
  v_volume_pctile numeric;
  v_emp_avg numeric;
begin
  -- Steps completed
  select count(*) into v_steps_completed
  from public.task_steps
  where assigned_employee_email = p_email and completed_at is not null;

  if v_steps_completed = 0 then
    insert into public.employee_metrics (employee_email, updated_at)
    values (p_email, now())
    on conflict (employee_email) do update
    set steps_completed = 0, updated_at = now();
    return;
  end if;

  -- Tasks completed (all steps done for a task)
  select count(distinct ts.task_id) into v_tasks_completed
  from public.task_steps ts
  where ts.assigned_employee_email = p_email
    and not exists (
      select 1 from public.task_steps ts2
      where ts2.task_id = ts.task_id and ts2.status != 'completed'
    );

  -- Avg hours per step
  select coalesce(avg(extract(epoch from (completed_at - started_at)) / 3600), 0)
  into v_avg_hours
  from public.task_steps
  where assigned_employee_email = p_email
    and completed_at is not null and started_at is not null;

  -- First-accept: steps where round 1 proof was accepted
  select count(*) into v_first_accept
  from public.task_steps ts
  where ts.assigned_employee_email = p_email and ts.completed_at is not null
    and exists (
      select 1 from public.step_proofs sp
      where sp.task_step_id = ts.id and sp.round = 1 and sp.client_response = 'accepted'
    );

  -- Disputed steps
  select count(distinct ts.id) into v_disputed_steps
  from public.task_steps ts
  join public.step_proofs sp on sp.task_step_id = ts.id
  where ts.assigned_employee_email = p_email and sp.client_response = 'disputed';

  -- Escalated steps
  select count(*) into v_escalated_steps
  from public.task_steps
  where assigned_employee_email = p_email and status in ('escalated', 'admin_resolved');

  -- Resubmit steps (had round > 1)
  select count(distinct ts.id) into v_resubmit_steps
  from public.task_steps ts
  join public.step_proofs sp on sp.task_step_id = ts.id
  where ts.assigned_employee_email = p_email and sp.round > 1;

  -- Active steps
  select count(*) into v_active_steps
  from public.task_steps
  where assigned_employee_email = p_email
    and status not in ('completed', 'pending');

  -- Rates
  v_first_accept_rate := v_first_accept::numeric / v_steps_completed * 100;
  v_dispute_rate := v_disputed_steps::numeric / v_steps_completed * 100;
  v_escalation_rate := case when v_disputed_steps > 0
    then v_escalated_steps::numeric / v_disputed_steps * 100
    else 0 end;
  v_resubmit_rate := v_resubmit_steps::numeric / v_steps_completed * 100;

  -- Speed percentile (compared to all employees)
  v_emp_avg := v_avg_hours;
  select percentile_cont(0.5) within group (order by avg_step_hours)
  into v_speed_pctile
  from public.employee_metrics
  where steps_completed > 0;

  if v_speed_pctile is not null and v_speed_pctile > 0 then
    v_speed_pctile := greatest(0, least(100, (1 - v_emp_avg / (v_speed_pctile * 2)) * 100));
  else
    v_speed_pctile := 50;
  end if;

  -- Volume percentile
  select percentile_cont(0.5) within group (order by steps_completed)
  into v_volume_pctile
  from public.employee_metrics
  where steps_completed > 0;

  if v_volume_pctile is not null and v_volume_pctile > 0 then
    v_volume_pctile := least(100, v_steps_completed::numeric / (v_volume_pctile * 2) * 100);
  else
    v_volume_pctile := 50;
  end if;

  -- Performance score
  v_score := (v_first_accept_rate * 0.35)
           + (v_speed_pctile * 0.25)
           + ((100 - v_escalation_rate) * 0.25)
           + (v_volume_pctile * 0.15);
  v_score := greatest(0, least(100, v_score));

  -- Flag
  v_flag := null;
  if v_score < 30 or v_escalation_rate > 30 then v_flag := 'underperforming'; end if;
  if v_score > 80 and v_steps_completed >= 10 then v_flag := 'top_performer'; end if;

  -- Upsert
  insert into public.employee_metrics (
    employee_email, tasks_completed, steps_completed, avg_step_hours,
    first_accept_rate, dispute_rate, escalation_rate, resubmit_rate,
    performance_score, current_active_steps, flag, updated_at
  ) values (
    p_email, v_tasks_completed, v_steps_completed, round(v_avg_hours, 2),
    round(v_first_accept_rate, 1), round(v_dispute_rate, 1),
    round(v_escalation_rate, 1), round(v_resubmit_rate, 1),
    round(v_score, 1), v_active_steps, v_flag, now()
  )
  on conflict (employee_email) do update set
    tasks_completed = excluded.tasks_completed,
    steps_completed = excluded.steps_completed,
    avg_step_hours = excluded.avg_step_hours,
    first_accept_rate = excluded.first_accept_rate,
    dispute_rate = excluded.dispute_rate,
    escalation_rate = excluded.escalation_rate,
    resubmit_rate = excluded.resubmit_rate,
    performance_score = excluded.performance_score,
    current_active_steps = excluded.current_active_steps,
    flag = excluded.flag,
    updated_at = excluded.updated_at;
end;
$$;

-- Trigger: when client responds to a proof, advance or dispute the step
create or replace function public.fn_on_client_response()
returns trigger language plpgsql as $$
declare
  v_step record;
  v_next_step record;
  v_all_done boolean;
  v_task record;
  v_proof_snapshot jsonb;
begin
  if OLD.client_response is not null or NEW.client_response is null then
    return NEW;
  end if;

  select * into v_step from public.task_steps where id = NEW.task_step_id;
  if v_step is null then return NEW; end if;

  if NEW.client_response = 'accepted' then
    -- Mark step completed
    update public.task_steps
    set status = 'completed', completed_at = now()
    where id = NEW.task_step_id;

    -- Unlock next step
    select * into v_next_step from public.task_steps
    where task_id = v_step.task_id and step_index = v_step.step_index + 1;

    if v_next_step is not null then
      update public.task_steps set status = 'pending' where id = v_next_step.id and status = 'pending';
    end if;

    -- Check if all steps done
    select not exists(
      select 1 from public.task_steps
      where task_id = v_step.task_id and status != 'completed'
    ) into v_all_done;

    if v_all_done then
      update public.tasks
      set status = 'Completed', progress = 100, current_step = null
      where id = v_step.task_id;
    end if;

    -- Sync task progress
    perform public.fn_sync_task_progress(v_step.task_id);

    -- Recalculate employee metrics
    if v_step.assigned_employee_email is not null then
      perform public.fn_recalculate_employee_metrics(v_step.assigned_employee_email);
    end if;

  elsif NEW.client_response = 'disputed' then
    if NEW.round < v_step.max_resubmit_rounds then
      -- Tier 1: employee can resubmit
      update public.task_steps
      set status = 'client_disputed'
      where id = NEW.task_step_id;
    else
      -- Tier 2: escalate to admin
      update public.task_steps
      set status = 'escalated'
      where id = NEW.task_step_id;

      -- Snapshot all proofs for this step
      select jsonb_agg(jsonb_build_object(
        'round', sp.round,
        'note', sp.note,
        'photos', sp.photos,
        'submitted_at', sp.submitted_at,
        'client_response', sp.client_response,
        'client_response_note', sp.client_response_note
      ) order by sp.round)
      into v_proof_snapshot
      from public.step_proofs sp
      where sp.task_step_id = NEW.task_step_id;

      select * into v_task from public.tasks where id = v_step.task_id;

      -- Auto-create escalation dispute
      insert into public.disputes (
        client_email, client_name, service_key, service_label,
        category, title, description, priority, status,
        task_id, task_step_id, employee_email, source, proof_snapshot
      )
      select
        coalesce(c.email, ''),
        coalesce(c.name, ''),
        coalesce(v_task.pipeline_key, ''),
        coalesce(v_task.service, ''),
        'Proof Dispute',
        'Step "' || v_step.step_name || '" — client disputes after ' || NEW.round || ' rounds',
        coalesce(NEW.client_response_note, 'Client disputed proof after maximum resubmission rounds.'),
        'High',
        'New',
        v_step.task_id,
        NEW.task_step_id,
        v_step.assigned_employee_email,
        'step_escalation',
        v_proof_snapshot
      from public.clients c
      where c.id = v_task.client_id;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_on_client_response on public.step_proofs;
create trigger trg_on_client_response
  after update on public.step_proofs
  for each row
  when (OLD.client_response is distinct from NEW.client_response and NEW.client_response is not null)
  execute function public.fn_on_client_response();

-- Called by admin UI to resolve an escalated dispute
create or replace function public.fn_resolve_escalation(
  p_step_id uuid,
  p_dispute_id uuid,
  p_admin_notes text,
  p_admin_email text
)
returns void language plpgsql as $$
declare
  v_step record;
  v_next_step record;
  v_all_done boolean;
begin
  select * into v_step from public.task_steps where id = p_step_id;
  if v_step is null or v_step.status != 'escalated' then return; end if;

  -- Mark step completed
  update public.task_steps
  set status = 'completed', completed_at = now()
  where id = p_step_id;

  -- Resolve the dispute
  update public.disputes
  set status = 'Resolved',
      admin_notes = p_admin_notes,
      resolved_at = now(),
      updated_at = now()
  where id = p_dispute_id;

  -- Unlock next step
  select * into v_next_step from public.task_steps
  where task_id = v_step.task_id and step_index = v_step.step_index + 1;

  if v_next_step is not null then
    update public.task_steps set status = 'pending' where id = v_next_step.id;
  end if;

  -- Check if all done
  select not exists(
    select 1 from public.task_steps
    where task_id = v_step.task_id and status != 'completed'
  ) into v_all_done;

  if v_all_done then
    update public.tasks set status = 'Completed', progress = 100 where id = v_step.task_id;
  end if;

  perform public.fn_sync_task_progress(v_step.task_id);

  if v_step.assigned_employee_email is not null then
    perform public.fn_recalculate_employee_metrics(v_step.assigned_employee_email);
  end if;
end;
$$;
