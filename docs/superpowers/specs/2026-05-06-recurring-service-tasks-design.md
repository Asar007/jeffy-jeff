# Recurring Service Tasks — Design

**Date:** 2026-05-06
**Status:** Approved (brainstorming complete, awaiting plan)
**Owner:** Asar007

## Problem

NRI Bridge offers ongoing services — monthly property inspections, periodic vehicle servicing, parental wellness check-ins, medicine deliveries — but the system only models one-shot onboarding tasks. After a client's onboarding pipeline (e.g., Home Management) completes, there's no way to automatically generate the next month's inspection visit. Admins would have to create tasks manually each cycle.

We need a recurring-task system that:
- Periodically auto-creates tasks for the right (client × service) on the right cadence.
- Lets the client manually trigger an off-cycle visit when they need one.
- Lets admin pause, edit cadence, or trigger a fire on demand.
- Reuses the existing tasks/steps/proofs/auto-assign infrastructure — no parallel system.

## Out of scope

- Token / credit / quota system (considered, dropped — adds complexity without near-term value).
- Pipeline editor UI (separate feature; recurring pipelines ship as seed migration).
- Email or SMS notifications on auto-fire (existing dashboard polling is sufficient for v1).
- Per-task or per-step recurrence (only per-service-per-client).
- Calendar-anchored cadence (e.g., "1st of every month") — only N-days-since-last-fire.
- Holiday-skip / blackout windows.

## Architecture overview

A new table `recurring_schedules` holds one row per `(client, service)` that should recur. A pg_cron job runs daily; for any active schedule whose `next_due_at` has passed, it calls `fn_fire_recurring_schedule(id)`, which:

1. Inserts a row into `tasks` with the appropriate recurring `pipeline_key`.
2. Calls existing `fn_create_task_steps` to populate steps from the pipeline definition.
3. Calls existing `fn_auto_assign_task` to pick the best-fit employee.
4. Advances the schedule's `last_fired_at` / `next_due_at`.

Manual fires (admin "Run now" or client "Request next visit") call `fn_fire_recurring_schedule_manual` which does the same work without checking `next_due_at`.

A new column `service_pipelines.is_recurring` distinguishes onboarding pipelines from recurring ones. Five new recurring pipelines are seeded.

## Schema

### New table: `recurring_schedules`

```sql
create table public.recurring_schedules (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  service         text not null,            -- display string copied from clients.services (e.g., "Property Inspection")
  pipeline_key    text not null,            -- references service_pipelines.pipeline_key (e.g., "home_inspection")
  interval_days   int  not null default 30 check (interval_days >= 1),
  active          boolean not null default true,
  last_fired_at   timestamptz,
  next_due_at     timestamptz,
  created_by      text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (client_id, service)
);

create index recurring_schedules_due_idx
  on public.recurring_schedules (active, next_due_at) where active = true;

alter table public.recurring_schedules enable row level security;
create policy "Admin full access" on public.recurring_schedules for all using (true) with check (true);
```

### New column: `service_pipelines.is_recurring`

```sql
alter table public.service_pipelines
  add column if not exists is_recurring boolean default false;
```

### New table: `recurring_schedule_log` (audit + error trail)

```sql
create table public.recurring_schedule_log (
  id            uuid primary key default gen_random_uuid(),
  schedule_id   uuid references recurring_schedules(id) on delete cascade,
  fired_at      timestamptz default now(),
  trigger_type  text check (trigger_type in ('cron', 'admin_manual', 'client_manual')),
  result        text check (result in ('success', 'skipped_inactive', 'skipped_pipeline_missing', 'skipped_active_task', 'error')),
  task_id       uuid references tasks(id),
  error_msg     text
);

create index recurring_schedule_log_schedule_idx on public.recurring_schedule_log(schedule_id, fired_at desc);
```

### Backstop trigger

A `before insert/update` trigger on `recurring_schedules` keeps `next_due_at` consistent. If null, set to `coalesce(last_fired_at, now()) + interval_days * interval '1 day'`.

## Functions

### `fn_fire_recurring_schedule(p_schedule_id uuid, p_trigger_type text)`

