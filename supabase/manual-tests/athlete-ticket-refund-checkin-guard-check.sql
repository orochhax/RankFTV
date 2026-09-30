-- VERIFICACAO SOMENTE DE LEITURA DO ESTADO E TESTE TRANSACIONAL.
-- Informe um ingresso com reembolso ativo. A tentativa de check-in e desfeita
-- e deve ser rejeitada com ATHLETE_TICKET_REFUND_PENDING.

DO $$
DECLARE
  v_ticket_id uuid;
  v_credential_id uuid;
BEGIN
  SELECT t.id
  INTO v_ticket_id
  FROM athlete_tickets t
  WHERE t.status_pagamento = 'pago'
    AND NOT t.checked_in
    AND EXISTS (
      SELECT 1
      FROM financial_operations f
      WHERE f.flow = 'athlete_ticket'
        AND f.operation_type = 'refund'
        AND f.record_id = t.id
        AND f.status NOT IN ('failed', 'cancelled')
    )
  ORDER BY t.created_at DESC
  LIMIT 1;

  IF v_ticket_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum ingresso pago com reembolso ativo para testar.';
  END IF;

  SELECT c.id
  INTO v_credential_id
  FROM athlete_ticket_credentials c
  WHERE c.athlete_ticket_id = v_ticket_id
    AND NOT c.checked_in
  ORDER BY c.athlete_slot
  LIMIT 1;

  IF v_credential_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma credencial individual pendente para testar.';
  END IF;

  BEGIN
    UPDATE athlete_ticket_credentials
    SET checked_in = true,
        checkin_at = now()
    WHERE id = v_credential_id;
    RAISE EXCEPTION 'FALHA: check-in aceito durante reembolso ativo.';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'ATHLETE_TICKET_REFUND_PENDING' THEN
        RAISE;
      END IF;
  END;

  IF EXISTS (
    SELECT 1
    FROM athlete_ticket_credentials
    WHERE id = v_credential_id AND checked_in
  ) THEN
    RAISE EXCEPTION 'FALHA: a credencial ficou marcada como utilizada.';
  END IF;
END;
$$;

SELECT
  true AS checkin_bloqueado_durante_reembolso,
  true AS credencial_preservada_sem_checkin;
