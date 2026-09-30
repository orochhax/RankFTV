-- Reivindicacao atomica da fila de avisos de alteracao de campeonato.
-- Execute depois de production-championship-change-notifications.sql.

BEGIN;

ALTER TABLE public.championship_notice_deliveries
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

ALTER TABLE public.championship_notice_deliveries
  DROP CONSTRAINT IF EXISTS championship_notice_deliveries_status_check;

ALTER TABLE public.championship_notice_deliveries
  ADD CONSTRAINT championship_notice_deliveries_status_check
  CHECK (status IN ('queued', 'processing', 'accepted', 'failed', 'suppressed'));

DROP INDEX IF EXISTS public.championship_notice_deliveries_retry_idx;
CREATE INDEX championship_notice_deliveries_retry_idx
  ON public.championship_notice_deliveries (status, next_attempt_at)
  WHERE status IN ('queued', 'processing', 'failed');

CREATE OR REPLACE FUNCTION public.claim_championship_notice_deliveries(
  p_notice_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  notice_id uuid,
  championship_id uuid,
  recipient_source text,
  recipient_ref uuid,
  recipient_slot text,
  recipient_hash text,
  attempt_count integer
)
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH candidates AS (
    SELECT d.id
    FROM public.championship_notice_deliveries AS d
    WHERE d.attempt_count < 5
      AND (p_notice_id IS NULL OR d.notice_id = p_notice_id)
      AND (
        (d.status IN ('queued', 'failed') AND d.next_attempt_at <= now())
        OR (d.status = 'processing' AND d.claimed_at < now() - interval '15 minutes')
      )
    ORDER BY d.next_attempt_at, d.created_at, d.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 250)
  ), claimed AS (
    UPDATE public.championship_notice_deliveries AS d
    SET status = 'processing', claimed_at = now(), updated_at = now()
    FROM candidates AS c
    WHERE d.id = c.id
    RETURNING d.id, d.notice_id, d.championship_id, d.recipient_source,
      d.recipient_ref, d.recipient_slot, d.recipient_hash, d.attempt_count
  )
  SELECT * FROM claimed;
$$;

REVOKE ALL ON FUNCTION public.claim_championship_notice_deliveries(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_championship_notice_deliveries(uuid, integer)
  TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-championship-notification-claims done';
