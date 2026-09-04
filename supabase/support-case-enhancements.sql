BEGIN;

ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS sla_due_at timestamptz;
ALTER TABLE public.support_cases DROP CONSTRAINT IF EXISTS support_cases_priority_check;
ALTER TABLE public.support_cases ADD CONSTRAINT support_cases_priority_check CHECK (priority IN ('low', 'normal', 'high', 'critical'));
CREATE INDEX IF NOT EXISTS support_cases_queue_idx ON public.support_cases (status, priority, sla_due_at, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.support_case_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.support_cases(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  original_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_case_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_case_attachments FROM anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('support-attachments', 'support-attachments', false, 5242880, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;
NOTIFY pgrst, 'reload schema';
