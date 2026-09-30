BEGIN;

CREATE TABLE IF NOT EXISTS public.championship_category_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id uuid NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.championship_categories(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 254),
  consented_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'invited', 'converted', 'cancelled', 'expired')),
  invite_token_hash text,
  invite_expires_at timestamptz,
  invited_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, email)
);

CREATE INDEX IF NOT EXISTS championship_waitlist_queue_idx
  ON public.championship_category_waitlist (category_id, status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS championship_waitlist_token_idx
  ON public.championship_category_waitlist (invite_token_hash)
  WHERE invite_token_hash IS NOT NULL;

ALTER TABLE public.championship_category_waitlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.championship_category_waitlist FROM anon, authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
