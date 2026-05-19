-- 20240520: Add accepted/rejected statuses to document_requests

-- First, drop the old constraint
alter table public.document_requests
  drop constraint if exists document_requests_status_check;

-- Add the new constraint with expanded statuses
alter table public.document_requests
  add constraint document_requests_status_check
  check (status in ('requested', 'email_sent', 'email_failed', 'uploaded', 'accepted', 'rejected', 'cancelled'));

-- Add admin_note column if it doesn't exist (for rejection reasons)
alter table public.document_requests
  add column if not exists admin_note text;

-- Add accepted_at and rejected_at for tracking
alter table public.document_requests
  add column if not exists accepted_at timestamptz,
  add column if not exists rejected_at timestamptz;
