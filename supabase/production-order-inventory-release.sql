-- RankFTV - exactly-once release for registration and athlete-ticket
-- inventory. Spectator orders are handled by production-spectator-ticket-items.

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS inventory_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS coupon_released_at timestamptz;

ALTER TABLE athlete_tickets
  ADD COLUMN IF NOT EXISTS inventory_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS coupon_released_at timestamptz;

-- Historical terminal rows may already have passed through the legacy release
-- path. Mark them without changing counters to prevent a second decrement.
UPDATE registrations
SET inventory_released_at = COALESCE(inventory_released_at, created_at),
    coupon_released_at = CASE WHEN cupom_id IS NOT NULL THEN COALESCE(coupon_released_at, created_at) ELSE NULL END
WHERE status_pagamento IN ('estornado', 'expirado');

UPDATE athlete_tickets
SET inventory_released_at = COALESCE(inventory_released_at, created_at),
    coupon_released_at = CASE WHEN cupom_id IS NOT NULL THEN COALESCE(coupon_released_at, created_at) ELSE NULL END
WHERE status_pagamento IN ('estornado', 'expirado');

CREATE OR REPLACE FUNCTION release_registration_inventory(
  p_registration_id uuid,
  p_target_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order registrations%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF p_target_status NOT IN ('estornado', 'expirado') THEN
    RAISE EXCEPTION 'registration_release_status_invalid';
  END IF;

  SELECT * INTO v_order FROM registrations WHERE id = p_registration_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_order.inventory_released_at IS NOT NULL THEN
    UPDATE registrations
    SET status_pagamento = p_target_status
    WHERE id = p_registration_id
      AND status_pagamento NOT IN ('estornado', 'expirado');
    RETURN false;
  END IF;

  IF v_order.lote_id IS NOT NULL THEN
    UPDATE pricing_tiers SET vendidos = GREATEST(0, vendidos - 1) WHERE id = v_order.lote_id;
  END IF;
  IF v_order.cupom_id IS NOT NULL AND v_order.coupon_released_at IS NULL THEN
    UPDATE coupons SET usos_atuais = GREATEST(0, usos_atuais - 1) WHERE id = v_order.cupom_id;
  END IF;

  UPDATE registrations
  SET status_pagamento = p_target_status,
      inventory_released_at = v_now,
      coupon_released_at = CASE WHEN cupom_id IS NOT NULL THEN v_now ELSE coupon_released_at END
  WHERE id = p_registration_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION release_athlete_ticket_inventory(
  p_ticket_id uuid,
  p_target_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order athlete_tickets%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF p_target_status NOT IN ('estornado', 'expirado') THEN
    RAISE EXCEPTION 'athlete_ticket_release_status_invalid';
  END IF;

  SELECT * INTO v_order FROM athlete_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_order.inventory_released_at IS NOT NULL THEN
    UPDATE athlete_tickets
    SET status_pagamento = p_target_status
    WHERE id = p_ticket_id
      AND status_pagamento NOT IN ('estornado', 'expirado');
    RETURN false;
  END IF;

  IF v_order.lote_id IS NOT NULL THEN
    UPDATE pricing_tiers SET vendidos = GREATEST(0, vendidos - 1) WHERE id = v_order.lote_id;
  END IF;
  IF v_order.cupom_id IS NOT NULL AND v_order.coupon_released_at IS NULL THEN
    UPDATE coupons SET usos_atuais = GREATEST(0, usos_atuais - 1) WHERE id = v_order.cupom_id;
  END IF;

  UPDATE athlete_tickets
  SET status_pagamento = p_target_status,
      inventory_released_at = v_now,
      coupon_released_at = CASE WHEN cupom_id IS NOT NULL THEN v_now ELSE coupon_released_at END
  WHERE id = p_ticket_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION release_registration_elite_fee_once(p_registration_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_registration registrations%ROWTYPE;
  v_amount numeric := 0;
BEGIN
  SELECT * INTO v_registration FROM registrations WHERE id = p_registration_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;
  v_amount := GREATEST(0, COALESCE(v_registration.elite_fee_coletada, 0));
  IF v_amount <= 0 THEN RETURN 0; END IF;

  UPDATE registrations SET elite_fee_coletada = 0 WHERE id = p_registration_id;
  UPDATE championships
  SET premium_fee_pendente = premium_fee_pendente + v_amount
  WHERE id = v_registration.championship_id;
  RETURN v_amount;
END;
$$;

CREATE OR REPLACE FUNCTION claim_registration_elite_fee_once(
  p_registration_id uuid,
  p_max numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_registration registrations%ROWTYPE;
  v_pending numeric := 0;
  v_claimed numeric := 0;
BEGIN
  IF p_max IS NULL OR p_max <= 0 THEN RETURN 0; END IF;
  SELECT * INTO v_registration FROM registrations WHERE id = p_registration_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF COALESCE(v_registration.elite_fee_coletada, 0) > 0 THEN
    RETURN v_registration.elite_fee_coletada;
  END IF;

  SELECT premium_fee_pendente INTO v_pending
  FROM championships
  WHERE id = v_registration.championship_id
  FOR UPDATE;
  v_claimed := LEAST(GREATEST(0, COALESCE(v_pending, 0)), p_max);
  IF v_claimed <= 0 THEN RETURN 0; END IF;

  UPDATE championships
  SET premium_fee_pendente = GREATEST(0, premium_fee_pendente - v_claimed)
  WHERE id = v_registration.championship_id;
  UPDATE registrations
  SET elite_fee_coletada = v_claimed
  WHERE id = p_registration_id;
  RETURN v_claimed;
END;
$$;

REVOKE ALL ON FUNCTION release_registration_inventory(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_athlete_ticket_inventory(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_registration_elite_fee_once(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION claim_registration_elite_fee_once(uuid,numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION claim_elite_fee(uuid,numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_elite_fee(uuid,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION release_registration_inventory(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION release_athlete_ticket_inventory(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION release_registration_elite_fee_once(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION claim_registration_elite_fee_once(uuid,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION claim_elite_fee(uuid,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION release_elite_fee(uuid,numeric) TO service_role;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-order-inventory-release done';
