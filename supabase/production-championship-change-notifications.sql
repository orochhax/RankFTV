-- Alertas idempotentes de alteração de data, horário e local do campeonato.
-- Nenhuma fila armazena o endereço de e-mail em texto puro.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.championship_notices
  ADD COLUMN IF NOT EXISTS dedupe_key text;

UPDATE public.championship_notices
SET dedupe_key = encode(digest(id::text, 'sha256'), 'hex')
WHERE dedupe_key IS NULL;

ALTER TABLE public.championship_notices
  ALTER COLUMN dedupe_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS championship_notices_dedupe_uidx
  ON public.championship_notices (championship_id, dedupe_key);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS source_notice_id uuid
    REFERENCES public.championship_notices(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_championship_notice_uidx
  ON public.notifications (user_id, source_notice_id)
  WHERE source_notice_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.championship_notice_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id uuid NOT NULL REFERENCES public.championship_notices(id) ON DELETE CASCADE,
  championship_id uuid NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  recipient_source text NOT NULL CHECK (recipient_source IN ('authenticated', 'athlete_ticket')),
  recipient_ref uuid NOT NULL,
  recipient_slot text NOT NULL CHECK (recipient_slot IN ('user', 'buyer', 'partner')),
  recipient_hash text NOT NULL CHECK (recipient_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'accepted', 'failed', 'suppressed')),
  provider_message_id text,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0 AND attempt_count <= 10),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error_category text,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notice_id, recipient_hash)
);

CREATE INDEX IF NOT EXISTS championship_notice_deliveries_retry_idx
  ON public.championship_notice_deliveries (status, next_attempt_at)
  WHERE status IN ('queued', 'failed');

ALTER TABLE public.championship_notice_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.championship_notice_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.championship_notice_deliveries TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-championship-change-notifications done';
