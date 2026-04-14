-- ============================================================
-- Add file_data column and created_at to documents table
-- Allows base64 file content storage as fallback when
-- Supabase Storage bucket is unavailable
-- ============================================================

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_data text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
