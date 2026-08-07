-- RankFTV - durable card-testing protection.
-- Stores only HMAC fingerprints and last four digits; never PAN or CVV.

CREATE TABLE IF NOT EXISTS payment_card_attempts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow              text NOT NULL,
  order_reference   text NOT NULL,
  actor_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_hash           text NOT NULL,
  card_fingerprint  text NOT NULL,
  card_last4        text NOT NULL CHECK (card_last4 ~ '^[0-9]{4}$'),
  scope_keys        text[] NOT NULL,
  outcome           text NOT NULL DEFAULT 'started' CHECK (outcome IN ('started','success','declined','ambiguous','error','blocked')),
  provider_code     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz
);

CREATE TABLE IF NOT EXISTS payment_card_guards (
  scope_key         text PRIMARY KEY,
  attempt_count     integer NOT NULL DEFAULT 0,
  decline_count     integer NOT NULL DEFAULT 0,
  window_start      timestamptz NOT NULL DEFAULT now(),
  blocked_until     timestamptz,
  last_attempt_at   timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_card_attempts_order_idx
  ON payment_card_attempts (flow, order_reference, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_card_attempts_actor_idx
  ON payment_card_attempts (actor_id, created_at DESC) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_card_attempts_fingerprint_idx
  ON payment_card_attempts (card_fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_card_guards_blocked_idx
  ON payment_card_guards (blocked_until) WHERE blocked_until IS NOT NULL;

ALTER TABLE payment_card_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_card_guards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON payment_card_attempts, payment_card_guards FROM PUBLIC, anon, authenticated;
GRANT ALL ON payment_card_attempts, payment_card_guards TO service_role;

CREATE OR REPLACE FUNCTION begin_card_payment_attempt(
  p_flow text,
  p_order_reference text,
  p_actor_id uuid,
  p_ip_hash text,
  p_card_fingerprint text,
  p_card_last4 text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scopes text[];
  v_scope text;
  v_guard payment_card_guards%ROWTYPE;
  v_limit integer;
  v_attempt_id uuid;
  v_retry integer := 0;
BEGIN
  IF p_card_last4 !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'INVALID_CARD_IDENTIFIER';
  END IF;

  v_scopes := ARRAY[
    'card:' || p_card_fingerprint,
    'ip:' || p_ip_hash,
    'order:' || p_flow || ':' || p_order_reference
  ];
  IF p_actor_id IS NOT NULL THEN
    v_scopes := array_append(v_scopes, 'user:' || p_actor_id::text);
  END IF;
  SELECT array_agg(value ORDER BY value) INTO v_scopes FROM unnest(v_scopes) value;

  FOREACH v_scope IN ARRAY v_scopes LOOP
    INSERT INTO payment_card_guards (scope_key) VALUES (v_scope)
      ON CONFLICT (scope_key) DO NOTHING;
  END LOOP;

  FOREACH v_scope IN ARRAY v_scopes LOOP
    SELECT * INTO v_guard FROM payment_card_guards WHERE scope_key = v_scope FOR UPDATE;

    IF v_guard.window_start < now() - interval '1 hour' THEN
      UPDATE payment_card_guards
        SET attempt_count = 0, decline_count = 0, window_start = now(),
            blocked_until = CASE WHEN blocked_until > now() THEN blocked_until ELSE NULL END,
            updated_at = now()
        WHERE scope_key = v_scope
        RETURNING * INTO v_guard;
    END IF;

    IF v_guard.blocked_until IS NOT NULL AND v_guard.blocked_until > now() THEN
      v_retry := GREATEST(v_retry, ceil(extract(epoch FROM (v_guard.blocked_until - now())))::integer);
    END IF;
  END LOOP;

  IF v_retry > 0 THEN
    INSERT INTO payment_card_attempts (
      flow, order_reference, actor_id, ip_hash, card_fingerprint, card_last4, scope_keys, outcome
    ) VALUES (
      p_flow, p_order_reference, p_actor_id, p_ip_hash, p_card_fingerprint, p_card_last4, v_scopes, 'blocked'
    ) RETURNING id INTO v_attempt_id;
    RETURN jsonb_build_object('allowed', false, 'attemptId', v_attempt_id, 'retryAfterSeconds', v_retry);
  END IF;

  FOREACH v_scope IN ARRAY v_scopes LOOP
    v_limit := CASE
      WHEN v_scope LIKE 'card:%' THEN 6
      WHEN v_scope LIKE 'order:%' THEN 8
      WHEN v_scope LIKE 'user:%' THEN 12
      ELSE 20
    END;

    UPDATE payment_card_guards
      SET attempt_count = attempt_count + 1,
          last_attempt_at = now(),
          updated_at = now(),
          blocked_until = CASE
            WHEN attempt_count + 1 > v_limit THEN now() + interval '15 minutes'
            ELSE blocked_until
          END
      WHERE scope_key = v_scope
      RETURNING * INTO v_guard;

    IF v_guard.attempt_count > v_limit THEN
      v_retry := GREATEST(v_retry, 900);
    END IF;
  END LOOP;

  INSERT INTO payment_card_attempts (
    flow, order_reference, actor_id, ip_hash, card_fingerprint, card_last4, scope_keys,
    outcome, completed_at
  ) VALUES (
    p_flow, p_order_reference, p_actor_id, p_ip_hash, p_card_fingerprint, p_card_last4, v_scopes,
    CASE WHEN v_retry > 0 THEN 'blocked' ELSE 'started' END,
    CASE WHEN v_retry > 0 THEN now() ELSE NULL END
  ) RETURNING id INTO v_attempt_id;

  RETURN jsonb_build_object(
    'allowed', v_retry = 0,
    'attemptId', v_attempt_id,
    'retryAfterSeconds', v_retry
  );
END;
$$;

CREATE OR REPLACE FUNCTION finish_card_payment_attempt(
  p_attempt_id uuid,
  p_outcome text,
  p_provider_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt payment_card_attempts%ROWTYPE;
  v_scope text;
  v_guard payment_card_guards%ROWTYPE;
  v_block_seconds integer := 0;
  v_max_block integer := 0;
BEGIN
  IF p_outcome NOT IN ('success','declined','ambiguous','error') THEN
    RAISE EXCEPTION 'INVALID_CARD_ATTEMPT_OUTCOME';
  END IF;

  SELECT * INTO v_attempt FROM payment_card_attempts WHERE id = p_attempt_id FOR UPDATE;
  IF NOT FOUND OR v_attempt.outcome <> 'started' THEN
    RETURN jsonb_build_object('updated', false, 'blockedSeconds', 0);
  END IF;

  UPDATE payment_card_attempts
    SET outcome = p_outcome,
        provider_code = left(p_provider_code, 80),
        completed_at = now()
    WHERE id = p_attempt_id;

  FOREACH v_scope IN ARRAY v_attempt.scope_keys LOOP
    SELECT * INTO v_guard FROM payment_card_guards WHERE scope_key = v_scope FOR UPDATE;

    IF p_outcome = 'success' THEN
      UPDATE payment_card_guards
        SET decline_count = 0, blocked_until = NULL, updated_at = now()
        WHERE scope_key = v_scope
          AND (v_scope LIKE 'card:%' OR v_scope LIKE 'order:%');
    ELSIF p_outcome = 'declined' THEN
      v_guard.decline_count := v_guard.decline_count + 1;
      v_block_seconds := CASE
        WHEN v_guard.decline_count >= 8 THEN 86400
        WHEN v_guard.decline_count >= 5 THEN 3600
        WHEN v_guard.decline_count >= 3 THEN 900
        ELSE 0
      END;
      UPDATE payment_card_guards
        SET decline_count = v_guard.decline_count,
            blocked_until = CASE WHEN v_block_seconds > 0 THEN now() + make_interval(secs => v_block_seconds) ELSE blocked_until END,
            updated_at = now()
        WHERE scope_key = v_scope;
      v_max_block := GREATEST(v_max_block, v_block_seconds);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('updated', true, 'blockedSeconds', v_max_block);
END;
$$;

REVOKE ALL ON FUNCTION begin_card_payment_attempt(text,text,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION finish_card_payment_attempt(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION begin_card_payment_attempt(text,text,uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION finish_card_payment_attempt(uuid,text,text) TO service_role;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'payment-card-attempt-security done';
