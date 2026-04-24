-- ============================================================
-- Tasks — track which pipeline step the task is currently on.
-- Used by admin task edit modal to persist the stepper state
-- and by the client dashboard to render the correct step.
-- ============================================================

alter table public.tasks
  add column if not exists current_step int;
