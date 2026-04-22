-- ============================================================
-- Tasks — link each task to the employee who will deliver it.
-- Admin picks an approved employee in the task edit modal;
-- employees see their assigned tasks in employee.html.
-- ============================================================

alter table public.tasks
  add column if not exists assigned_employee_email text;

create index if not exists tasks_assigned_employee_idx
  on public.tasks(assigned_employee_email);
