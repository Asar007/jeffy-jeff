-- ============================================================
-- Task Updates — proof-of-work timeline posted by admins
-- so NRI clients can monitor progress remotely.
-- ============================================================

create table if not exists public.task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  author_email text,
  author_name text,
  note text not null,
  status_to text check (status_to in ('Pending', 'In Progress', 'In Review', 'Completed')),
  progress_to int check (progress_to is null or (progress_to >= 0 and progress_to <= 100)),
  photos jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create index if not exists task_updates_task_id_idx on public.task_updates(task_id);
create index if not exists task_updates_created_at_idx on public.task_updates(created_at desc);

alter table public.task_updates enable row level security;

-- Idempotent policy re-creation
drop policy if exists "Authenticated full access" on public.task_updates;
create policy "Authenticated full access" on public.task_updates
  for all using (auth.role() = 'authenticated');
