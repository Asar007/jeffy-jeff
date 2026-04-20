-- ============================================================
-- Task Update Acknowledgments — clients can confirm they've seen
-- an update or raise a concern (which pre-fills a dispute).
-- ============================================================

alter table public.task_updates
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_note text,
  add column if not exists ack_kind text check (ack_kind in ('acknowledged', 'concern'));

create index if not exists task_updates_ack_idx
  on public.task_updates(task_id, acknowledged_at);
