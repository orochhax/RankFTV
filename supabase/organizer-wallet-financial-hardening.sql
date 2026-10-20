-- Hardening P0 da carteira: antecipacao idempotente, debitos e controle unico
-- de repasse de campeonatos. Aplicar depois de organizer-wallet-withdrawals.sql.
BEGIN;

ALTER TABLE public.organizer_anticipations
  ADD COLUMN IF NOT EXISTS actual_fee numeric(12,2) CHECK (actual_fee IS NULL OR actual_fee >= 0),
  ADD COLUMN IF NOT EXISTS actual_net_value numeric(12,2) CHECK (actual_net_value IS NULL OR actual_net_value >= 0),
  ADD COLUMN IF NOT EXISTS submission_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz;
ALTER TABLE public.organizer_anticipations DROP CONSTRAINT IF EXISTS organizer_anticipations_status_check;
ALTER TABLE public.organizer_anticipations ADD CONSTRAINT organizer_anticipations_status_check
  CHECK (status IN ('reserved','submitting','documentation_required','provider_pending','credited','failed','cancelled'));
DROP INDEX IF EXISTS public.organizer_anticipations_active_receivable_uidx;
CREATE UNIQUE INDEX organizer_anticipations_active_receivable_uidx
  ON public.organizer_anticipations(receivable_id)
  WHERE status IN ('reserved','submitting','documentation_required','provider_pending','credited');

CREATE TABLE IF NOT EXISTS public.organizer_receivable_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  championship_id uuid NOT NULL REFERENCES public.championships(id) ON DELETE RESTRICT,
  receivable_id uuid NOT NULL REFERENCES public.organizer_receivables(id) ON DELETE RESTRICT,
  payment_id text NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('refund','chargeback','dispute','reversal')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  remaining_amount numeric(12,2) NOT NULL CHECK (remaining_amount >= 0 AND remaining_amount <= amount),
  provider_event_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','partially_compensated','compensated','disputed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS organizer_adjustments_owner_open_idx
  ON public.organizer_receivable_adjustments(organizer_id, championship_id, created_at)
  WHERE remaining_amount > 0;

