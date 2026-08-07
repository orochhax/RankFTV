-- Durable Asaas webhook ledger and monotonic payment state.
-- No payload or payer data is stored here.

CREATE TABLE IF NOT EXISTS asaas_webhook_events (
  event_id            text PRIMARY KEY,
  payment_id          text NOT NULL,
  event_type          text NOT NULL,
  event_rank          integer NOT NULL,
  external_reference  text,
  source              text NOT NULL DEFAULT 'webhook' CHECK (source IN ('webhook', 'reconciliation', 'fixture')),
  status              text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed', 'ignored')),
  attempt_count       integer NOT NULL DEFAULT 1,
  correlation_id      text,
  provider_created_at timestamptz,
  processing_started_at timestamptz NOT NULL DEFAULT now(),
  processed_at        timestamptz,
  last_error          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asaas_webhook_events_payment_idx
  ON asaas_webhook_events(payment_id, event_rank DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS asaas_webhook_events_failed_idx
  ON asaas_webhook_events(updated_at)
  WHERE status = 'failed';

CREATE TABLE IF NOT EXISTS asaas_payment_event_state (
  payment_id          text PRIMARY KEY,
  highest_event_rank  integer NOT NULL DEFAULT 0,
  highest_event_type  text,
  highest_event_id    text,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE asaas_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_payment_event_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON asaas_webhook_events, asaas_payment_event_state FROM PUBLIC, anon, authenticated;
GRANT ALL ON asaas_webhook_events, asaas_payment_event_state TO service_role;

CREATE OR REPLACE FUNCTION claim_asaas_webhook_event(
  p_event_id text,
  p_payment_id text,
  p_event_type text,
  p_event_rank integer,
  p_external_reference text DEFAULT NULL,
  p_source text DEFAULT 'webhook',
  p_correlation_id text DEFAULT NULL,
  p_provider_created_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event asaas_webhook_events%ROWTYPE;
  v_state asaas_payment_event_state%ROWTYPE;
  v_should_process boolean := false;
  v_reason text := 'duplicate';
BEGIN
  IF NULLIF(BTRIM(p_event_id), '') IS NULL OR NULLIF(BTRIM(p_payment_id), '') IS NULL THEN
    RAISE EXCEPTION 'ASAAS_EVENT_IDENTIFIER_REQUIRED';
  END IF;

  INSERT INTO asaas_payment_event_state(payment_id)
  VALUES (p_payment_id)
  ON CONFLICT (payment_id) DO NOTHING;

  SELECT * INTO v_state
  FROM asaas_payment_event_state
  WHERE payment_id = p_payment_id
  FOR UPDATE;

  SELECT * INTO v_event
  FROM asaas_webhook_events
  WHERE event_id = p_event_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_event.payment_id <> p_payment_id
      OR v_event.event_type <> p_event_type
      OR v_event.event_rank <> p_event_rank THEN
      RAISE EXCEPTION 'ASAAS_EVENT_ID_CONFLICT';
    END IF;
    IF v_event.status = 'failed'
      OR (v_event.status = 'processing' AND v_event.processing_started_at < now() - interval '5 minutes') THEN
      -- A retry must obey the same monotonic ordering as a brand-new event.
      -- Otherwise a confirmation that failed earlier could be retried after a
      -- refund and regress the domain record back to paid.
      IF v_event.event_rank < v_state.highest_event_rank
        OR (
          v_event.event_rank = v_state.highest_event_rank
          AND v_state.highest_event_id IS DISTINCT FROM v_event.event_id
          AND EXISTS (
            SELECT 1 FROM asaas_webhook_events highest
            WHERE highest.event_id = v_state.highest_event_id
              AND (
                highest.status IN ('processed', 'ignored')
                OR (highest.status = 'processing' AND highest.processing_started_at >= now() - interval '5 minutes')
              )
          )
        ) THEN
        UPDATE asaas_webhook_events
        SET status = 'ignored',
            processed_at = now(),
            last_error = NULL,
            updated_at = now()
        WHERE event_id = p_event_id;
        v_reason := 'out_of_order';
      ELSE
        UPDATE asaas_webhook_events
        SET status = 'processing',
            attempt_count = attempt_count + 1,
            correlation_id = COALESCE(p_correlation_id, correlation_id),
            processing_started_at = now(),
            last_error = NULL,
            updated_at = now()
        WHERE event_id = p_event_id
        RETURNING * INTO v_event;
        UPDATE asaas_payment_event_state
        SET highest_event_rank = GREATEST(highest_event_rank, v_event.event_rank),
            highest_event_type = v_event.event_type,
            highest_event_id = v_event.event_id,
            updated_at = now()
        WHERE payment_id = p_payment_id;
        v_should_process := true;
        v_reason := 'retry';
      END IF;
    ELSE
      v_reason := v_event.status;
    END IF;
  ELSIF p_event_rank < v_state.highest_event_rank
    OR (
      p_event_rank = v_state.highest_event_rank
      AND v_state.highest_event_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM asaas_webhook_events highest
        WHERE highest.event_id = v_state.highest_event_id
          AND (
            highest.status IN ('processed', 'ignored')
            OR (highest.status = 'processing' AND highest.processing_started_at >= now() - interval '5 minutes')
          )
      )
    ) THEN
    INSERT INTO asaas_webhook_events (
      event_id, payment_id, event_type, event_rank, external_reference,
      source, status, correlation_id, provider_created_at, processed_at
    ) VALUES (
      p_event_id, p_payment_id, p_event_type, p_event_rank, p_external_reference,
      p_source, 'ignored', p_correlation_id, p_provider_created_at, now()
    );
    v_reason := 'out_of_order';
  ELSE
    INSERT INTO asaas_webhook_events (
      event_id, payment_id, event_type, event_rank, external_reference,
      source, status, correlation_id, provider_created_at
    ) VALUES (
      p_event_id, p_payment_id, p_event_type, p_event_rank, p_external_reference,
      p_source, 'processing', p_correlation_id, p_provider_created_at
    );
    UPDATE asaas_payment_event_state
    SET highest_event_rank = p_event_rank,
        highest_event_type = p_event_type,
        highest_event_id = p_event_id,
        updated_at = now()
    WHERE payment_id = p_payment_id;
    v_should_process := true;
    v_reason := 'claimed';
  END IF;

  RETURN jsonb_build_object(
    'shouldProcess', v_should_process,
    'reason', v_reason,
    'eventId', p_event_id
  );
END $$;

CREATE OR REPLACE FUNCTION complete_asaas_webhook_event(
  p_event_id text,
  p_success boolean,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE asaas_webhook_events
  SET status = CASE WHEN p_success THEN 'processed' ELSE 'failed' END,
      processed_at = CASE WHEN p_success THEN now() ELSE NULL END,
      last_error = CASE WHEN p_success THEN NULL ELSE LEFT(COALESCE(p_error, 'processing_failed'), 300) END,
      updated_at = now()
  WHERE event_id = p_event_id;
END $$;

REVOKE ALL ON FUNCTION claim_asaas_webhook_event(text,text,text,integer,text,text,text,timestamptz)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION complete_asaas_webhook_event(text,boolean,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_asaas_webhook_event(text,text,text,integer,text,text,text,timestamptz)
  TO service_role;
GRANT EXECUTE ON FUNCTION complete_asaas_webhook_event(text,boolean,text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'asaas-webhook-idempotency done';
