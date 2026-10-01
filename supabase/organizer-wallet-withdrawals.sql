-- Carteira individual do organizador, saques sob demanda e reserva atomica.
-- Execute uma vez no SQL Editor. As funcoes sao idempotentes onde importa.
BEGIN;

CREATE TABLE IF NOT EXISTS public.organizer_receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  championship_id uuid NOT NULL REFERENCES public.championships(id) ON DELETE RESTRICT,
  source_type text NOT NULL CHECK (source_type IN ('registration','athlete_ticket','spectator_ticket')),
  source_id uuid NOT NULL,
  payment_id text,
  billing_type text,
  gross_amount numeric(12,2) NOT NULL CHECK (gross_amount >= 0),
  platform_discount numeric(12,2) NOT NULL DEFAULT 0 CHECK (platform_discount >= 0),
  anticipation_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (anticipation_fee >= 0),
  net_amount numeric(12,2) NOT NULL CHECK (net_amount >= 0),
  available_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','refunded','disputed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id),
  CHECK (net_amount + platform_discount + anticipation_fee = gross_amount)
);

CREATE TABLE IF NOT EXISTS public.organizer_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  championship_id uuid NOT NULL REFERENCES public.championships(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved','submitting','provider_pending','paid','failed','cancelled')),
  idempotency_key uuid NOT NULL,
  provider_transfer_id text,
  provider_status text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (organizer_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.organizer_withdrawal_allocations (
  withdrawal_id uuid NOT NULL REFERENCES public.organizer_withdrawals(id) ON DELETE RESTRICT,
  receivable_id uuid NOT NULL REFERENCES public.organizer_receivables(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (withdrawal_id, receivable_id)
);

CREATE TABLE IF NOT EXISTS public.organizer_anticipations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  championship_id uuid NOT NULL REFERENCES public.championships(id) ON DELETE RESTRICT,
  receivable_id uuid NOT NULL REFERENCES public.organizer_receivables(id) ON DELETE RESTRICT,
  payment_id text NOT NULL,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','documentation_required','provider_pending','credited','failed','cancelled')),
  quoted_fee numeric(12,2) CHECK (quoted_fee IS NULL OR quoted_fee >= 0),
  quoted_net_value numeric(12,2) CHECK (quoted_net_value IS NULL OR quoted_net_value >= 0),
  provider_anticipation_id text,
  provider_status text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS organizer_anticipations_active_receivable_uidx
  ON public.organizer_anticipations(receivable_id)
  WHERE status IN ('reserved','documentation_required','provider_pending','credited');

CREATE INDEX IF NOT EXISTS organizer_receivables_wallet_idx
  ON public.organizer_receivables (organizer_id, championship_id, available_at, id)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS organizer_withdrawals_owner_idx
  ON public.organizer_withdrawals (organizer_id, championship_id, created_at DESC);
CREATE INDEX IF NOT EXISTS organizer_withdrawal_allocations_receivable_idx
  ON public.organizer_withdrawal_allocations (receivable_id);

-- O status "disponivel" significa que o valor pertence ao organizador, mas
-- ainda nao foi reservado nem transferido. O cron apenas promove o saldo.
ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_repasse_status_check;
ALTER TABLE public.registrations ADD CONSTRAINT registrations_repasse_status_check CHECK (
  repasse_status IN ('pendente','processando','aguardando_liquidacao','disponivel','repassado','estornado','erro')
);
ALTER TABLE public.athlete_tickets DROP CONSTRAINT IF EXISTS athlete_tickets_repasse_status_check;
ALTER TABLE public.athlete_tickets ADD CONSTRAINT athlete_tickets_repasse_status_check CHECK (
  repasse_status IN ('pendente','processando','aguardando_liquidacao','disponivel','repassado','estornado')
);
ALTER TABLE public.spectator_tickets DROP CONSTRAINT IF EXISTS spectator_tickets_repasse_status_check;
ALTER TABLE public.spectator_tickets ADD CONSTRAINT spectator_tickets_repasse_status_check CHECK (
  repasse_status IN ('pendente','processando','aguardando_liquidacao','disponivel','repassado','estornado','erro')
);

ALTER TABLE public.organizer_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_withdrawal_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_anticipations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizer_receivables_select_own ON public.organizer_receivables;
CREATE POLICY organizer_receivables_select_own ON public.organizer_receivables
  FOR SELECT TO authenticated
  USING (organizer_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS organizer_withdrawals_select_own ON public.organizer_withdrawals;
CREATE POLICY organizer_withdrawals_select_own ON public.organizer_withdrawals
  FOR SELECT TO authenticated
  USING (organizer_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS organizer_withdrawal_allocations_select_own ON public.organizer_withdrawal_allocations;
CREATE POLICY organizer_withdrawal_allocations_select_own ON public.organizer_withdrawal_allocations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizer_withdrawals w
    WHERE w.id = withdrawal_id AND w.organizer_id = (SELECT auth.uid())
  ));
DROP POLICY IF EXISTS organizer_anticipations_select_own ON public.organizer_anticipations;
CREATE POLICY organizer_anticipations_select_own ON public.organizer_anticipations
  FOR SELECT TO authenticated USING (organizer_id=(SELECT auth.uid()));

-- Nenhuma escrita financeira e permitida diretamente pelo navegador.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.organizer_receivables, public.organizer_withdrawals,
     public.organizer_withdrawal_allocations
     , public.organizer_anticipations
  FROM PUBLIC, anon, authenticated;
GRANT SELECT (id,organizer_id,championship_id,source_type,source_id,billing_type,
  gross_amount,platform_discount,anticipation_fee,net_amount,available_at,status,
  created_at,updated_at) ON public.organizer_receivables TO authenticated;
GRANT SELECT (id,organizer_id,championship_id,amount,status,created_at,updated_at,
  completed_at) ON public.organizer_withdrawals TO authenticated;
GRANT SELECT (withdrawal_id,receivable_id,amount,created_at)
  ON public.organizer_withdrawal_allocations TO authenticated;
GRANT SELECT (id,organizer_id,championship_id,receivable_id,status,quoted_fee,
  quoted_net_value,created_at,updated_at) ON public.organizer_anticipations TO authenticated;
GRANT SELECT ON public.organizer_receivables,public.organizer_withdrawals,
  public.organizer_withdrawal_allocations,public.organizer_anticipations TO service_role;

CREATE OR REPLACE FUNCTION public.register_organizer_receivable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_championship_id uuid;
  v_organizer_id uuid;
  v_gross numeric(12,2);
  v_discount numeric(12,2) := 0;
  v_available_at timestamptz;
  v_billing text;
  v_payment_id text;
  v_source_type text;
  v_pending numeric(12,2) := 0;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status_pagamento IS DISTINCT FROM OLD.status_pagamento
     AND NEW.status_pagamento IN ('estornado','reembolsado','chargeback') THEN
    UPDATE organizer_receivables
       SET status = CASE WHEN EXISTS (
             SELECT 1
             FROM organizer_withdrawal_allocations a
             JOIN organizer_withdrawals w ON w.id = a.withdrawal_id
             WHERE a.receivable_id = organizer_receivables.id
               AND w.status IN ('submitting','provider_pending','paid')
           ) THEN 'disputed' ELSE 'refunded' END,
           updated_at = now()
     WHERE source_type = CASE TG_TABLE_NAME
       WHEN 'registrations' THEN 'registration'
       WHEN 'athlete_tickets' THEN 'athlete_ticket'
       ELSE 'spectator_ticket' END
       AND source_id = NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.status_pagamento <> 'pago'
     OR (TG_OP = 'UPDATE' AND OLD.status_pagamento = 'pago') THEN
    RETURN NEW;
  END IF;

  v_source_type := CASE TG_TABLE_NAME
    WHEN 'registrations' THEN 'registration'
    WHEN 'athlete_tickets' THEN 'athlete_ticket'
    WHEN 'spectator_tickets' THEN 'spectator_ticket'
    ELSE NULL END;
  IF v_source_type IS NULL THEN RETURN NEW; END IF;

  v_championship_id := NEW.championship_id;
  v_gross := ROUND(GREATEST(0, COALESCE(NEW.valor, 0))::numeric, 2);
  v_billing := COALESCE(NEW.billing_type, 'CREDIT_CARD');
  v_payment_id := NEW.asaas_payment_id;

  SELECT organizador_id, COALESCE(premium_fee_pendente, 0)
    INTO v_organizer_id, v_pending
    FROM championships
   WHERE id = v_championship_id
   FOR UPDATE;
  IF v_organizer_id IS NULL THEN RAISE EXCEPTION 'WALLET_CHAMPIONSHIP_NOT_FOUND'; END IF;

  -- A adesao Elite pertence a plataforma e nunca entra no saldo sacavel.
  IF v_source_type = 'registration' AND v_pending > 0 THEN
    v_discount := LEAST(v_pending, v_gross);
    UPDATE championships
       SET premium_fee_pendente = GREATEST(0, premium_fee_pendente - v_discount)
     WHERE id = v_championship_id;
    UPDATE registrations SET elite_fee_coletada = v_discount WHERE id = NEW.id;
  END IF;

  v_available_at := COALESCE(NEW.repasse_data_prevista,
    CASE v_billing
      WHEN 'PIX' THEN now()
      WHEN 'DEBIT_CARD' THEN now() + interval '3 days'
      ELSE now() + interval '32 days'
    END);

  INSERT INTO organizer_receivables (
    organizer_id, championship_id, source_type, source_id, payment_id,
    billing_type, gross_amount, platform_discount, net_amount, available_at
  ) VALUES (
    v_organizer_id, v_championship_id, v_source_type, NEW.id, v_payment_id,
    v_billing, v_gross, v_discount, v_gross - v_discount, v_available_at
  ) ON CONFLICT (source_type, source_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS registrations_wallet_receivable ON public.registrations;
CREATE TRIGGER registrations_wallet_receivable
AFTER INSERT OR UPDATE OF status_pagamento ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.register_organizer_receivable();
DROP TRIGGER IF EXISTS athlete_tickets_wallet_receivable ON public.athlete_tickets;
CREATE TRIGGER athlete_tickets_wallet_receivable
AFTER INSERT OR UPDATE OF status_pagamento ON public.athlete_tickets
FOR EACH ROW EXECUTE FUNCTION public.register_organizer_receivable();
DROP TRIGGER IF EXISTS spectator_tickets_wallet_receivable ON public.spectator_tickets;
CREATE TRIGGER spectator_tickets_wallet_receivable
AFTER INSERT OR UPDATE OF status_pagamento ON public.spectator_tickets
FOR EACH ROW EXECUTE FUNCTION public.register_organizer_receivable();

-- Migra somente valores ainda nao repassados. O desconto Elite e reclamado
-- sob lock, exatamente uma vez, antes de o recebivel ficar sacavel.
DO $$
DECLARE v record; v_owner uuid; v_pending numeric; v_discount numeric;
BEGIN
  FOR v IN
    SELECT 'registration'::text source_type, r.id source_id, r.championship_id,
           r.asaas_payment_id payment_id, r.billing_type, r.valor gross_amount,
           r.repasse_data_prevista
    FROM registrations r
    WHERE r.status_pagamento='pago' AND r.repasse_status IN ('pendente','aguardando_liquidacao')
      AND NOT EXISTS (SELECT 1 FROM organizer_receivables x WHERE x.source_type='registration' AND x.source_id=r.id)
    ORDER BY r.created_at, r.id
  LOOP
    SELECT organizador_id, COALESCE(premium_fee_pendente,0) INTO v_owner,v_pending
      FROM championships WHERE id=v.championship_id FOR UPDATE;
    v_discount := LEAST(GREATEST(0,v_pending), GREATEST(0,COALESCE(v.gross_amount,0)));
    IF v_discount > 0 THEN
      UPDATE championships SET premium_fee_pendente=GREATEST(0,premium_fee_pendente-v_discount) WHERE id=v.championship_id;
      UPDATE registrations SET elite_fee_coletada=v_discount WHERE id=v.source_id;
    END IF;
    INSERT INTO organizer_receivables(organizer_id,championship_id,source_type,source_id,payment_id,billing_type,gross_amount,platform_discount,net_amount,available_at)
    VALUES(v_owner,v.championship_id,v.source_type,v.source_id,v.payment_id,v.billing_type,
      ROUND(COALESCE(v.gross_amount,0)::numeric,2),v_discount,
      ROUND(COALESCE(v.gross_amount,0)::numeric,2)-v_discount,
      COALESCE(v.repasse_data_prevista,CASE WHEN v.billing_type='PIX' THEN now() WHEN v.billing_type='DEBIT_CARD' THEN now()+interval '3 days' ELSE now()+interval '32 days' END));
  END LOOP;

  INSERT INTO organizer_receivables(organizer_id,championship_id,source_type,source_id,payment_id,billing_type,gross_amount,platform_discount,net_amount,available_at)
  SELECT c.organizador_id,t.championship_id,'athlete_ticket',t.id,t.asaas_payment_id,t.billing_type,
    ROUND(COALESCE(t.valor,0)::numeric,2),0,ROUND(COALESCE(t.valor,0)::numeric,2),
    COALESCE(t.repasse_data_prevista,CASE WHEN t.billing_type='PIX' THEN now() WHEN t.billing_type='DEBIT_CARD' THEN now()+interval '3 days' ELSE now()+interval '32 days' END)
  FROM athlete_tickets t JOIN championships c ON c.id=t.championship_id
  WHERE t.status_pagamento='pago' AND t.repasse_status IN ('pendente','aguardando_liquidacao')
  ON CONFLICT(source_type,source_id) DO NOTHING;

  INSERT INTO organizer_receivables(organizer_id,championship_id,source_type,source_id,payment_id,billing_type,gross_amount,platform_discount,net_amount,available_at)
  SELECT c.organizador_id,t.championship_id,'spectator_ticket',t.id,t.asaas_payment_id,t.billing_type,
    ROUND(COALESCE(t.valor,0)::numeric,2),0,ROUND(COALESCE(t.valor,0)::numeric,2),
    COALESCE(t.repasse_data_prevista,CASE WHEN t.billing_type='PIX' THEN now() WHEN t.billing_type='DEBIT_CARD' THEN now()+interval '3 days' ELSE now()+interval '32 days' END)
  FROM spectator_tickets t JOIN championships c ON c.id=t.championship_id
  WHERE t.status_pagamento='pago' AND t.repasse_status IN ('pendente','aguardando_liquidacao')
  ON CONFLICT(source_type,source_id) DO NOTHING;
END $$;

UPDATE registrations SET repasse_status='disponivel'
 WHERE status_pagamento='pago' AND repasse_status IN ('pendente','aguardando_liquidacao')
   AND (billing_type='PIX' OR repasse_data_prevista<=now());
UPDATE athlete_tickets SET repasse_status='disponivel'
 WHERE status_pagamento='pago' AND repasse_status IN ('pendente','aguardando_liquidacao')
   AND (billing_type='PIX' OR repasse_data_prevista<=now());
UPDATE spectator_tickets SET repasse_status='disponivel'
 WHERE status_pagamento='pago' AND repasse_status IN ('pendente','aguardando_liquidacao')
   AND (billing_type='PIX' OR repasse_data_prevista<=now());

CREATE OR REPLACE FUNCTION public.organizer_wallet_snapshot(p_championship_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE v_user uuid := auth.uid(); v_owner uuid; v_result jsonb;
BEGIN
  SELECT organizador_id INTO v_owner FROM championships WHERE id = p_championship_id;
  IF v_user IS NULL OR v_owner IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'WALLET_FORBIDDEN';
  END IF;

  WITH spent AS (
    SELECT a.receivable_id, SUM(a.amount) amount
    FROM organizer_withdrawal_allocations a
    JOIN organizer_withdrawals w ON w.id = a.withdrawal_id
    WHERE w.status IN ('reserved','submitting','provider_pending','paid')
    GROUP BY a.receivable_id
  ), balances AS (
    SELECT r.*, GREATEST(0, r.net_amount - COALESCE(s.amount, 0)) remaining
    FROM organizer_receivables r LEFT JOIN spent s ON s.receivable_id = r.id
    WHERE r.organizer_id = v_user AND r.championship_id = p_championship_id
      AND r.status = 'active'
  ), schedule AS (
    SELECT available_at::date release_date, SUM(remaining) amount
    FROM balances WHERE remaining > 0 AND available_at > now()
    GROUP BY available_at::date ORDER BY release_date
  )
  SELECT jsonb_build_object(
    'totalNet', COALESCE((SELECT SUM(remaining) FROM balances), 0)
      + COALESCE((SELECT SUM(amount) FROM organizer_withdrawals WHERE organizer_id=v_user AND championship_id=p_championship_id AND status IN ('reserved','submitting','provider_pending')), 0),
    'available', COALESCE((SELECT SUM(remaining) FROM balances WHERE available_at <= now()), 0),
    'pending', COALESCE((SELECT SUM(remaining) FROM balances WHERE available_at > now()), 0),
    'reserved', COALESCE((SELECT SUM(amount) FROM organizer_withdrawals WHERE organizer_id=v_user AND championship_id=p_championship_id AND status IN ('reserved','submitting','provider_pending')), 0),
    'withdrawn', COALESCE((SELECT SUM(amount) FROM organizer_withdrawals WHERE organizer_id=v_user AND championship_id=p_championship_id AND status='paid'), 0),
    'schedule', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', release_date, 'amount', amount)) FROM schedule), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_organizer_withdrawal(
  p_championship_id uuid,
  p_amount numeric,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid(); v_owner uuid; v_withdrawal uuid;
  v_needed numeric(12,2); v_take numeric(12,2); v_row record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'WALLET_UNAUTHENTICATED'; END IF;
  IF p_amount IS NULL OR ROUND(p_amount,2) < 0.01 THEN RAISE EXCEPTION 'WALLET_INVALID_AMOUNT'; END IF;
  SELECT organizador_id INTO v_owner FROM championships WHERE id=p_championship_id;
  IF v_owner IS DISTINCT FROM v_user THEN RAISE EXCEPTION 'WALLET_FORBIDDEN'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('organizer-wallet:' || v_user::text, 0));
  SELECT id INTO v_withdrawal FROM organizer_withdrawals
   WHERE organizer_id=v_user AND idempotency_key=p_idempotency_key;
  IF FOUND THEN
    RETURN (SELECT jsonb_build_object('id',id,'amount',amount,'status',status) FROM organizer_withdrawals WHERE id=v_withdrawal);
  END IF;

  v_needed := ROUND(p_amount,2);
  INSERT INTO organizer_withdrawals(organizer_id,championship_id,amount,idempotency_key)
  VALUES(v_user,p_championship_id,v_needed,p_idempotency_key) RETURNING id INTO v_withdrawal;

  FOR v_row IN
    WITH spent AS (
      SELECT a.receivable_id, SUM(a.amount) amount
      FROM organizer_withdrawal_allocations a
      JOIN organizer_withdrawals w ON w.id=a.withdrawal_id
      WHERE w.status IN ('reserved','submitting','provider_pending','paid')
      GROUP BY a.receivable_id
    )
    SELECT r.id, r.net_amount-COALESCE(s.amount,0) remaining
    FROM organizer_receivables r LEFT JOIN spent s ON s.receivable_id=r.id
    WHERE r.organizer_id=v_user AND r.championship_id=p_championship_id
      AND r.status='active' AND r.available_at<=now()
      AND r.net_amount-COALESCE(s.amount,0)>0
    ORDER BY r.available_at,r.id FOR UPDATE OF r
  LOOP
    EXIT WHEN v_needed <= 0;
    v_take := LEAST(v_needed,v_row.remaining);
    INSERT INTO organizer_withdrawal_allocations(withdrawal_id,receivable_id,amount)
    VALUES(v_withdrawal,v_row.id,v_take);
    v_needed := v_needed-v_take;
  END LOOP;

  IF v_needed > 0 THEN RAISE EXCEPTION 'WALLET_INSUFFICIENT_AVAILABLE_BALANCE'; END IF;
  RETURN jsonb_build_object('id',v_withdrawal,'amount',ROUND(p_amount,2),'status','reserved');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_organizer_withdrawal(
  p_withdrawal_id uuid, p_status text, p_provider_transfer_id text DEFAULT NULL,
  p_provider_status text DEFAULT NULL, p_error_code text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_current text;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'WALLET_SERVICE_ROLE_REQUIRED'; END IF;
  IF p_status NOT IN ('submitting','provider_pending','paid','failed','cancelled') THEN
    RAISE EXCEPTION 'WALLET_INVALID_STATUS';
  END IF;
  SELECT status INTO v_current FROM organizer_withdrawals WHERE id=p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WALLET_WITHDRAWAL_NOT_FOUND'; END IF;
  IF v_current=p_status THEN
    UPDATE organizer_withdrawals SET provider_transfer_id=COALESCE(p_provider_transfer_id,provider_transfer_id),
      provider_status=COALESCE(p_provider_status,provider_status),updated_at=now() WHERE id=p_withdrawal_id;
    RETURN;
  END IF;
  IF NOT ((v_current='reserved' AND p_status IN ('submitting','failed','cancelled'))
       OR (v_current='submitting' AND p_status IN ('provider_pending','paid','failed'))
       OR (v_current='provider_pending' AND p_status IN ('paid','failed'))) THEN
    RAISE EXCEPTION 'WALLET_INVALID_TRANSITION';
  END IF;
  UPDATE organizer_withdrawals SET status=p_status,
    provider_transfer_id=COALESCE(p_provider_transfer_id,provider_transfer_id),
    provider_status=COALESCE(p_provider_status,provider_status), error_code=p_error_code,
    updated_at=now(), completed_at=CASE WHEN p_status IN ('paid','failed','cancelled') THEN now() ELSE NULL END
  WHERE id=p_withdrawal_id;
END; $$;

CREATE OR REPLACE FUNCTION public.begin_organizer_withdrawal_submission(p_withdrawal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_status text;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'WALLET_SERVICE_ROLE_REQUIRED'; END IF;
  SELECT status INTO v_status FROM organizer_withdrawals WHERE id=p_withdrawal_id FOR UPDATE;
  IF v_status <> 'reserved' THEN RAISE EXCEPTION 'WALLET_WITHDRAWAL_NOT_RESERVED'; END IF;
  IF EXISTS (
    SELECT 1 FROM organizer_withdrawal_allocations a
    JOIN organizer_receivables r ON r.id=a.receivable_id
    WHERE a.withdrawal_id=p_withdrawal_id AND r.status <> 'active'
  ) THEN
    RAISE EXCEPTION 'WALLET_RECEIVABLE_UNAVAILABLE';
  END IF;
  UPDATE organizer_withdrawals SET status='submitting',updated_at=now() WHERE id=p_withdrawal_id;
END; $$;

CREATE OR REPLACE FUNCTION public.reserve_organizer_anticipation(p_receivable_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid:=auth.uid(); v_row organizer_receivables%ROWTYPE; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'WALLET_UNAUTHENTICATED'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('organizer-wallet:'||v_user::text,0));
  SELECT * INTO v_row FROM organizer_receivables WHERE id=p_receivable_id FOR UPDATE;
  IF NOT FOUND OR v_row.organizer_id IS DISTINCT FROM v_user THEN RAISE EXCEPTION 'WALLET_FORBIDDEN'; END IF;
  IF v_row.status<>'active' OR v_row.available_at<=now() OR NULLIF(v_row.payment_id,'') IS NULL THEN
    RAISE EXCEPTION 'WALLET_NOT_ANTICIPATABLE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM organizer_withdrawal_allocations a JOIN organizer_withdrawals w ON w.id=a.withdrawal_id
    WHERE a.receivable_id=v_row.id AND w.status IN ('reserved','submitting','provider_pending','paid')
  ) THEN RAISE EXCEPTION 'WALLET_RECEIVABLE_ALREADY_ALLOCATED'; END IF;
  SELECT id INTO v_id FROM organizer_anticipations
   WHERE receivable_id=v_row.id AND status IN ('reserved','documentation_required','provider_pending','credited');
  IF FOUND THEN
    RETURN jsonb_build_object('id',v_id,'paymentId',v_row.payment_id,'amount',v_row.net_amount);
  END IF;
  INSERT INTO organizer_anticipations(organizer_id,championship_id,receivable_id,payment_id)
  VALUES(v_user,v_row.championship_id,v_row.id,v_row.payment_id) RETURNING id INTO v_id;
  RETURN jsonb_build_object('id',v_id,'paymentId',v_row.payment_id,'amount',v_row.net_amount);
END; $$;

CREATE OR REPLACE FUNCTION public.update_organizer_anticipation(
  p_anticipation_id uuid, p_status text, p_quoted_fee numeric DEFAULT NULL,
  p_quoted_net_value numeric DEFAULT NULL, p_provider_id text DEFAULT NULL,
  p_provider_status text DEFAULT NULL, p_error_code text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_receivable uuid; v_fee numeric;
BEGIN
  IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'WALLET_SERVICE_ROLE_REQUIRED'; END IF;
  IF p_status NOT IN ('documentation_required','provider_pending','credited','failed','cancelled') THEN RAISE EXCEPTION 'WALLET_INVALID_STATUS'; END IF;
  SELECT receivable_id INTO v_receivable FROM organizer_anticipations WHERE id=p_anticipation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WALLET_ANTICIPATION_NOT_FOUND'; END IF;
  UPDATE organizer_anticipations SET status=p_status,
    quoted_fee=COALESCE(p_quoted_fee,quoted_fee), quoted_net_value=COALESCE(p_quoted_net_value,quoted_net_value),
    provider_anticipation_id=COALESCE(p_provider_id,provider_anticipation_id),
    provider_status=COALESCE(p_provider_status,provider_status), error_code=p_error_code,updated_at=now()
  WHERE id=p_anticipation_id;
  IF p_status='credited' THEN
    SELECT LEAST(COALESCE(a.quoted_fee,0),GREATEST(0,r.gross_amount-r.platform_discount)) INTO v_fee
      FROM organizer_anticipations a JOIN organizer_receivables r ON r.id=a.receivable_id
      WHERE a.id=p_anticipation_id;
    UPDATE organizer_receivables SET anticipation_fee=v_fee,
      net_amount=GREATEST(0,gross_amount-platform_discount-v_fee),available_at=now(),updated_at=now()
    WHERE id=v_receivable AND anticipation_fee=0;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.register_organizer_receivable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.organizer_wallet_snapshot(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reserve_organizer_withdrawal(uuid,numeric,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_organizer_withdrawal(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.begin_organizer_withdrawal_submission(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_organizer_anticipation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_organizer_anticipation(uuid,text,numeric,numeric,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.organizer_wallet_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_organizer_withdrawal(uuid,numeric,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_organizer_withdrawal(uuid,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.begin_organizer_withdrawal_submission(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_organizer_anticipation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_organizer_anticipation(uuid,text,numeric,numeric,text,text,text) TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
