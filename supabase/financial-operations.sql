-- RankFTV - durable financial operations and reconciliation outbox.
-- Apply after the existing payment tables. This migration is additive and
-- idempotent; application clients never receive access to these tables.

CREATE TABLE IF NOT EXISTS financial_operations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow                text NOT NULL CHECK (flow IN (
    'registration', 'athlete_ticket', 'spectator_ticket',
    'arena_subscription', 'arena_rental', 'arena_daily_pass',
    'arena_class', 'arena_monthly_charge', 'payout'
  )),
  operation_type      text NOT NULL CHECK (operation_type IN ('payment', 'subscription', 'refund', 'transfer')),
  record_id           uuid NOT NULL,
  external_reference  text NOT NULL,
  status              text NOT NULL DEFAULT 'initialized' CHECK (status IN (
    'initialized', 'processing', 'provider_created', 'confirmed',
    'ambiguous', 'failed', 'refunded', 'cancelled'
  )),
  amount              numeric(12,2),
  billing_type        text,
  provider_id         text,
  provider_status     text,
  actor_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  correlation_id      text,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempt_count       integer NOT NULL DEFAULT 0,
  processing_started_at timestamptz,
  next_reconcile_at   timestamptz,
  last_error_code     text,
  last_error_message  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,
  UNIQUE (operation_type, external_reference)
);

CREATE INDEX IF NOT EXISTS financial_operations_record_idx
  ON financial_operations (flow, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS financial_operations_reconcile_idx
  ON financial_operations (next_reconcile_at, status)
  WHERE status IN ('ambiguous', 'processing', 'failed');
CREATE UNIQUE INDEX IF NOT EXISTS financial_operations_provider_unique
  ON financial_operations (provider_id)
  WHERE provider_id IS NOT NULL AND operation_type IN ('payment', 'subscription');

CREATE TABLE IF NOT EXISTS financial_outbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id    uuid NOT NULL REFERENCES financial_operations(id) ON DELETE CASCADE,
  event_type      text NOT NULL DEFAULT 'reconcile' CHECK (event_type IN ('reconcile', 'alert')),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  available_at    timestamptz NOT NULL DEFAULT now(),
  locked_at       timestamptz,
  attempt_count   integer NOT NULL DEFAULT 0,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  UNIQUE (operation_id, event_type)
);

