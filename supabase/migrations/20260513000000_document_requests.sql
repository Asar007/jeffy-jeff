-- 20260513: Admin-requested sensitive document workflow

create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  service_type text,
  document_title text not null,
  request_note text,
  due_at timestamptz,
  status text not null default 'requested'
    check (status in ('requested', 'email_sent', 'email_failed', 'uploaded', 'cancelled')),
  sensitivity text not null default 'sensitive'
    check (sensitivity in ('standard', 'sensitive')),
  requested_by text,
  email_subject text,
  email_sent_at timestamptz,
  email_error text,
  uploaded_document_id uuid,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_requests_client_email_idx
  on public.document_requests (client_email, created_at desc);

create index if not exists document_requests_status_idx
  on public.document_requests (status, due_at);

alter table public.documents
  add column if not exists document_request_id uuid references public.document_requests(id) on delete set null;

create index if not exists documents_document_request_id_idx
  on public.documents (document_request_id);

create or replace function private.touch_document_request_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_document_requests_touch_updated_at on public.document_requests;
create trigger trg_document_requests_touch_updated_at
before update on public.document_requests
for each row
execute function private.touch_document_request_updated_at();

create or replace function public.fn_sync_document_request_upload_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.document_request_id is null then
    return new;
  end if;

  update public.document_requests
     set status = 'uploaded',
         uploaded_document_id = new.id,
         fulfilled_at = coalesce(new.uploaded_at, now()),
         updated_at = now()
   where id = new.document_request_id
     and lower(client_email) = lower(new.client_email);

  return new;
end;
$$;

drop trigger if exists trg_documents_sync_document_request_status on public.documents;
create trigger trg_documents_sync_document_request_status
after insert or update of document_request_id on public.documents
for each row
execute function public.fn_sync_document_request_upload_status();

alter table public.document_requests enable row level security;

create policy "document_requests_admin_all" on public.document_requests
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "document_requests_client_select" on public.document_requests
  for select to authenticated
  using (lower(client_email) = private.current_email());

