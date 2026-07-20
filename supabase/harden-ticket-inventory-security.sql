-- =============================================================
-- RANKFTV — Hardening: estoque de ingresso de plateia (max_quantidade) e
-- liberação de pedidos Pix pendentes abandonados.
--
-- spectator_ticket_types.max_quantidade existe desde
-- add-spectator-type-quantity.sql mas nunca foi aplicado em código nenhum —
-- um tipo "VIP, só 50" vendia sem limite. Segue o mesmo padrão de
-- claim/release atômico já usado pra pricing_tiers/cupons.
--
-- Idempotente — pode rodar mais de uma vez.
-- =============================================================

ALTER TABLE spectator_ticket_types ADD COLUMN IF NOT EXISTS vendidos int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION claim_ticket_type_quantity(p_type_id uuid, p_qty int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max      int;
  v_vendidos int;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN RETURN false; END IF;

  SELECT max_quantidade, vendidos INTO v_max, v_vendidos
    FROM spectator_ticket_types
    WHERE id = p_type_id
    FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;
  IF v_max IS NOT NULL AND v_vendidos + p_qty > v_max THEN RETURN false; END IF;

  UPDATE spectator_ticket_types SET vendidos = vendidos + p_qty WHERE id = p_type_id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION release_ticket_type_quantity(p_type_id uuid, p_qty int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN RETURN; END IF;
  UPDATE spectator_ticket_types SET vendidos = GREATEST(0, vendidos - p_qty) WHERE id = p_type_id;
END $$;

REVOKE ALL ON FUNCTION claim_ticket_type_quantity(uuid, int)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_ticket_type_quantity(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_ticket_type_quantity(uuid, int)   TO service_role;
GRANT EXECUTE ON FUNCTION release_ticket_type_quantity(uuid, int) TO service_role;

-- ── Estado explícito de pedido expirado ─────────────────────────────────
-- 'expirado': Pix pendente que ninguém pagou dentro da janela — devolve
-- vaga/lote/cupom (ver cron em app/api/cron/repasse-liquidacao/route.ts).
-- Mantém o registro (não apaga) pra auditoria; só marca como não-mais-válido.

ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_status_pagamento_check;
ALTER TABLE registrations ADD CONSTRAINT registrations_status_pagamento_check
  CHECK (status_pagamento IN ('pendente', 'pago', 'estornado', 'expirado'));

ALTER TABLE spectator_tickets DROP CONSTRAINT IF EXISTS spectator_tickets_status_pagamento_check;
ALTER TABLE spectator_tickets ADD CONSTRAINT spectator_tickets_status_pagamento_check
  CHECK (status_pagamento IN ('pendente', 'pago', 'estornado', 'expirado'));

ALTER TABLE athlete_tickets DROP CONSTRAINT IF EXISTS athlete_tickets_status_pagamento_check;
ALTER TABLE athlete_tickets ADD CONSTRAINT athlete_tickets_status_pagamento_check
  CHECK (status_pagamento IN ('pendente', 'pago', 'estornado', 'expirado'));

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'harden-ticket-inventory-security done';