CREATE TABLE IF NOT EXISTS public.organizer_receivable_adjustment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id uuid NOT NULL REFERENCES public.organizer_receivable_adjustments(id) ON DELETE RESTRICT,
  receivable_id uuid NOT NULL REFERENCES public.organizer_receivables(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.organizer_financial_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  championship_id uuid NOT NULL REFERENCES public.championships(id) ON DELETE RESTRICT,
  receivable_id uuid REFERENCES public.organizer_receivables(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  event_key text NOT NULL UNIQUE,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizer_receivable_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_receivable_adjustment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_financial_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organizer_receivable_adjustments,
  public.organizer_receivable_adjustment_allocations, public.organizer_financial_audit
  FROM PUBLIC, anon, authenticated;

-- A claim separa reserva e envio externo. Somente a transicao reservada->submitting
-- autoriza POST; retries retornam estado existente e nunca reabrem a submissao.
CREATE OR REPLACE FUNCTION public.begin_organizer_anticipation_submission(p_anticipation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_row public.organizer_anticipations%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'WALLET_SERVICE_ROLE_REQUIRED'; END IF;
  SELECT * INTO v_row FROM public.organizer_anticipations WHERE id=p_anticipation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WALLET_ANTICIPATION_NOT_FOUND'; END IF;
  IF v_row.status='reserved' THEN
    UPDATE public.organizer_anticipations SET status='submitting',submission_started_at=now(),updated_at=now()
      WHERE id=p_anticipation_id RETURNING * INTO v_row;
    RETURN jsonb_build_object('claimed',true,'status',v_row.status,'paymentId',v_row.payment_id,
      'providerId',v_row.provider_anticipation_id);
  END IF;
  RETURN jsonb_build_object('claimed',false,'status',v_row.status,'paymentId',v_row.payment_id,
    'providerId',v_row.provider_anticipation_id);
END; $$;

CREATE OR REPLACE FUNCTION public.update_organizer_anticipation(
  p_anticipation_id uuid, p_status text, p_quoted_fee numeric DEFAULT NULL,
  p_quoted_net_value numeric DEFAULT NULL, p_provider_id text DEFAULT NULL,
  p_provider_status text DEFAULT NULL, p_error_code text DEFAULT NULL,
  p_actual_fee numeric DEFAULT NULL, p_actual_net_value numeric DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_row public.organizer_anticipations%ROWTYPE; v_receivable public.organizer_receivables%ROWTYPE;
BEGIN
  IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'WALLET_SERVICE_ROLE_REQUIRED'; END IF;
  IF p_status NOT IN ('submitting','documentation_required','provider_pending','credited','failed','cancelled')
    THEN RAISE EXCEPTION 'WALLET_INVALID_STATUS'; END IF;
  SELECT * INTO v_row FROM public.organizer_anticipations WHERE id=p_anticipation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WALLET_ANTICIPATION_NOT_FOUND'; END IF;
  IF v_row.status IN ('credited','failed','cancelled') AND v_row.status<>p_status THEN
    RAISE EXCEPTION 'WALLET_ANTICIPATION_TERMINAL';
  END IF;
  IF v_row.status='reserved' AND p_status NOT IN ('submitting','documentation_required','failed','cancelled')
    THEN RAISE EXCEPTION 'WALLET_ANTICIPATION_INVALID_TRANSITION'; END IF;
  IF v_row.status='documentation_required' AND p_status NOT IN ('documentation_required','failed','cancelled')
    THEN RAISE EXCEPTION 'WALLET_ANTICIPATION_INVALID_TRANSITION'; END IF;
  IF v_row.status='submitting' AND p_status NOT IN ('provider_pending','credited','failed','documentation_required')
    THEN RAISE EXCEPTION 'WALLET_ANTICIPATION_INVALID_TRANSITION'; END IF;
  IF v_row.status='provider_pending' AND p_status NOT IN ('provider_pending','credited','failed')
    THEN RAISE EXCEPTION 'WALLET_ANTICIPATION_INVALID_TRANSITION'; END IF;
  IF p_status='credited' AND p_actual_net_value IS NULL AND v_row.actual_net_value IS NULL
    THEN RAISE EXCEPTION 'WALLET_ANTICIPATION_PROVIDER_AMOUNTS_REQUIRED'; END IF;
  IF p_status='credited' AND p_actual_fee IS NULL AND v_row.actual_fee IS NULL
    THEN RAISE EXCEPTION 'WALLET_ANTICIPATION_PROVIDER_AMOUNTS_REQUIRED'; END IF;
  IF p_status='failed' AND p_error_code IN ('provider_response_ambiguous','provider_response_requires_reconciliation',
      'provider_amounts_missing','provider_not_found_yet') THEN
    RAISE EXCEPTION 'WALLET_AMBIGUOUS_ANTICIPATION_CANNOT_FAIL';
  END IF;
  IF p_actual_fee IS NOT NULL AND p_actual_net_value IS NOT NULL THEN
    SELECT * INTO v_receivable FROM public.organizer_receivables WHERE id=v_row.receivable_id FOR UPDATE;
    IF p_actual_fee<0 OR p_actual_net_value<0 OR round(p_actual_fee+p_actual_net_value,2)>
      round(v_receivable.gross_amount-v_receivable.platform_discount,2) THEN
      RAISE EXCEPTION 'WALLET_ANTICIPATION_INVALID_PROVIDER_AMOUNT';
    END IF;
  END IF;
  UPDATE public.organizer_anticipations SET status=p_status,
    quoted_fee=COALESCE(p_quoted_fee,quoted_fee),quoted_net_value=COALESCE(p_quoted_net_value,quoted_net_value),
    actual_fee=COALESCE(p_actual_fee,actual_fee),actual_net_value=COALESCE(p_actual_net_value,actual_net_value),
    provider_anticipation_id=COALESCE(p_provider_id,provider_anticipation_id),
    provider_status=COALESCE(p_provider_status,provider_status),error_code=p_error_code,
    reconciled_at=CASE WHEN p_status IN ('credited','failed') THEN now() ELSE reconciled_at END,updated_at=now()
    WHERE id=p_anticipation_id;
  IF p_status='credited' THEN
    IF COALESCE(p_actual_fee,v_row.actual_fee) IS NULL OR COALESCE(p_actual_net_value,v_row.actual_net_value) IS NULL
      THEN RAISE EXCEPTION 'WALLET_ANTICIPATION_PROVIDER_AMOUNTS_REQUIRED'; END IF;
    UPDATE public.organizer_receivables SET
      anticipation_fee=COALESCE(p_actual_fee,v_row.actual_fee),
      net_amount=COALESCE(p_actual_net_value,v_row.actual_net_value),available_at=now(),updated_at=now()
      WHERE id=v_row.receivable_id AND anticipation_fee=0;
  END IF;
END; $$;

-- Registra estorno/chargeback uma vez, debita o saldo ainda livre e deixa
-- eventual diferenca como divida compensavel nos proximos recebiveis.
CREATE OR REPLACE FUNCTION public.record_organizer_receivable_adjustment(
  p_payment_id text,p_adjustment_type text,p_amount numeric,p_provider_event_id text,p_disputed boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_receivable public.organizer_receivables%ROWTYPE; v_adjustment uuid; v_remaining numeric;
  v_row record; v_take numeric; v_key text;
BEGIN
  IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'WALLET_SERVICE_ROLE_REQUIRED'; END IF;
  IF p_adjustment_type NOT IN ('refund','chargeback','dispute','reversal') OR p_amount<=0 THEN RAISE EXCEPTION 'WALLET_INVALID_ADJUSTMENT'; END IF;
  SELECT * INTO v_receivable FROM public.organizer_receivables WHERE payment_id=p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('found',false); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('organizer-wallet:'||v_receivable.organizer_id::text,0));
  SELECT id INTO v_adjustment FROM public.organizer_receivable_adjustments WHERE provider_event_id=p_provider_event_id;
  IF FOUND THEN RETURN jsonb_build_object('found',true,'duplicate',true,'id',v_adjustment); END IF;
  INSERT INTO public.organizer_receivable_adjustments(organizer_id,championship_id,receivable_id,payment_id,
    adjustment_type,amount,remaining_amount,provider_event_id,status)
    VALUES(v_receivable.organizer_id,v_receivable.championship_id,v_receivable.id,p_payment_id,p_adjustment_type,
      round(p_amount,2),round(p_amount,2),p_provider_event_id,CASE WHEN p_disputed THEN 'disputed' ELSE 'open' END)
    RETURNING id INTO v_adjustment;
  v_remaining:=round(p_amount,2);
  FOR v_row IN SELECT r.id, r.net_amount-COALESCE((SELECT sum(a.amount) FROM public.organizer_withdrawal_allocations a
      JOIN public.organizer_withdrawals w ON w.id=a.withdrawal_id
      WHERE a.receivable_id=r.id AND w.status IN ('reserved','submitting','provider_pending','paid')),0) AS free_amount
    FROM public.organizer_receivables r WHERE r.organizer_id=v_receivable.organizer_id AND r.status='active'
      AND r.available_at<=now() ORDER BY r.available_at,r.id FOR UPDATE OF r LOOP
    EXIT WHEN v_remaining<=0; v_take:=LEAST(v_remaining,GREATEST(0,v_row.free_amount));
    IF v_take>0 AND NOT p_disputed THEN
      INSERT INTO public.organizer_receivable_adjustment_allocations(adjustment_id,receivable_id,amount)
        VALUES(v_adjustment,v_row.id,v_take);
      -- Preserve net + discount + anticipation_fee = gross while reducing the
      -- organizer's receivable; any unpaid remainder stays as explicit debt.
      UPDATE public.organizer_receivables SET gross_amount=gross_amount-v_take,
        net_amount=net_amount-v_take,updated_at=now() WHERE id=v_row.id;
      v_remaining:=v_remaining-v_take;
    END IF;
  END LOOP;
  UPDATE public.organizer_receivable_adjustments SET remaining_amount=v_remaining,
    status=CASE WHEN p_disputed THEN 'disputed' WHEN v_remaining=0 THEN 'compensated'
      WHEN v_remaining<p_amount THEN 'partially_compensated' ELSE 'open' END,updated_at=now() WHERE id=v_adjustment;
  INSERT INTO public.organizer_financial_audit(organizer_id,championship_id,receivable_id,event_type,event_key,details)
    VALUES(v_receivable.organizer_id,v_receivable.championship_id,v_receivable.id,'receivable.'||p_adjustment_type,
      'adjustment:'||p_provider_event_id,jsonb_build_object('amount',round(p_amount,2),'debt',v_remaining,'disputed',p_disputed));
  RETURN jsonb_build_object('found',true,'duplicate',false,'id',v_adjustment,'debt',v_remaining,
    'organizerId',v_receivable.organizer_id,'championshipId',v_receivable.championship_id);
END; $$;

CREATE OR REPLACE FUNCTION public.reserve_organizer_withdrawal_receivables(
  p_championship_id uuid,p_receivable_ids uuid[],p_idempotency_key uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid:=auth.uid(); v_owner uuid; v_withdrawal uuid; v_ids uuid[]; v_expected integer;
  v_found integer:=0; v_amount numeric(12,2):=0; v_row record; v_debt numeric(12,2):=0;
  v_remaining numeric(12,2); v_take numeric(12,2); v_adj record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'WALLET_UNAUTHENTICATED'; END IF;
  SELECT ARRAY(SELECT DISTINCT id FROM unnest(p_receivable_ids) s(id) ORDER BY id) INTO v_ids;
  v_expected:=COALESCE(cardinality(v_ids),0);
  IF v_expected<1 OR v_expected>100 THEN RAISE EXCEPTION 'WALLET_INVALID_SELECTION'; END IF;
  SELECT organizador_id INTO v_owner FROM public.championships WHERE id=p_championship_id;
  IF v_owner IS DISTINCT FROM v_user THEN RAISE EXCEPTION 'WALLET_FORBIDDEN'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('organizer-wallet:'||v_user::text,0));
  SELECT id INTO v_withdrawal FROM public.organizer_withdrawals WHERE organizer_id=v_user AND idempotency_key=p_idempotency_key;
  IF FOUND THEN RETURN (SELECT jsonb_build_object('id',id,'amount',amount,'status',status) FROM public.organizer_withdrawals WHERE id=v_withdrawal); END IF;
  IF EXISTS(SELECT 1 FROM public.organizer_receivable_adjustments WHERE organizer_id=v_user AND status='disputed')
    THEN RAISE EXCEPTION 'WALLET_DISPUTE_HOLD'; END IF;
  IF EXISTS(SELECT 1 FROM public.organizer_anticipations WHERE organizer_id=v_user AND status IN ('submitting','provider_pending'))
    THEN RAISE EXCEPTION 'WALLET_RECONCILIATION_HOLD'; END IF;
  SELECT COALESCE(sum(remaining_amount),0) INTO v_debt FROM public.organizer_receivable_adjustments
    WHERE organizer_id=v_user AND remaining_amount>0 AND status<>'disputed';
  FOR v_row IN SELECT r.id,round(r.net_amount-COALESCE(s.amount,0),2) remaining FROM public.organizer_receivables r
    LEFT JOIN (SELECT a.receivable_id,sum(a.amount) amount FROM public.organizer_withdrawal_allocations a
      JOIN public.organizer_withdrawals w ON w.id=a.withdrawal_id WHERE w.status IN ('reserved','submitting','provider_pending','paid') GROUP BY a.receivable_id) s ON s.receivable_id=r.id
    WHERE r.id=ANY(v_ids) AND r.organizer_id=v_user AND r.championship_id=p_championship_id AND r.status='active'
      AND r.available_at<=now() AND r.net_amount-COALESCE(s.amount,0)>=0 ORDER BY r.id FOR UPDATE OF r LOOP
    v_found:=v_found+1; v_remaining:=v_row.remaining;
    FOR v_adj IN SELECT id,remaining_amount FROM public.organizer_receivable_adjustments
      WHERE organizer_id=v_user AND remaining_amount>0 AND status<>'disputed' ORDER BY created_at,id FOR UPDATE LOOP
      EXIT WHEN v_remaining<=0; v_take:=LEAST(v_remaining,v_adj.remaining_amount);
      INSERT INTO public.organizer_receivable_adjustment_allocations(adjustment_id,receivable_id,amount) VALUES(v_adj.id,v_row.id,v_take);
      UPDATE public.organizer_receivables SET gross_amount=gross_amount-v_take,
        net_amount=net_amount-v_take,updated_at=now() WHERE id=v_row.id;
      UPDATE public.organizer_receivable_adjustments SET remaining_amount=remaining_amount-v_take,
        status=CASE WHEN remaining_amount-v_take=0 THEN 'compensated' ELSE 'partially_compensated' END,updated_at=now() WHERE id=v_adj.id;
      v_remaining:=v_remaining-v_take; v_debt:=v_debt-v_take;
    END LOOP;
    IF v_remaining>0 THEN v_amount:=v_amount+v_remaining; END IF;
  END LOOP;
  IF v_found<>v_expected THEN RAISE EXCEPTION 'WALLET_RECEIVABLE_SELECTION_UNAVAILABLE'; END IF;
  IF EXISTS(SELECT 1 FROM public.organizer_receivable_adjustments WHERE organizer_id=v_user AND status='disputed')
    THEN RAISE EXCEPTION 'WALLET_DISPUTE_HOLD'; END IF;
  IF v_debt>0 THEN
    RETURN jsonb_build_object('id',NULL,'amount',0,'status','debt_remaining','debt',v_debt);
  END IF;
  IF v_amount<0.01 THEN
    RETURN jsonb_build_object('id',NULL,'amount',0,'status','debt_compensated','debt',0);
  END IF;
  INSERT INTO public.organizer_withdrawals(organizer_id,championship_id,amount,idempotency_key)
    VALUES(v_user,p_championship_id,v_amount,p_idempotency_key) RETURNING id INTO v_withdrawal;
  INSERT INTO public.organizer_withdrawal_allocations(withdrawal_id,receivable_id,amount)
    SELECT v_withdrawal,r.id,round(r.net_amount-COALESCE(s.amount,0),2) FROM public.organizer_receivables r
    LEFT JOIN (SELECT a.receivable_id,sum(a.amount) amount FROM public.organizer_withdrawal_allocations a
      JOIN public.organizer_withdrawals w ON w.id=a.withdrawal_id WHERE w.status IN ('reserved','submitting','provider_pending','paid') GROUP BY a.receivable_id) s ON s.receivable_id=r.id
    WHERE r.id=ANY(v_ids) AND r.organizer_id=v_user AND r.championship_id=p_championship_id AND r.status='active'
      AND r.available_at<=now() AND r.net_amount-COALESCE(s.amount,0)>0 ORDER BY r.id;
  RETURN jsonb_build_object('id',v_withdrawal,'amount',v_amount,'status','reserved');
END; $$;

-- Constrain legacy automatic settlement RPCs too: any delayed legacy caller
-- can only promote a due receivable; only manual wallet withdrawals transfer.
CREATE OR REPLACE FUNCTION public.claim_registration_payout_once(p_registration_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.registrations SET repasse_status='disponivel'
    WHERE id=p_registration_id AND repasse_status IN ('pendente','aguardando_liquidacao');
  RETURN false;
END; $$;
CREATE OR REPLACE FUNCTION public.claim_athlete_ticket_payout_once(p_ticket_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.athlete_tickets SET repasse_status='disponivel'
    WHERE id=p_ticket_id AND repasse_status IN ('pendente','aguardando_liquidacao');
  RETURN false;
END; $$;
CREATE OR REPLACE FUNCTION public.claim_spectator_ticket_payout_once(p_ticket_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.spectator_tickets SET repasse_status='disponivel'
    WHERE id=p_ticket_id AND repasse_status IN ('pendente','aguardando_liquidacao');
  RETURN false;
END; $$;

REVOKE ALL ON FUNCTION public.claim_registration_payout_once(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.claim_athlete_ticket_payout_once(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.claim_spectator_ticket_payout_once(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_registration_payout_once(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_athlete_ticket_payout_once(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_spectator_ticket_payout_once(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.begin_organizer_anticipation_submission(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.record_organizer_receivable_adjustment(text,text,numeric,text,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.update_organizer_anticipation(uuid,text,numeric,numeric,text,text,text,numeric,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_organizer_anticipation_submission(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_organizer_receivable_adjustment(text,text,numeric,text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_organizer_anticipation(uuid,text,numeric,numeric,text,text,text,numeric,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_organizer_withdrawal_receivables(uuid,uuid[],uuid) TO authenticated;

COMMIT;
NOTIFY pgrst,'reload schema';