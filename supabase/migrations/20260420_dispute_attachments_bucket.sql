-- ============================================================
-- Dispute attachments — ensure storage bucket + policies
--
-- The dispute center uploads files to Storage under path
--   disputes/<email>/<timestamp>-<rand>-<filename>
-- in the shared `documents` bucket. This migration makes sure
-- the bucket exists, is private, and enforces a 5 MB per-file
-- size cap server-side so a client bypassing the UI check cannot
-- upload oversized files.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 5242880)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      public = excluded.public;

-- RLS policies for the bucket. Permissive to match existing project
-- policies — tighten once auth.uid() is wired throughout.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Documents bucket read'
  ) then
    create policy "Documents bucket read"
      on storage.objects for select
      using (bucket_id = 'documents');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Documents bucket insert'
  ) then
    create policy "Documents bucket insert"
      on storage.objects for insert
      with check (bucket_id = 'documents');
  end if;
end $$;

-- Keep the disputes.attachments column documented — each element should be
--   { file_name, mime_type, size, storage_path }
-- (file_data/base64 is no longer written; older rows may still contain it).
comment on column public.disputes.attachments is
  'Array of { file_name, mime_type, size, storage_path } pointing into the documents storage bucket.';
