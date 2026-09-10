-- Reserva temporaria da vaga da dupla antes da coleta dos participantes.
-- Aplicar primeiro no Sandbox. A reserva ocupa o lote e a capacidade da
-- categoria por 15 minutos e e consumida atomicamente ao criar o ingresso.

CREATE TABLE IF NOT EXISTS public.checkout_reservations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash          text NOT NULL UNIQUE,
  kind                text NOT NULL DEFAULT 'athlete_category',
  championship_id     uuid NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  category_id         uuid NOT NULL REFERENCES public.championship_categories(id) ON DELETE CASCADE,
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pricing_tier_id     uuid REFERENCES public.pricing_tiers(id) ON DELETE SET NULL,
  price_snapshot      numeric(10,2) NOT NULL CHECK (price_snapshot >= 0),
  quantity            integer NOT NULL DEFAULT 1 CHECK (quantity = 1),
  status              text NOT NULL DEFAULT 'active',
  expires_at          timestamptz NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  released_at         timestamptz,
  converted_at        timestamptz,
  CONSTRAINT checkout_reservations_token_hash_check
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT checkout_reservations_kind_check
    CHECK (kind = 'athlete_category'),
  CONSTRAINT checkout_reservations_status_check
    CHECK (status IN ('active', 'converted', 'expired', 'released')),
  CONSTRAINT checkout_reservations_terminal_dates_check CHECK (
    (status = 'active' AND released_at IS NULL AND converted_at IS NULL)
    OR (status IN ('expired', 'released') AND released_at IS NOT NULL AND converted_at IS NULL)
    OR (status = 'converted' AND converted_at IS NOT NULL AND released_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS checkout_reservations_active_category_idx
  ON public.checkout_reservations(category_id, expires_at, id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS checkout_reservations_active_expiry_idx
  ON public.checkout_reservations(expires_at, id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS checkout_reservations_user_idx
  ON public.checkout_reservations(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.checkout_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.checkout_reservations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.checkout_reservations TO service_role;

-- A reserva contem identificadores internos e nunca e acessada diretamente
-- pelo navegador. A policy explicita documenta e garante esse bloqueio.
DROP POLICY IF EXISTS checkout_reservations_block_clients ON public.checkout_reservations;
CREATE POLICY checkout_reservations_block_clients
  ON public.checkout_reservations
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.checkout_server_now()
RETURNS timestamptz
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clock_timestamp();
$$;

REVOKE ALL ON FUNCTION public.checkout_server_now() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_server_now() TO service_role;

ALTER TABLE public.athlete_tickets
  ADD COLUMN IF NOT EXISTS checkout_reservation_id uuid,
  ADD COLUMN IF NOT EXISTS checkout_expires_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'athlete_tickets_checkout_reservation_fkey'
      AND conrelid = 'public.athlete_tickets'::regclass
  ) THEN
    ALTER TABLE public.athlete_tickets
      ADD CONSTRAINT athlete_tickets_checkout_reservation_fkey
      FOREIGN KEY (checkout_reservation_id)
      REFERENCES public.checkout_reservations(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS athlete_tickets_checkout_reservation_uidx
  ON public.athlete_tickets(checkout_reservation_id)
  WHERE checkout_reservation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS athlete_tickets_checkout_expiry_idx
  ON public.athlete_tickets(checkout_expires_at, id)
  WHERE status_pagamento = 'pendente' AND checkout_expires_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.release_athlete_checkout_reservation(
  p_token_hash text,
  p_force boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.checkout_reservations%ROWTYPE;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN false;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_token_hash, 0));

  SELECT *
    INTO v_reservation
    FROM public.checkout_reservations
   WHERE token_hash = p_token_hash
   FOR UPDATE;

  IF NOT FOUND OR v_reservation.status <> 'active' THEN
    RETURN false;
  END IF;
  IF NOT p_force AND v_reservation.expires_at > v_now THEN
    RETURN false;
  END IF;

  IF v_reservation.pricing_tier_id IS NOT NULL THEN
    UPDATE public.pricing_tiers
       SET vendidos = GREATEST(0, vendidos - v_reservation.quantity)
     WHERE id = v_reservation.pricing_tier_id;
  END IF;

  UPDATE public.checkout_reservations
     SET status = CASE WHEN expires_at <= v_now THEN 'expired' ELSE 'released' END,
         released_at = v_now,
         updated_at = v_now
   WHERE id = v_reservation.id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_athlete_checkout(
  p_token_hash text,
  p_championship_id uuid,
  p_category_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_duration_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_existing public.checkout_reservations%ROWTYPE;
  v_category public.championship_categories%ROWTYPE;
  v_championship_status text;
  v_active_count integer := 0;
  v_has_tiers boolean := false;
  v_tier public.pricing_tiers%ROWTYPE;
  v_tier_found boolean := false;
  v_price numeric(10,2);
  v_reservation public.checkout_reservations%ROWTYPE;
  v_expired public.checkout_reservations%ROWTYPE;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'checkout_reservation_token_invalid';
  END IF;
  IF p_duration_minutes IS NULL OR p_duration_minutes < 5 OR p_duration_minutes > 30 THEN
    RAISE EXCEPTION 'checkout_reservation_duration_invalid';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_token_hash, 0));

  SELECT *
    INTO v_existing
    FROM public.checkout_reservations
   WHERE token_hash = p_token_hash
   FOR UPDATE;

  IF FOUND AND v_existing.status = 'active' AND v_existing.expires_at > v_now THEN
    IF v_existing.championship_id <> p_championship_id
       OR v_existing.category_id <> p_category_id THEN
      RAISE EXCEPTION 'checkout_reservation_category_change_required';
    END IF;

    RETURN jsonb_build_object(
      'id', v_existing.id,
      'categoryId', v_existing.category_id,
      'expiresAt', v_existing.expires_at,
      'serverNow', v_now,
      'price', v_existing.price_snapshot,
      'pricingTierId', v_existing.pricing_tier_id,
      'reused', true
    );
  END IF;

  IF FOUND AND v_existing.status = 'converted' THEN
    RAISE EXCEPTION 'checkout_reservation_token_consumed';
  END IF;

  IF FOUND AND v_existing.status = 'active' THEN
    IF v_existing.pricing_tier_id IS NOT NULL THEN
      UPDATE public.pricing_tiers
         SET vendidos = GREATEST(0, vendidos - v_existing.quantity)
       WHERE id = v_existing.pricing_tier_id;
    END IF;
    UPDATE public.checkout_reservations
       SET status = 'expired', released_at = v_now, updated_at = v_now
     WHERE id = v_existing.id;
  END IF;

  SELECT c.*
    INTO v_category
    FROM public.championship_categories AS c
   WHERE c.id = p_category_id
     AND c.championship_id = p_championship_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'checkout_category_not_found';
  END IF;

  SELECT status
    INTO v_championship_status
    FROM public.championships
   WHERE id = p_championship_id;
  IF v_championship_status NOT IN ('inscricoes_abertas', 'em_andamento') THEN
    RAISE EXCEPTION 'checkout_sales_closed';
  END IF;

  -- A linha da categoria serializa a limpeza, a contagem e a nova reserva.
  FOR v_expired IN
    SELECT *
      FROM public.checkout_reservations
     WHERE category_id = p_category_id
       AND status = 'active'
       AND expires_at <= v_now
     ORDER BY id
     FOR UPDATE
  LOOP
    IF v_expired.pricing_tier_id IS NOT NULL THEN
      UPDATE public.pricing_tiers
         SET vendidos = GREATEST(0, vendidos - v_expired.quantity)
       WHERE id = v_expired.pricing_tier_id;
    END IF;
    UPDATE public.checkout_reservations
       SET status = 'expired', released_at = v_now, updated_at = v_now
     WHERE id = v_expired.id;
  END LOOP;

  IF v_category.max_duplas IS NOT NULL THEN
    SELECT
      (SELECT count(*) FROM public.registrations
        WHERE category_id = p_category_id
          AND status_pagamento IN ('pendente', 'pago'))
      +
      (SELECT count(*) FROM public.athlete_tickets
        WHERE category_id = p_category_id
          AND status_pagamento IN ('pendente', 'pago'))
      +
      (SELECT count(*) FROM public.checkout_reservations
        WHERE category_id = p_category_id
          AND status = 'active'
          AND expires_at > v_now)
      INTO v_active_count;

    IF v_active_count >= v_category.max_duplas THEN
      RAISE EXCEPTION 'checkout_category_sold_out';
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.pricing_tiers
     WHERE category_id = p_category_id
       AND ativo = true
  ) INTO v_has_tiers;

  SELECT pt.*
    INTO v_tier
    FROM public.pricing_tiers AS pt
   WHERE pt.category_id = p_category_id
     AND pt.ativo = true
     AND (pt.data_fim IS NULL OR v_now <= pt.data_fim)
     AND (pt.quantidade_maxima IS NULL OR pt.vendidos < pt.quantidade_maxima)
   ORDER BY pt.ordem, pt.id
   LIMIT 1
   FOR UPDATE;
  v_tier_found := FOUND;

  IF v_has_tiers AND NOT v_tier_found THEN
    RAISE EXCEPTION 'checkout_pricing_tiers_sold_out';
  END IF;

  IF v_tier_found THEN
    UPDATE public.pricing_tiers
       SET vendidos = vendidos + 1
     WHERE id = v_tier.id;
    v_price := v_tier.valor;
  ELSE
    v_price := v_category.valor_inscricao;
  END IF;

  IF v_existing.id IS NOT NULL THEN
    UPDATE public.checkout_reservations
       SET championship_id = p_championship_id,
           category_id = p_category_id,
           user_id = p_user_id,
           pricing_tier_id = CASE WHEN v_tier_found THEN v_tier.id ELSE NULL END,
           price_snapshot = v_price,
           quantity = 1,
           status = 'active',
           expires_at = v_now + make_interval(mins => p_duration_minutes),
           created_at = v_now,
           updated_at = v_now,
           released_at = NULL,
           converted_at = NULL
     WHERE id = v_existing.id
     RETURNING * INTO v_reservation;
  ELSE
    INSERT INTO public.checkout_reservations (
      token_hash, championship_id, category_id, user_id,
      pricing_tier_id, price_snapshot, expires_at
    ) VALUES (
      p_token_hash, p_championship_id, p_category_id, p_user_id,
      CASE WHEN v_tier_found THEN v_tier.id ELSE NULL END,
      v_price,
      v_now + make_interval(mins => p_duration_minutes)
    )
    RETURNING * INTO v_reservation;
  END IF;

  RETURN jsonb_build_object(
    'id', v_reservation.id,
    'categoryId', v_reservation.category_id,
    'expiresAt', v_reservation.expires_at,
    'serverNow', v_now,
    'price', v_reservation.price_snapshot,
    'pricingTierId', v_reservation.pricing_tier_id,
    'reused', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_athlete_checkout_reservations(
  p_limit integer DEFAULT 200
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_reservation public.checkout_reservations%ROWTYPE;
  v_expired integer := 0;
BEGIN
  FOR v_reservation IN
    SELECT *
      FROM public.checkout_reservations
     WHERE status = 'active'
       AND expires_at <= v_now
     ORDER BY expires_at, id
     LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 1000)
     FOR UPDATE SKIP LOCKED
  LOOP
    IF v_reservation.pricing_tier_id IS NOT NULL THEN
      UPDATE public.pricing_tiers
         SET vendidos = GREATEST(0, vendidos - v_reservation.quantity)
       WHERE id = v_reservation.pricing_tier_id;
    END IF;
    UPDATE public.checkout_reservations
       SET status = 'expired', released_at = v_now, updated_at = v_now
     WHERE id = v_reservation.id;
    v_expired := v_expired + 1;
  END LOOP;
  RETURN v_expired;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_athlete_checkout_reservation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_reservation public.checkout_reservations%ROWTYPE;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF NEW.checkout_reservation_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT *
    INTO v_reservation
    FROM public.checkout_reservations
   WHERE id = NEW.checkout_reservation_id
   FOR UPDATE;

  IF NOT FOUND
     OR v_reservation.status <> 'active'
     OR v_reservation.expires_at <= v_now THEN
    RAISE EXCEPTION 'checkout_reservation_expired';
  END IF;
  IF v_reservation.championship_id <> NEW.championship_id
     OR v_reservation.category_id <> NEW.category_id THEN
    RAISE EXCEPTION 'checkout_reservation_mismatch';
  END IF;

  NEW.lote_id := v_reservation.pricing_tier_id;
  NEW.checkout_expires_at := v_reservation.expires_at;

  UPDATE public.checkout_reservations
     SET status = 'converted', converted_at = v_now, updated_at = v_now
   WHERE id = v_reservation.id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_athlete_ticket_inventory_if_pending(
  p_ticket_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.athlete_tickets%ROWTYPE;
  v_now timestamptz := clock_timestamp();
BEGIN
  SELECT *
    INTO v_ticket
    FROM public.athlete_tickets
   WHERE id = p_ticket_id
   FOR UPDATE;

  IF NOT FOUND
     OR v_ticket.status_pagamento <> 'pendente'
     OR v_ticket.checkout_expires_at IS NULL
     OR v_ticket.checkout_expires_at > v_now THEN
    RETURN false;
  END IF;

  IF v_ticket.inventory_released_at IS NULL AND v_ticket.lote_id IS NOT NULL THEN
    UPDATE public.pricing_tiers
       SET vendidos = GREATEST(0, vendidos - 1)
     WHERE id = v_ticket.lote_id;
  END IF;
  IF v_ticket.coupon_released_at IS NULL AND v_ticket.cupom_id IS NOT NULL THEN
    UPDATE public.coupons
       SET usos_atuais = GREATEST(0, usos_atuais - 1)
     WHERE id = v_ticket.cupom_id;
  END IF;

  UPDATE public.athlete_tickets
     SET status_pagamento = 'expirado',
         inventory_released_at = COALESCE(inventory_released_at, v_now),
         coupon_released_at = CASE
           WHEN cupom_id IS NOT NULL THEN COALESCE(coupon_released_at, v_now)
           ELSE coupon_released_at
         END
   WHERE id = p_ticket_id
     AND status_pagamento = 'pendente';

  RETURN FOUND;
END;
$$;

DROP TRIGGER IF EXISTS athlete_tickets_consume_checkout_reservation
  ON public.athlete_tickets;
CREATE TRIGGER athlete_tickets_consume_checkout_reservation
  BEFORE INSERT
  ON public.athlete_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.consume_athlete_checkout_reservation();

REVOKE ALL ON FUNCTION public.reserve_athlete_checkout(text, uuid, uuid, uuid, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_athlete_checkout_reservation(text, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_athlete_checkout_reservations(integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_athlete_checkout_reservation()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_athlete_ticket_inventory_if_pending(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_athlete_checkout(text, uuid, uuid, uuid, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.release_athlete_checkout_reservation(text, boolean)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_athlete_checkout_reservations(integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_athlete_ticket_inventory_if_pending(uuid)
  TO service_role;

COMMENT ON TABLE public.checkout_reservations IS
  'Reservas temporarias de estoque do checkout; tokens brutos nunca sao persistidos.';
COMMENT ON COLUMN public.athlete_tickets.checkout_expires_at IS
  'Prazo original iniciado na escolha da categoria; nao deve ser reiniciado ao gerar o Pix.';

NOTIFY pgrst, 'reload schema';
