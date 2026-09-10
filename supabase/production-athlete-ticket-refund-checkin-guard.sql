-- Impede o uso de uma credencial enquanto o reembolso do ingresso estiver
-- em andamento. O pedido continua pago e a vaga continua reservada ate o
-- provedor confirmar o estorno, mas o acesso fica suspenso imediatamente.

CREATE OR REPLACE FUNCTION guard_athlete_ticket_checkin_against_refund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment_status text;
BEGIN
  IF OLD.checked_in OR NOT NEW.checked_in THEN
    RETURN NEW;
  END IF;

  -- A mesma linha e bloqueada por financial_begin_operation ao iniciar um
  -- reembolso. Assim, check-in e reembolso nao podem vencer simultaneamente.
  SELECT t.status_pagamento
  INTO v_payment_status
  FROM athlete_tickets t
  WHERE t.id = NEW.athlete_ticket_id
  FOR UPDATE;

  IF v_payment_status IS DISTINCT FROM 'pago' THEN
    RAISE EXCEPTION 'ATHLETE_TICKET_NOT_ACTIVE' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM financial_operations f
    WHERE f.flow = 'athlete_ticket'
      AND f.operation_type = 'refund'
      AND f.record_id = NEW.athlete_ticket_id
      AND f.status NOT IN ('failed', 'cancelled')
  ) THEN
    RAISE EXCEPTION 'ATHLETE_TICKET_REFUND_PENDING' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS athlete_ticket_credentials_refund_checkin_guard
  ON athlete_ticket_credentials;
CREATE TRIGGER athlete_ticket_credentials_refund_checkin_guard
  BEFORE UPDATE OF checked_in ON athlete_ticket_credentials
  FOR EACH ROW
  EXECUTE FUNCTION guard_athlete_ticket_checkin_against_refund();

CREATE OR REPLACE FUNCTION guard_legacy_athlete_ticket_checkin_against_refund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.checked_in OR NOT NEW.checked_in THEN
    RETURN NEW;
  END IF;

  IF NEW.status_pagamento IS DISTINCT FROM 'pago' THEN
    RAISE EXCEPTION 'ATHLETE_TICKET_NOT_ACTIVE' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM financial_operations f
    WHERE f.flow = 'athlete_ticket'
      AND f.operation_type = 'refund'
      AND f.record_id = NEW.id
      AND f.status NOT IN ('failed', 'cancelled')
  ) THEN
    RAISE EXCEPTION 'ATHLETE_TICKET_REFUND_PENDING' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS athlete_tickets_refund_checkin_guard ON athlete_tickets;
CREATE TRIGGER athlete_tickets_refund_checkin_guard
  BEFORE UPDATE OF checked_in ON athlete_tickets
  FOR EACH ROW
  EXECUTE FUNCTION guard_legacy_athlete_ticket_checkin_against_refund();

-- A criacao da operacao de reembolso bloqueia a linha pai e confirma de novo
-- que nenhum atleta fez check-in. O bloqueio dura apenas esta curta transacao;
-- nenhuma chamada HTTP ao provedor ocorre enquanto ele estiver retido.
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_operation financial_operations%ROWTYPE;
  v_should_execute boolean := false;
  v_previous_status text;
  v_ticket_status text;
  v_ticket_checked_in boolean;
BEGIN
  IF p_flow = 'athlete_ticket' AND p_operation_type = 'refund' THEN
    SELECT t.status_pagamento, t.checked_in
    INTO v_ticket_status, v_ticket_checked_in
    FROM athlete_tickets t
    WHERE t.id = p_record_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'ATHLETE_TICKET_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;
    IF v_ticket_status IS DISTINCT FROM 'pago' THEN
      RAISE EXCEPTION 'ATHLETE_TICKET_NOT_ACTIVE' USING ERRCODE = 'P0001';
    END IF;
    IF v_ticket_checked_in THEN
      RAISE EXCEPTION 'ATHLETE_TICKET_ALREADY_CHECKED_IN' USING ERRCODE = 'P0001';
    END IF;
  END IF;

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

REVOKE ALL ON FUNCTION guard_athlete_ticket_checkin_against_refund()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION guard_legacy_athlete_ticket_checkin_against_refund()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION financial_begin_operation(
  text, text, uuid, text, numeric, text, uuid, text, jsonb, integer
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION financial_begin_operation(
  text, text, uuid, text, numeric, text, uuid, text, jsonb, integer
) TO service_role;
