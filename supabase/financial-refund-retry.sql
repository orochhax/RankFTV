-- Permite uma nova tentativa de estorno somente depois de uma falha terminal
-- confirmada pelo provedor. Estados pendentes e ambíguos conservam a mesma
-- referência e seguem pela reconciliação, sem risco de devolução duplicada.

CREATE OR REPLACE FUNCTION financial_resolve_refund_reference(
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
    RAISE EXCEPTION 'FINANCIAL_REFUND_REFERENCE_REQUIRED';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    p_flow || ':' || p_record_id::text || ':' || p_base_reference,
    0
  ));

  SELECT * INTO v_latest
  FROM financial_operations
  WHERE flow = p_flow
    AND operation_type = 'refund'
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
  IF v_latest.status <> 'cancelled' THEN
    RETURN v_latest.external_reference;
  END IF;

  SELECT COUNT(*)::integer INTO v_generation
  FROM financial_operations
  WHERE flow = p_flow
    AND operation_type = 'refund'
    AND record_id = p_record_id
    AND (
      external_reference = p_base_reference
      OR starts_with(external_reference, p_base_reference || ':retry:')
    );

  RETURN p_base_reference || ':retry:' || v_generation::text;
END;
$$;

REVOKE ALL ON FUNCTION financial_resolve_refund_reference(text,uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION financial_resolve_refund_reference(text,uuid,text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
