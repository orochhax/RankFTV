-- ==============================================================================
-- Correção e Reconciliação Financeira: Abatimento da Taxa Elite para Todos os Ingressos
-- e Sincronização dos Recebíveis da Carteira do Organizador
-- ==============================================================================

-- 1. Garante que athlete_tickets e spectator_tickets possuem a coluna de auditoria elite_fee_coletada
ALTER TABLE public.athlete_tickets
  ADD COLUMN IF NOT EXISTS elite_fee_coletada numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.spectator_tickets
  ADD COLUMN IF NOT EXISTS elite_fee_coletada numeric(12,2) NOT NULL DEFAULT 0;

-- 2. Atualiza a função de proteção para permitir que o usuário postgres (Supabase SQL Editor),
-- o service_role e triggers internos do banco (pg_trigger_depth > 1) abatam a taxa Elite
-- sem disparar o erro P0001 de bloqueio do client.
CREATE OR REPLACE FUNCTION public.protect_championship_financial_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('role', true), '') IN ('service_role', 'postgres')
     OR CURRENT_USER = 'postgres'
     OR SESSION_USER = 'postgres'
     OR pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.is_elite IS DISTINCT FROM OLD.is_elite THEN
    RAISE EXCEPTION 'is_elite só pode ser alterado pelo fluxo de ativação Elite.';
  END IF;
  IF NEW.premium_fee_pendente IS DISTINCT FROM OLD.premium_fee_pendente THEN
    RAISE EXCEPTION 'premium_fee_pendente não pode ser alterado pelo client.';
  END IF;
  IF NEW.taxa_plataforma IS DISTINCT FROM OLD.taxa_plataforma THEN
    RAISE EXCEPTION 'taxa_plataforma não pode ser alterado pelo client.';
  END IF;
  IF NEW.is_vitrine IS DISTINCT FROM OLD.is_vitrine THEN
    RAISE EXCEPTION 'is_vitrine é decisão administrativa, não do organizador.';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Atualiza a função do gatilho register_organizer_receivable para abater
-- a taxa de adesão do Plano Elite (championships.premium_fee_pendente) de QUALQUER
-- tipo de venda paga (inscrição de dupla, ingresso de atleta avulso ou plateia).
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
  -- Trata estorno / chargeback
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

  -- Só processa quando a venda passa para 'pago'
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

  -- A taxa de adesão Elite pertence à plataforma e é abatida das vendas
  IF v_pending > 0 AND v_gross > 0 THEN
    v_discount := LEAST(v_pending, v_gross);
    UPDATE championships
       SET premium_fee_pendente = GREATEST(0, premium_fee_pendente - v_discount)
     WHERE id = v_championship_id;

    IF v_source_type = 'registration' THEN
      UPDATE registrations SET elite_fee_coletada = v_discount WHERE id = NEW.id;
    ELSIF v_source_type = 'athlete_ticket' THEN
      UPDATE athlete_tickets SET elite_fee_coletada = v_discount WHERE id = NEW.id;
    ELSIF v_source_type = 'spectator_ticket' THEN
      UPDATE spectator_tickets SET elite_fee_coletada = v_discount WHERE id = NEW.id;
    END IF;
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
  ) ON CONFLICT (source_type, source_id) DO UPDATE SET
    platform_discount = EXCLUDED.platform_discount,
    net_amount = EXCLUDED.net_amount,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- 4. RECONCILIAÇÃO E BACKFILL:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'protect_championship_financial_fields_trigger'
  ) THEN
    ALTER TABLE public.championships DISABLE TRIGGER protect_championship_financial_fields_trigger;
  END IF;
END $$;

DO $$
DECLARE
  v record;
  v_owner uuid;
  v_pending numeric(12,2);
  v_discount numeric(12,2);
