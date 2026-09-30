-- Fila durável e idempotente para avisos financeiros ao organizador.
-- Aplicar primeiro no Sandbox; nenhum endereço de e-mail é gravado em texto puro.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.organizer_financial_notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  championship_id uuid NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  source_key text NOT NULL,
  payment_id text NOT NULL,
  event_kind text NOT NULL CHECK (event_kind IN ('payment_confirmed', 'refund_confirmed', 'refund_partially_confirmed')),
  record_type text NOT NULL CHECK (record_type IN ('registration', 'athlete_ticket', 'spectator_ticket')),
  record_id uuid NOT NULL,
  amount numeric(12,2),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'accepted', 'failed', 'suppressed')),
  provider_message_id text,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0 AND attempt_count <= 5),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  recipient_hash text,
  last_error_category text,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organizer_id, source_key)
);
CREATE INDEX IF NOT EXISTS organizer_financial_notification_retry_idx ON public.organizer_financial_notification_deliveries (status, next_attempt_at) WHERE status IN ('queued', 'processing', 'failed');
ALTER TABLE public.organizer_financial_notification_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organizer_financial_notification_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.organizer_financial_notification_deliveries TO service_role;

CREATE OR REPLACE FUNCTION public.claim_organizer_financial_notification_deliveries(p_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, organizer_id uuid, championship_id uuid, payment_id text, event_kind text, record_type text, record_id uuid, amount numeric, attempt_count integer)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
  WITH candidates AS (
    SELECT d.id FROM public.organizer_financial_notification_deliveries d
    WHERE d.attempt_count < 5 AND ((d.status IN ('queued','failed') AND d.next_attempt_at <= now()) OR (d.status = 'processing' AND d.claimed_at < now() - interval '15 minutes'))
    ORDER BY d.next_attempt_at, d.created_at, d.id FOR UPDATE SKIP LOCKED LIMIT LEAST(GREATEST(p_limit, 1), 250)
  ), claimed AS (
    UPDATE public.organizer_financial_notification_deliveries d SET status='processing', claimed_at=now(), updated_at=now() FROM candidates c WHERE d.id=c.id
    RETURNING d.id,d.organizer_id,d.championship_id,d.payment_id,d.event_kind,d.record_type,d.record_id,d.amount,d.attempt_count
  ) SELECT * FROM claimed;
$$;
REVOKE ALL ON FUNCTION public.claim_organizer_financial_notification_deliveries(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_organizer_financial_notification_deliveries(integer) TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';
