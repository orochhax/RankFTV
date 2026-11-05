-- Selecao segura de recebiveis no saque do organizador.
-- Aplicar depois de organizer-wallet-withdrawals.sql.
BEGIN;

CREATE OR REPLACE FUNCTION public.organizer_withdrawable_receivables(
  p_championship_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_result jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'WALLET_UNAUTHENTICATED'; END IF;
  SELECT organizador_id INTO v_owner FROM championships WHERE id=p_championship_id;
  IF v_owner IS DISTINCT FROM v_user THEN RAISE EXCEPTION 'WALLET_FORBIDDEN'; END IF;

  WITH spent AS (
    SELECT a.receivable_id, SUM(a.amount) amount
    FROM organizer_withdrawal_allocations a
    JOIN organizer_withdrawals w ON w.id=a.withdrawal_id
    WHERE w.status IN ('reserved','submitting','provider_pending','paid')
    GROUP BY a.receivable_id
  ), eligible AS (
    SELECT r.id, r.source_type, r.source_id, r.billing_type, r.available_at,
           ROUND(r.net_amount-COALESCE(s.amount,0),2) amount
    FROM organizer_receivables r
    LEFT JOIN spent s ON s.receivable_id=r.id
    WHERE r.organizer_id=v_user AND r.championship_id=p_championship_id
      AND r.status='active' AND r.available_at<=now()
      AND r.net_amount-COALESCE(s.amount,0)>0
    ORDER BY r.available_at,r.id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',id,'sourceType',source_type,'sourceId',source_id,
    'billingType',billing_type,'availableAt',available_at,'amount',amount
  ) ORDER BY available_at,id),'[]'::jsonb)
  INTO v_result FROM eligible;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_organizer_withdrawal_receivables(
  p_championship_id uuid,
  p_receivable_ids uuid[],
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid(); v_owner uuid; v_withdrawal uuid; v_ids uuid[];
  v_expected integer; v_found integer := 0; v_amount numeric(12,2) := 0; v_row record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'WALLET_UNAUTHENTICATED'; END IF;
  SELECT ARRAY(SELECT DISTINCT id FROM unnest(p_receivable_ids) AS selected(id) ORDER BY id) INTO v_ids;
  v_expected := COALESCE(cardinality(v_ids),0);
  IF v_expected < 1 OR v_expected > 100 THEN RAISE EXCEPTION 'WALLET_INVALID_SELECTION'; END IF;
  SELECT organizador_id INTO v_owner FROM championships WHERE id=p_championship_id;
  IF v_owner IS DISTINCT FROM v_user THEN RAISE EXCEPTION 'WALLET_FORBIDDEN'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('organizer-wallet:' || v_user::text,0));
  SELECT id INTO v_withdrawal FROM organizer_withdrawals
   WHERE organizer_id=v_user AND idempotency_key=p_idempotency_key;
  IF FOUND THEN
    RETURN (SELECT jsonb_build_object('id',id,'amount',amount,'status',status)
      FROM organizer_withdrawals WHERE id=v_withdrawal);
  END IF;

  FOR v_row IN
    WITH spent AS (
      SELECT a.receivable_id, SUM(a.amount) amount
      FROM organizer_withdrawal_allocations a JOIN organizer_withdrawals w ON w.id=a.withdrawal_id
      WHERE w.status IN ('reserved','submitting','provider_pending','paid') GROUP BY a.receivable_id
    )
    SELECT r.id,ROUND(r.net_amount-COALESCE(s.amount,0),2) remaining
    FROM organizer_receivables r LEFT JOIN spent s ON s.receivable_id=r.id
    WHERE r.id=ANY(v_ids) AND r.organizer_id=v_user AND r.championship_id=p_championship_id
      AND r.status='active' AND r.available_at<=now() AND r.net_amount-COALESCE(s.amount,0)>0
    ORDER BY r.id FOR UPDATE OF r
  LOOP
    v_found := v_found+1; v_amount := v_amount+v_row.remaining;
  END LOOP;
  IF v_found<>v_expected OR v_amount<0.01 THEN RAISE EXCEPTION 'WALLET_RECEIVABLE_SELECTION_UNAVAILABLE'; END IF;

  INSERT INTO organizer_withdrawals(organizer_id,championship_id,amount,idempotency_key)
  VALUES(v_user,p_championship_id,v_amount,p_idempotency_key) RETURNING id INTO v_withdrawal;
  WITH spent AS (
    SELECT a.receivable_id, SUM(a.amount) amount
    FROM organizer_withdrawal_allocations a JOIN organizer_withdrawals w ON w.id=a.withdrawal_id
    WHERE w.status IN ('reserved','submitting','provider_pending','paid') GROUP BY a.receivable_id
  )
  INSERT INTO organizer_withdrawal_allocations(withdrawal_id,receivable_id,amount)
  SELECT v_withdrawal,r.id,ROUND(r.net_amount-COALESCE(s.amount,0),2)
  FROM organizer_receivables r LEFT JOIN spent s ON s.receivable_id=r.id
  WHERE r.id=ANY(v_ids) ORDER BY r.id;
  RETURN jsonb_build_object('id',v_withdrawal,'amount',v_amount,'status','reserved');
END;
$$;

REVOKE ALL ON FUNCTION public.organizer_withdrawable_receivables(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reserve_organizer_withdrawal_receivables(uuid,uuid[],uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reserve_organizer_withdrawal(uuid,numeric,uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.organizer_withdrawable_receivables(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_organizer_withdrawal_receivables(uuid,uuid[],uuid) TO authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