Internal worker. Steps:
1. Read schedule. If `active = false`, log `skipped_inactive` and return.
2. Verify `pipeline_key` exists in `service_pipelines`. If not, log `skipped_pipeline_missing` and return without advancing dates.
3. Check guard: reject if any task exists for `(client_id, pipeline_key)` with status in (`Pending`, `In Progress`). Log `skipped_active_task` and return.
4. Insert into `tasks` (`client_id`, `service`, `pipeline_key`, `status='Pending'`, `progress=0`).
5. Call `fn_create_task_steps(task_id, pipeline_key)`.
6. Call `fn_auto_assign_task(task_id)` (no-op if no eligible employee — task remains unassigned, admin handles manually).
7. Update schedule: `last_fired_at = now()`, `next_due_at = now() + interval_days * interval '1 day'`, `updated_at = now()`.
8. Log `success` with `task_id`.

### `fn_fire_recurring_schedule_manual(p_schedule_id uuid, p_actor text)`

Public RPC for admin / client UI. Wraps `fn_fire_recurring_schedule` but:
- Bypasses no checks itself (the worker handles all guards).
- Sets `trigger_type` to `admin_manual` or `client_manual` based on actor.
- Returns the new `task_id` or null + error.

### Cron registration

```sql
create extension if not exists pg_cron;

select cron.schedule(
  'fire-recurring-schedules',
  '0 2 * * *',  -- 02:00 UTC daily (07:30 IST)
  $$
  select public.fn_fire_recurring_schedule(id, 'cron')
  from public.recurring_schedules
  where active = true and next_due_at <= now();
  $$
);
```

## Recurring pipelines (seed)

All seeded with `is_recurring = true`. Admin uses these for new schedules.

Patterns follow the existing `service_pipelines` convention: lowercase substrings that appear in service display names (matched via ILIKE in `fn_match_pipeline_key`).

| pipeline_key | display_name | service_match_patterns | steps |
|---|---|---|---|
| `home_inspection` | Home Monthly Inspection | `inspection`, `property inspection` | Property Visit (Inspection) → Inspection Report & Photos (Inspection) |
| `home_maintenance` | Home Maintenance Visit | `maintenance` | Site Visit (Property) → Maintenance Report & Photos (Property) |
| `vehicle_servicing` | Vehicle Service Visit | `servicing`, `vehicle servicing` | Service Booking (Vehicle) → Service Completion & Bill (Vehicle) |
| `parental_checkup` | Parental Wellness Check | `wellbeing`, `health checkup`, `companion` | Visit Parent (Care) → Wellness Report (Care) |
| `medicine_delivery` | Medicine Delivery | `medicine`, `medicine delivery` | Pickup & Deliver (Care) → Delivery Confirmation Photo (Care) |

Note: existing onboarding pipelines (`home`, `vehicle`, etc.) match these same substrings. The recurring resolver in the admin "+ Add Schedule" modal must filter for `is_recurring = true` so it only suggests recurring pipelines, never onboarding ones.

Each step has `name`, `description`, `required_skill` — same shape as existing pipelines. Inserted with `on conflict (pipeline_key) do nothing` for idempotency.

## UI surfaces

### Admin: new "Recurring" sidebar section in `admin.html`

Sits between Tasks and Disputes.

- **Table columns:** Client · Service · Pipeline · Interval (days) · Last Fired · Next Due · Active · Actions
- **Filters:** active/paused, service type, due-soon (next 7 days), overdue
- **Row actions:** Edit interval · Pause/Resume · Run now · Delete
- **"+ Add Schedule" modal:** client picker (existing) → service picker (existing client services) → recurring pipeline dropdown (suggested via match patterns; admin can override) → interval input (days, default 30) → save

### Admin: client detail modal — "Recurring Schedules" panel

Inside the existing client detail modal in the Clients section, add a panel listing this client's schedules with inline edit and "+ Add" button. Read-only mirror of the same data — all writes hit the same RPC endpoints as the dedicated section.

### Client dashboard `dashboard.html`