BEGIN
  -- 4.1) Insere vendas pagas faltantes em organizer_receivables
  FOR v IN
    SELECT 'registration'::text AS source_type,
           r.id AS source_id,
           r.championship_id,
           r.asaas_payment_id AS payment_id,
           COALESCE(r.billing_type, 'CREDIT_CARD') AS billing_type,
           ROUND(GREATEST(0, COALESCE(r.valor, 0))::numeric, 2) AS gross_amount,
           r.repasse_data_prevista,
           r.created_at
      FROM registrations r
     WHERE r.status_pagamento = 'pago'
       AND NOT EXISTS (
         SELECT 1 FROM organizer_receivables x
          WHERE x.source_type = 'registration' AND x.source_id = r.id
       )
    UNION ALL
    SELECT 'athlete_ticket'::text AS source_type,
           t.id AS source_id,
           t.championship_id,
           t.asaas_payment_id AS payment_id,
           COALESCE(t.billing_type, 'CREDIT_CARD') AS billing_type,
           ROUND(GREATEST(0, COALESCE(t.valor, 0))::numeric, 2) AS gross_amount,
           t.repasse_data_prevista,
           t.created_at
      FROM athlete_tickets t
     WHERE t.status_pagamento = 'pago'
       AND NOT EXISTS (
         SELECT 1 FROM organizer_receivables x
          WHERE x.source_type = 'athlete_ticket' AND x.source_id = t.id
       )
    UNION ALL
    SELECT 'spectator_ticket'::text AS source_type,
           s.id AS source_id,
           s.championship_id,
           s.asaas_payment_id AS payment_id,
           COALESCE(s.billing_type, 'CREDIT_CARD') AS billing_type,
           ROUND(GREATEST(0, COALESCE(s.valor, 0))::numeric, 2) AS gross_amount,
           s.repasse_data_prevista,
           s.created_at
      FROM spectator_tickets s
     WHERE s.status_pagamento = 'pago'
       AND NOT EXISTS (
         SELECT 1 FROM organizer_receivables x
          WHERE x.source_type = 'spectator_ticket' AND x.source_id = s.id
       )
    ORDER BY created_at ASC
  LOOP
    SELECT organizador_id, COALESCE(premium_fee_pendente, 0)
      INTO v_owner, v_pending
      FROM championships
     WHERE id = v.championship_id
       FOR UPDATE;

    IF v_owner IS NOT NULL THEN
      v_discount := LEAST(GREATEST(0, v_pending), v.gross_amount);

      IF v_discount > 0 THEN
        UPDATE championships
           SET premium_fee_pendente = GREATEST(0, premium_fee_pendente - v_discount)
         WHERE id = v.championship_id;

        IF v.source_type = 'registration' THEN
          UPDATE registrations SET elite_fee_coletada = v_discount WHERE id = v.source_id;
        ELSIF v.source_type = 'athlete_ticket' THEN
          UPDATE athlete_tickets SET elite_fee_coletada = v_discount WHERE id = v.source_id;
        ELSIF v.source_type = 'spectator_ticket' THEN
          UPDATE spectator_tickets SET elite_fee_coletada = v_discount WHERE id = v.source_id;
        END IF;
      END IF;

      INSERT INTO organizer_receivables (
        organizer_id, championship_id, source_type, source_id, payment_id,
        billing_type, gross_amount, platform_discount, net_amount, available_at
      ) VALUES (
        v_owner, v.championship_id, v.source_type, v.source_id, v.payment_id,
        v.billing_type, v.gross_amount, v_discount, v.gross_amount - v_discount,
        COALESCE(v.repasse_data_prevista,
          CASE v.billing_type
            WHEN 'PIX' THEN now()
            WHEN 'DEBIT_CARD' THEN now() + interval '3 days'
            ELSE now() + interval '32 days'
          END)
      ) ON CONFLICT (source_type, source_id) DO NOTHING;
    END IF;
  END LOOP;

  -- 4.2) Para recebíveis já existentes que foram inseridos com platform_discount = 0
  -- mas o campeonato ainda possuía premium_fee_pendente > 0:
  FOR v IN
    SELECT r.id, r.championship_id, r.gross_amount, r.source_type, r.source_id
      FROM organizer_receivables r
      JOIN championships c ON c.id = r.championship_id
     WHERE c.premium_fee_pendente > 0
       AND r.platform_discount = 0
       AND r.status = 'active'
     ORDER BY r.created_at ASC
  LOOP
    SELECT COALESCE(premium_fee_pendente, 0)
      INTO v_pending
      FROM championships
     WHERE id = v.championship_id
       FOR UPDATE;

    IF v_pending > 0 THEN
      v_discount := LEAST(v_pending, v.gross_amount);

      UPDATE championships
         SET premium_fee_pendente = GREATEST(0, premium_fee_pendente - v_discount)
       WHERE id = v.championship_id;

      UPDATE organizer_receivables
         SET platform_discount = v_discount,
             net_amount = gross_amount - v_discount,
             updated_at = now()
       WHERE id = v.id;

      IF v.source_type = 'registration' THEN
        UPDATE registrations SET elite_fee_coletada = v_discount WHERE id = v.source_id;
      ELSIF v.source_type = 'athlete_ticket' THEN
        UPDATE athlete_tickets SET elite_fee_coletada = v_discount WHERE id = v.source_id;
      ELSIF v.source_type = 'spectator_ticket' THEN
        UPDATE spectator_tickets SET elite_fee_coletada = v_discount WHERE id = v.source_id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Reativa o gatilho de proteção
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'protect_championship_financial_fields_trigger'
  ) THEN
    ALTER TABLE public.championships ENABLE TRIGGER protect_championship_financial_fields_trigger;
  END IF;
END $$;