CREATE INDEX IF NOT EXISTS financial_outbox_pending_idx
  ON financial_outbox (available_at, created_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE financial_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON financial_operations, financial_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON financial_operations, financial_outbox TO service_role;

CREATE OR REPLACE FUNCTION financial_begin_operation(
  p_flow text,
  p_operation_type text,
  p_record_id uuid,
  p_external_reference text,
  p_amount numeric DEFAULT NULL,
  p_billing_type text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_lease_seconds integer DEFAULT 120
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operation financial_operations%ROWTYPE;
  v_should_execute boolean := false;
  v_previous_status text;
BEGIN
  INSERT INTO financial_operations (
    flow, operation_type, record_id, external_reference, amount,
    billing_type, actor_id, correlation_id, metadata
  ) VALUES (
    p_flow, p_operation_type, p_record_id, p_external_reference, p_amount,
    p_billing_type, p_actor_id, p_correlation_id, COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (operation_type, external_reference) DO NOTHING;

  SELECT * INTO v_operation
    FROM financial_operations
    WHERE operation_type = p_operation_type
      AND external_reference = p_external_reference
    FOR UPDATE;

  IF v_operation.record_id <> p_record_id OR v_operation.flow <> p_flow THEN
    RAISE EXCEPTION 'FINANCIAL_OPERATION_REFERENCE_CONFLICT';
  END IF;

  v_previous_status := v_operation.status;

  IF v_operation.status IN ('provider_created', 'confirmed', 'refunded', 'cancelled') THEN
    v_should_execute := false;
  ELSIF v_operation.status = 'ambiguous'
    AND v_operation.next_reconcile_at IS NOT NULL
    AND v_operation.next_reconcile_at > now() THEN
    v_should_execute := false;
  ELSIF v_operation.status = 'processing'
    AND v_operation.processing_started_at > now() - make_interval(secs => GREATEST(30, p_lease_seconds)) THEN
    v_should_execute := false;
  ELSE
    UPDATE financial_operations
      SET status = 'processing',
          amount = COALESCE(p_amount, amount),
          billing_type = COALESCE(p_billing_type, billing_type),
          actor_id = COALESCE(p_actor_id, actor_id),
          correlation_id = COALESCE(p_correlation_id, correlation_id),
          metadata = metadata || COALESCE(p_metadata, '{}'::jsonb),
          processing_started_at = now(),
          attempt_count = attempt_count + 1,
          last_error_code = NULL,
          last_error_message = NULL,
          updated_at = now()
      WHERE id = v_operation.id
      RETURNING * INTO v_operation;
    v_should_execute := true;
  END IF;

  RETURN jsonb_build_object(
    'id', v_operation.id,
    'status', v_operation.status,
    'providerId', v_operation.provider_id,
    'providerStatus', v_operation.provider_status,
    'previousStatus', v_previous_status,
    'shouldExecute', v_should_execute,
    'attemptCount', v_operation.attempt_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION financial_complete_operation(
  p_operation_id uuid,
  p_provider_id text,
  p_provider_status text,
  p_status text DEFAULT 'provider_created'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operation financial_operations%ROWTYPE;
BEGIN
  SELECT * INTO v_operation
  FROM financial_operations
  WHERE id = p_operation_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FINANCIAL_OPERATION_NOT_FOUND';
  END IF;
  IF v_operation.provider_id IS NOT NULL
    AND p_provider_id IS NOT NULL
    AND v_operation.provider_id <> p_provider_id THEN
    RAISE EXCEPTION 'FINANCIAL_PROVIDER_ID_CONFLICT';
  END IF;

  UPDATE financial_operations
    SET provider_id = COALESCE(p_provider_id, provider_id),
        provider_status = COALESCE(p_provider_status, provider_status),
        status = p_status,
        processing_started_at = NULL,
        next_reconcile_at = NULL,
        last_error_code = NULL,
        last_error_message = NULL,
        updated_at = now(),
        completed_at = CASE WHEN p_status IN ('confirmed', 'refunded', 'cancelled') THEN now() ELSE completed_at END
    WHERE id = p_operation_id;

  IF p_status = 'provider_created' THEN
    INSERT INTO financial_outbox (operation_id, event_type, status, available_at)
      VALUES (p_operation_id, 'reconcile', 'pending', now() + interval '5 minutes')
    ON CONFLICT (operation_id, event_type) DO UPDATE
      SET status = 'pending',
          available_at = EXCLUDED.available_at,
          locked_at = NULL,
          last_error = NULL,
          completed_at = NULL;
  ELSE
    UPDATE financial_outbox
      SET status = 'completed', completed_at = now(), locked_at = NULL, last_error = NULL
      WHERE operation_id = p_operation_id AND event_type = 'reconcile';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION financial_resolve_transfer_reference(
  p_flow text,
  p_record_id uuid,
  p_base_reference text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_latest financial_operations%ROWTYPE;
  v_generation integer := 0;
BEGIN
  IF NULLIF(BTRIM(p_base_reference), '') IS NULL THEN
    RAISE EXCEPTION 'FINANCIAL_TRANSFER_REFERENCE_REQUIRED';
  END IF;

  -- Domain rows already claim one payout worker, and this transaction lock is
  -- a second boundary for webhook/cron overlap before the operation row exists.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    p_flow || ':' || p_record_id::text || ':' || p_base_reference,
    0
  ));

  SELECT * INTO v_latest
  FROM financial_operations
  WHERE flow = p_flow
    AND operation_type = 'transfer'
    AND record_id = p_record_id
    AND (
      external_reference = p_base_reference
      OR starts_with(external_reference, p_base_reference || ':retry:')
    )
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN p_base_reference;
  END IF;

  -- A new provider transfer is allowed only after an unequivocal terminal
  -- failure. Pending, ambiguous and successful operations keep their exact
  -- reference so every concurrent caller converges on the same transfer.
  IF v_latest.status NOT IN ('failed', 'cancelled') THEN
    RETURN v_latest.external_reference;
  END IF;

  SELECT COUNT(*)::integer INTO v_generation
  FROM financial_operations
  WHERE flow = p_flow
    AND operation_type = 'transfer'
    AND record_id = p_record_id
    AND (
      external_reference = p_base_reference
      OR starts_with(external_reference, p_base_reference || ':retry:')
    );

  RETURN p_base_reference || ':retry:' || v_generation::text;
END;
$$;

CREATE OR REPLACE FUNCTION financial_fail_operation(
  p_operation_id uuid,
  p_ambiguous boolean,
  p_error_code text,
  p_error_message text,
  p_retry_seconds integer DEFAULT 60
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE financial_operations
    SET status = CASE WHEN p_ambiguous THEN 'ambiguous' ELSE 'failed' END,
        processing_started_at = NULL,
        next_reconcile_at = CASE WHEN p_ambiguous THEN now() + make_interval(secs => GREATEST(15, p_retry_seconds)) ELSE NULL END,
        last_error_code = left(COALESCE(p_error_code, 'unknown'), 80),
        last_error_message = left(COALESCE(p_error_message, 'Falha na operacao financeira.'), 300),
        updated_at = now()
    WHERE id = p_operation_id;

  IF p_ambiguous THEN
    INSERT INTO financial_outbox (operation_id, event_type, status, available_at)
      VALUES (p_operation_id, 'reconcile', 'pending', now() + make_interval(secs => GREATEST(15, p_retry_seconds)))
    ON CONFLICT (operation_id, event_type) DO UPDATE
      SET status = 'pending',
          available_at = EXCLUDED.available_at,
          locked_at = NULL,
          last_error = NULL,
          completed_at = NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION financial_claim_outbox(p_limit integer DEFAULT 50)
RETURNS SETOF financial_operations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT o.id
      FROM financial_outbox o
      WHERE o.event_type = 'reconcile'
        AND o.available_at <= now()
        AND (
          o.status IN ('pending', 'failed')
          OR (o.status = 'processing' AND o.locked_at < now() - interval '5 minutes')
        )
      ORDER BY o.available_at, o.created_at
      FOR UPDATE SKIP LOCKED
      LIMIT LEAST(GREATEST(p_limit, 1), 200)
  ), updated AS (
    UPDATE financial_outbox o
      SET status = 'processing', locked_at = now(), attempt_count = attempt_count + 1
      FROM claimed c
      WHERE o.id = c.id
      RETURNING o.operation_id
  )
  SELECT f.* FROM financial_operations f JOIN updated u ON u.operation_id = f.id;
END;
$$;

CREATE OR REPLACE FUNCTION financial_reschedule_outbox(
  p_operation_id uuid,
  p_error text,
  p_retry_seconds integer DEFAULT 300
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE financial_outbox
    SET status = 'failed',
        available_at = now() + make_interval(secs => GREATEST(30, p_retry_seconds)),
        locked_at = NULL,
        last_error = left(COALESCE(p_error, 'Falha de reconciliacao.'), 300)
    WHERE operation_id = p_operation_id AND event_type = 'reconcile';
END;
$$;

REVOKE ALL ON FUNCTION financial_begin_operation(text,text,uuid,text,numeric,text,uuid,text,jsonb,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION financial_complete_operation(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION financial_resolve_transfer_reference(text,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION financial_fail_operation(uuid,boolean,text,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION financial_claim_outbox(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION financial_reschedule_outbox(uuid,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION financial_begin_operation(text,text,uuid,text,numeric,text,uuid,text,jsonb,integer) TO service_role;
GRANT EXECUTE ON FUNCTION financial_complete_operation(uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION financial_resolve_transfer_reference(text,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION financial_fail_operation(uuid,boolean,text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION financial_claim_outbox(integer) TO service_role;
GRANT EXECUTE ON FUNCTION financial_reschedule_outbox(uuid,text,integer) TO service_role;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'financial-operations done';