On each service card that has a schedule:
- Pill: `Next visit: <date> (in N days)` or `Paused`
- Button: **"Request next visit now"** — calls `fn_fire_recurring_schedule_manual` with `trigger_type='client_manual'`. Disabled if there's already an active (non-completed) task for the same `(client, pipeline_key)`.

### Employee portal `employee.html`

No changes. Recurring tasks are indistinguishable from one-off tasks in the employee's view — they're just tasks.

### RLS

- `recurring_schedules`: admin/service role full access. Client can `select` rows where `client_id` resolves to their auth identity (via `clients.email = auth.email()`); cannot insert/update/delete.
- `fn_fire_recurring_schedule_manual`: callable by admin always; callable by client only for their own schedule (verified server-side).
- `recurring_schedule_log`: admin read-only.

## Error handling

| Scenario | Behavior |
|---|---|
| No approved employees match required skill | Task created with `assigned_employee_email = null` (existing behavior). Visible in admin Tasks as unassigned. |
| `pipeline_key` no longer in `service_pipelines` | Worker logs `skipped_pipeline_missing`, leaves dates unchanged → re-attempts daily until fixed. |
| Client deleted | Cascade drops schedule and its log rows. |
| pg_cron not installed | Migration fails loudly. Doc note: Supabase Pro has pg_cron pre-enabled; free tier needs `create extension pg_cron`. |
| Duplicate `(client, service)` schedule | Blocked by `unique` constraint. |
| Manual fire double-click | Worker rejects if active task exists for `(client, pipeline_key)`; logs `skipped_active_task`. |
| Admin changes `interval_days` mid-cycle | Backstop trigger recomputes `next_due_at` from `last_fired_at + new_interval`. |
| `interval_days = 0` | Blocked by check constraint. |

## Testing

Manual + SQL-driven, matching existing repo patterns (no test framework in place).

1. **Migration smoke:** `supabase db push`; verify `recurring_schedules`, `recurring_schedule_log`, `is_recurring` column, indexes, 5 seed pipelines.
2. **Cron path:** insert schedule with `next_due_at = now() - interval '1 day'`; run the cron SQL by hand; assert task + steps created, dates advanced, log row `success`.
3. **Manual fire:** call `fn_fire_recurring_schedule_manual` with `next_due_at` in the future; verify task created, dates reset, log `admin_manual`.
4. **Skip-while-active guard:** fire manually, immediately fire again before completing first task; expect log `skipped_active_task`, no second task.
5. **Pause:** set `active=false`; run cron SQL; assert no task, no log row from cron, dates unchanged.
6. **Pipeline missing:** point schedule at fake `pipeline_key`; assert log `skipped_pipeline_missing`, dates unchanged, no task.
7. **Backstop trigger:** insert schedule with no `next_due_at`; assert trigger populated it. Update `interval_days`; assert `next_due_at` recomputed.
8. **UI smoke:** add schedule via admin modal; verify it appears in client detail panel and dashboard "next visit" pill; click "Request now"; verify task appears in employee portal.
9. **RLS:** as a client user, attempt to `update` a schedule row → expect denial. As same client, call manual-fire RPC for own schedule → success; for another client's schedule → denial.

## Migration plan

1. `20260506_recurring_schedules.sql` — table, log table, column, backstop trigger, RLS, indexes.
2. `20260506_recurring_pipelines_seed.sql` — 5 recurring pipeline rows with `is_recurring = true`.
3. `20260506_recurring_functions.sql` — `fn_fire_recurring_schedule`, `fn_fire_recurring_schedule_manual`.
4. `20260506_recurring_cron.sql` — pg_cron extension + `cron.schedule(...)` registration.

UI changes:
- `admin.html` + `admin.js` — new section, modal, list bindings.
- `dashboard.html` — service card pill + button.

## Open questions for plan stage

- Exact cron timing (02:00 UTC default, configurable later).
- Whether the admin "Recurring" section needs analytics (count of fires, success rate) or that's a v2.
- Whether `homePathForRole` / nav.js needs an entry for the new admin section or it's purely a `data-section` switch in admin.html.
