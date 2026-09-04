BEGIN;

CREATE TABLE IF NOT EXISTS public.championship_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id uuid NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('schedule', 'location', 'important')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  message text NOT NULL CHECK (char_length(message) BETWEEN 3 AND 2000),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS championship_notices_event_idx ON public.championship_notices (championship_id, created_at DESC);
ALTER TABLE public.championship_notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS championship_notices_public_read ON public.championship_notices;
CREATE POLICY championship_notices_public_read ON public.championship_notices FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.championships c WHERE c.id = championship_id AND c.status <> 'rascunho')
);
REVOKE INSERT, UPDATE, DELETE ON public.championship_notices FROM anon, authenticated;
GRANT SELECT ON public.championship_notices TO anon, authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
