-- RankFTV production hardening: normalized spectator order items.
-- Additive and idempotent. Run after add-spectator-order.sql,
-- add-pricing-tiers.sql, add-coupons.sql and harden-ticket-inventory-security.sql.

CREATE TABLE IF NOT EXISTS spectator_ticket_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id             uuid NOT NULL REFERENCES spectator_tickets(id) ON DELETE CASCADE,
  line_number           integer NOT NULL CHECK (line_number > 0),
  ticket_type_id        uuid REFERENCES spectator_ticket_types(id) ON DELETE SET NULL,
  tipo_nome_snapshot    text NOT NULL,
  pricing_tier_id       uuid REFERENCES pricing_tiers(id) ON DELETE SET NULL,
  lote_nome_snapshot    text,
  valor_unitario        numeric(10,2) NOT NULL CHECK (valor_unitario >= 0),
  quantidade            integer NOT NULL CHECK (quantidade > 0 AND quantidade <= 20),
  inventory_released_at timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, line_number)
);

ALTER TABLE spectator_tickets
  ADD COLUMN IF NOT EXISTS items_normalized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventory_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS coupon_released_at timestamptz;

CREATE INDEX IF NOT EXISTS spectator_ticket_items_ticket_idx
  ON spectator_ticket_items(ticket_id, line_number);
CREATE INDEX IF NOT EXISTS spectator_ticket_items_type_active_idx
  ON spectator_ticket_items(ticket_type_id)
  WHERE inventory_released_at IS NULL;
CREATE INDEX IF NOT EXISTS spectator_ticket_items_tier_active_idx
  ON spectator_ticket_items(pricing_tier_id)
  WHERE pricing_tier_id IS NOT NULL AND inventory_released_at IS NULL;
CREATE INDEX IF NOT EXISTS spectator_tickets_pending_pix_expiry_idx
  ON spectator_tickets(created_at, id)
  WHERE status_pagamento = 'pendente' AND billing_type = 'PIX';

ALTER TABLE spectator_ticket_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS spectator_ticket_items_owner_select ON spectator_ticket_items;
CREATE POLICY spectator_ticket_items_owner_select ON spectator_ticket_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM spectator_tickets st
      JOIN championships c ON c.id = st.championship_id
      WHERE st.id = spectator_ticket_items.ticket_id
        AND c.organizador_id = auth.uid()
    )
  );

REVOKE ALL ON spectator_ticket_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON spectator_ticket_items TO authenticated;
GRANT ALL ON spectator_ticket_items TO service_role;

-- Persistent evidence for rows that could not be normalized without guessing.
CREATE TABLE IF NOT EXISTS spectator_ticket_items_backfill_report (
  ticket_id          uuid PRIMARY KEY REFERENCES spectator_tickets(id) ON DELETE CASCADE,
  status             text NOT NULL CHECK (status IN ('complete', 'partial', 'unmigrated')),
  expected_lines     integer NOT NULL DEFAULT 0,
  migrated_lines     integer NOT NULL DEFAULT 0,
  reason             text,
  legacy_items       jsonb,
  inspected_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE spectator_ticket_items_backfill_report ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON spectator_ticket_items_backfill_report FROM PUBLIC, anon, authenticated;
GRANT ALL ON spectator_ticket_items_backfill_report TO service_role;

-- Backfill JSON lines only when the ticket type name has one exact match in
-- the same championship. A one-line order with ticket_type_id uses that FK.
WITH expanded AS (
  SELECT
    st.id AS ticket_id,
    st.championship_id,
    st.ticket_type_id AS order_ticket_type_id,
    st.status_pagamento,
    st.created_at,
    st.itens,
    e.item,
    e.ordinality::integer AS line_number,
    COALESCE(NULLIF(BTRIM(e.item->>'tipo_nome'), ''), NULLIF(BTRIM(st.tipo_nome), '')) AS tipo_nome,
    CASE
      WHEN COALESCE(e.item->>'qty', '') ~ '^[0-9]+$' THEN (e.item->>'qty')::integer
      ELSE 0
    END AS quantidade,
    CASE
      WHEN COALESCE(e.item->>'valor_unit', '') ~ '^[0-9]+([.][0-9]+)?$'
        THEN (e.item->>'valor_unit')::numeric
      ELSE NULL
    END AS valor_unitario,
    NULLIF(BTRIM(e.item->>'lote_nome'), '') AS lote_nome
  FROM spectator_tickets st
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(st.itens) = 'array' THEN st.itens ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS e(item, ordinality)
), resolved_types AS (
  SELECT
    e.*,
    CASE
      WHEN e.order_ticket_type_id IS NOT NULL AND jsonb_array_length(e.itens) = 1
        AND EXISTS (
          SELECT 1
          FROM spectator_ticket_types explicit_type
          WHERE explicit_type.id = e.order_ticket_type_id
            AND explicit_type.championship_id = e.championship_id
        )
        THEN e.order_ticket_type_id
      WHEN matches.match_count = 1 THEN matches.type_id
      ELSE NULL
    END AS resolved_type_id
  FROM expanded e
  LEFT JOIN LATERAL (
    SELECT (ARRAY_AGG(tt.id ORDER BY tt.id))[1] AS type_id, COUNT(*) AS match_count
    FROM spectator_ticket_types tt
    WHERE tt.championship_id = e.championship_id
      AND LOWER(BTRIM(tt.nome)) = LOWER(BTRIM(e.tipo_nome))
  ) matches ON true
), resolved_tiers AS (
  SELECT
    r.*,
    CASE WHEN tiers.match_count = 1 THEN tiers.tier_id ELSE NULL END AS resolved_tier_id
  FROM resolved_types r
  LEFT JOIN LATERAL (
    SELECT (ARRAY_AGG(pt.id ORDER BY pt.id))[1] AS tier_id, COUNT(*) AS match_count
    FROM pricing_tiers pt
    WHERE pt.ticket_type_id = r.resolved_type_id
      AND r.lote_nome IS NOT NULL
      AND LOWER(BTRIM(pt.nome)) = LOWER(BTRIM(r.lote_nome))
  ) tiers ON true
)
INSERT INTO spectator_ticket_items (
  ticket_id,
  line_number,
  ticket_type_id,
  tipo_nome_snapshot,
  pricing_tier_id,
  lote_nome_snapshot,
  valor_unitario,
  quantidade,
  inventory_released_at,
  created_at
)
SELECT
  r.ticket_id,
  r.line_number,
  r.resolved_type_id,
  r.tipo_nome,
  r.resolved_tier_id,
  r.lote_nome,
  r.valor_unitario,
  r.quantidade,
  CASE WHEN r.status_pagamento IN ('estornado', 'expirado') THEN r.created_at ELSE NULL END,
  r.created_at
FROM resolved_tiers r
WHERE r.resolved_type_id IS NOT NULL
  AND r.tipo_nome IS NOT NULL
  AND r.valor_unitario IS NOT NULL
  AND r.valor_unitario >= 0
  AND r.quantidade BETWEEN 1 AND 20
ON CONFLICT (ticket_id, line_number) DO NOTHING;

-- Older single-item records may predate the JSON column. The unit value is an
-- estimate from the order total and remains identified as such in the report.
INSERT INTO spectator_ticket_items (
  ticket_id,
  line_number,
  ticket_type_id,
  tipo_nome_snapshot,
  valor_unitario,
  quantidade,
  inventory_released_at,
  created_at
)
SELECT
  st.id,
  1,
  st.ticket_type_id,
  COALESCE(NULLIF(BTRIM(st.tipo_nome), ''), tt.nome),
  ROUND((st.valor / GREATEST(st.quantidade, 1))::numeric, 2),
  GREATEST(st.quantidade, 1),
  CASE WHEN st.status_pagamento IN ('estornado', 'expirado') THEN st.created_at ELSE NULL END,
  st.created_at
FROM spectator_tickets st
JOIN spectator_ticket_types tt
  ON tt.id = st.ticket_type_id
 AND tt.championship_id = st.championship_id
WHERE (st.itens IS NULL OR jsonb_typeof(st.itens) <> 'array' OR jsonb_array_length(st.itens) = 0)
  AND st.ticket_type_id IS NOT NULL
  AND GREATEST(st.quantidade, 1) <= 20
ON CONFLICT (ticket_id, line_number) DO NOTHING;

WITH expected AS (
  SELECT
    st.id AS ticket_id,
    st.itens AS legacy_items,
    CASE
      WHEN jsonb_typeof(st.itens) = 'array' AND jsonb_array_length(st.itens) > 0
        THEN jsonb_array_length(st.itens)
      WHEN st.ticket_type_id IS NOT NULL THEN 1
      ELSE 0
    END AS expected_lines,
    CASE
      WHEN st.itens IS NULL AND st.ticket_type_id IS NULL THEN 'legacy_order_without_identifiable_items'
      WHEN st.itens IS NOT NULL AND jsonb_typeof(st.itens) <> 'array' THEN 'legacy_items_is_not_an_array'
      ELSE NULL
    END AS base_reason
  FROM spectator_tickets st
), migrated AS (
  SELECT ticket_id, COUNT(*)::integer AS migrated_lines
  FROM spectator_ticket_items
  GROUP BY ticket_id
)
INSERT INTO spectator_ticket_items_backfill_report (
  ticket_id, status, expected_lines, migrated_lines, reason, legacy_items, inspected_at
)
SELECT
  e.ticket_id,
  CASE
    WHEN e.expected_lines > 0 AND COALESCE(m.migrated_lines, 0) = e.expected_lines THEN 'complete'
    WHEN COALESCE(m.migrated_lines, 0) > 0 THEN 'partial'
    ELSE 'unmigrated'
  END,
  e.expected_lines,
  COALESCE(m.migrated_lines, 0),
  CASE
    WHEN e.expected_lines > 0 AND COALESCE(m.migrated_lines, 0) = e.expected_lines
      THEN CASE
        WHEN e.legacy_items IS NULL THEN 'single_item_value_estimated_from_order_total'
        WHEN jsonb_typeof(e.legacy_items) <> 'array' THEN 'single_item_value_estimated_from_order_total'
        WHEN jsonb_array_length(e.legacy_items) = 0 THEN 'single_item_value_estimated_from_order_total'
        ELSE NULL
      END
    ELSE COALESCE(e.base_reason, 'ticket_type_missing_or_ambiguous')
  END,
  e.legacy_items,
  now()
FROM expected e
LEFT JOIN migrated m ON m.ticket_id = e.ticket_id
ON CONFLICT (ticket_id) DO UPDATE SET
  status = EXCLUDED.status,
  expected_lines = EXCLUDED.expected_lines,
  migrated_lines = EXCLUDED.migrated_lines,
  reason = EXCLUDED.reason,
  legacy_items = EXCLUDED.legacy_items,
  inspected_at = EXCLUDED.inspected_at;

UPDATE spectator_tickets st
SET items_normalized = true
FROM spectator_ticket_items_backfill_report report
WHERE report.ticket_id = st.id
  AND report.status = 'complete'
  AND NOT st.items_normalized;

-- Historical terminal records may already have been released by legacy code.
-- Mark them as terminal without changing counters, avoiding a second release.
UPDATE spectator_tickets
SET inventory_released_at = COALESCE(inventory_released_at, created_at),
    coupon_released_at = CASE
      WHEN cupom_id IS NOT NULL THEN COALESCE(coupon_released_at, created_at)
      ELSE coupon_released_at
    END
WHERE status_pagamento IN ('estornado', 'expirado');

CREATE OR REPLACE FUNCTION create_spectator_ticket_order(
  p_championship_id uuid,
  p_items jsonb,
  p_comprador_nome text,
  p_comprador_email text,
  p_comprador_cpf text,
  p_coupon_code text,
  p_code text,
  p_access_token text,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE(ticket_id uuid, valor numeric, quantidade integer, resumo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id uuid := gen_random_uuid();
  v_line record;
  v_type record;
  v_tier record;
  v_coupon record;
  v_has_tiers boolean;
  v_tier_found boolean;
  v_total numeric(10,2) := 0;
  v_final numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_quantity integer := 0;
  v_summary text := '';
  v_lines jsonb := '[]'::jsonb;
  v_coupon_id uuid := NULL;
  v_line_number integer := 0;
  v_unique_types integer := 0;
  v_single_type_id uuid := NULL;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'spectator_order_empty';
  END IF;
  IF jsonb_array_length(p_items) > 20 OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS input(item)
    WHERE jsonb_typeof(item) <> 'object'
       OR COALESCE(item->>'ticket_type_id', item->>'ticketTypeId', '')
          !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       OR COALESCE(item->>'qty', '') !~ '^[0-9]+$'
  ) THEN
    RAISE EXCEPTION 'spectator_items_invalid';
  END IF;
  IF NULLIF(BTRIM(p_comprador_nome), '') IS NULL OR NULLIF(BTRIM(p_comprador_email), '') IS NULL THEN
    RAISE EXCEPTION 'spectator_buyer_invalid';
  END IF;
  IF NULLIF(BTRIM(p_access_token), '') IS NULL OR NULLIF(BTRIM(p_code), '') IS NULL THEN
    RAISE EXCEPTION 'spectator_credentials_invalid';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM championships
    WHERE id = p_championship_id
      AND status IN ('inscricoes_abertas', 'em_andamento')
  ) THEN
    RAISE EXCEPTION 'spectator_sales_closed';
  END IF;

  -- Aggregate duplicate IDs and lock in UUID order to keep concurrent carts
  -- deterministic and deadlock resistant.
  FOR v_line IN
    SELECT
      COALESCE(item->>'ticket_type_id', item->>'ticketTypeId')::uuid AS type_id,
      SUM(COALESCE(NULLIF(item->>'qty', '')::integer, 0))::integer AS qty
    FROM jsonb_array_elements(p_items) AS source(item)
    GROUP BY COALESCE(item->>'ticket_type_id', item->>'ticketTypeId')
    ORDER BY COALESCE(item->>'ticket_type_id', item->>'ticketTypeId')
  LOOP
    IF v_line.qty < 1 OR v_line.qty > 20 THEN
      RAISE EXCEPTION 'spectator_quantity_invalid';
    END IF;

    SELECT id, nome, valor, max_quantidade, vendidos, ativo
      INTO v_type
    FROM spectator_ticket_types
    WHERE id = v_line.type_id
      AND championship_id = p_championship_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'spectator_ticket_type_unavailable';
    END IF;
    IF NOT v_type.ativo THEN RAISE EXCEPTION 'spectator_ticket_type_unavailable'; END IF;
    IF v_type.max_quantidade IS NOT NULL AND v_type.vendidos + v_line.qty > v_type.max_quantidade THEN
      RAISE EXCEPTION 'spectator_ticket_type_sold_out';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM pricing_tiers WHERE ticket_type_id = v_type.id AND ativo = true
    ) INTO v_has_tiers;

    SELECT id, nome, valor, quantidade_maxima, vendidos
      INTO v_tier
    FROM pricing_tiers
    WHERE ticket_type_id = v_type.id
      AND ativo = true
      AND (data_fim IS NULL OR now() <= data_fim)
      AND (quantidade_maxima IS NULL OR vendidos < quantidade_maxima)
    ORDER BY ordem, id
    LIMIT 1
    FOR UPDATE;
    v_tier_found := FOUND;

    IF v_has_tiers AND NOT v_tier_found THEN
      RAISE EXCEPTION 'spectator_pricing_tiers_sold_out';
    END IF;
    IF v_has_tiers AND v_tier.quantidade_maxima IS NOT NULL
      AND v_tier.vendidos + v_line.qty > v_tier.quantidade_maxima THEN
      RAISE EXCEPTION 'spectator_pricing_tier_quantity_unavailable';
    END IF;

    UPDATE spectator_ticket_types
    SET vendidos = vendidos + v_line.qty
    WHERE id = v_type.id;

    IF v_has_tiers THEN
      UPDATE pricing_tiers
      SET vendidos = vendidos + v_line.qty
      WHERE id = v_tier.id;
    END IF;

    v_line_number := v_line_number + 1;
    v_quantity := v_quantity + v_line.qty;
    v_total := v_total + (CASE WHEN v_has_tiers THEN v_tier.valor ELSE v_type.valor END) * v_line.qty;
    v_summary := concat_ws(', ', NULLIF(v_summary, ''), v_line.qty::text || 'x ' || v_type.nome);
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'line_number', v_line_number,
      'ticket_type_id', v_type.id,
      'tipo_nome', v_type.nome,
      'pricing_tier_id', CASE WHEN v_has_tiers THEN v_tier.id ELSE NULL END,
      'lote_nome', CASE WHEN v_has_tiers THEN v_tier.nome ELSE NULL END,
      'valor_unit', CASE WHEN v_has_tiers THEN v_tier.valor ELSE v_type.valor END,
      'qty', v_line.qty
    ));
  END LOOP;

  IF v_quantity < 1 THEN RAISE EXCEPTION 'spectator_order_empty'; END IF;
  v_total := ROUND(v_total, 2);
  v_final := v_total;

  IF NULLIF(BTRIM(p_coupon_code), '') IS NOT NULL THEN
    SELECT id, tipo_desconto, valor_desconto, aplica_em, quantidade_maxima,
           usos_atuais, data_inicio, data_fim, ativo
      INTO v_coupon
    FROM coupons
    WHERE championship_id = p_championship_id
      AND UPPER(BTRIM(codigo)) = UPPER(BTRIM(p_coupon_code))
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'spectator_coupon_unavailable'; END IF;
    IF NOT v_coupon.ativo
      OR v_coupon.aplica_em NOT IN ('plateia', 'ambos')
      OR (v_coupon.data_inicio IS NOT NULL AND now() < v_coupon.data_inicio)
      OR (v_coupon.data_fim IS NOT NULL AND now() > v_coupon.data_fim)
      OR (v_coupon.quantidade_maxima IS NOT NULL AND v_coupon.usos_atuais >= v_coupon.quantidade_maxima) THEN
      RAISE EXCEPTION 'spectator_coupon_unavailable';
    END IF;

    v_discount := CASE
      WHEN v_coupon.tipo_desconto = 'percentual'
        THEN LEAST(v_total, ROUND(v_total * v_coupon.valor_desconto / 100, 2))
      ELSE LEAST(v_total, ROUND(v_coupon.valor_desconto, 2))
    END;
    v_final := GREATEST(0, ROUND(v_total - v_discount, 2));
    v_coupon_id := v_coupon.id;
    UPDATE coupons SET usos_atuais = usos_atuais + 1 WHERE id = v_coupon.id;
  END IF;

  IF v_final > 0 AND regexp_replace(COALESCE(p_comprador_cpf, ''), '[^0-9]', '', 'g') !~ '^[0-9]{11}$' THEN
    RAISE EXCEPTION 'spectator_cpf_required';
  END IF;
  IF v_final > 0 AND NOT EXISTS (
    SELECT 1
    FROM championships c
    JOIN organizer_accounts oa ON oa.user_id = c.organizador_id
    WHERE c.id = p_championship_id
      AND NULLIF(BTRIM(oa.chave_pix), '') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'spectator_payout_unavailable';
  END IF;

  SELECT COUNT(DISTINCT (line->>'ticket_type_id')),
         (ARRAY_AGG((line->>'ticket_type_id')::uuid ORDER BY (line->>'ticket_type_id')::uuid))[1]
    INTO v_unique_types, v_single_type_id
  FROM jsonb_array_elements(v_lines) AS lines(line);

  INSERT INTO spectator_tickets (
    id, championship_id, ticket_type_id, tipo_nome, itens, quantidade,
    comprador_nome, comprador_email, comprador_cpf, valor, cupom_id,
    status_pagamento, billing_type, code, access_token, user_id,
    items_normalized
  ) VALUES (
    v_ticket_id,
    p_championship_id,
    CASE WHEN v_unique_types = 1 THEN v_single_type_id ELSE NULL END,
    v_summary,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'tipo_nome', line->>'tipo_nome',
        'qty', (line->>'qty')::integer,
        'valor_unit', (line->>'valor_unit')::numeric,
        'lote_nome', line->>'lote_nome'
      ) ORDER BY (line->>'line_number')::integer), '[]'::jsonb)
      FROM jsonb_array_elements(v_lines) AS legacy(line)
    ),
    v_quantity,
    BTRIM(p_comprador_nome),
    LOWER(BTRIM(p_comprador_email)),
    NULLIF(BTRIM(p_comprador_cpf), ''),
    v_final,
    v_coupon_id,
    CASE WHEN v_final <= 0 THEN 'pago' ELSE 'pendente' END,
    CASE WHEN v_final <= 0 THEN NULL ELSE 'PIX' END,
    UPPER(BTRIM(p_code)),
    BTRIM(p_access_token),
    p_user_id,
    true
  );

  INSERT INTO spectator_ticket_items (
    ticket_id, line_number, ticket_type_id, tipo_nome_snapshot,
    pricing_tier_id, lote_nome_snapshot, valor_unitario, quantidade
  )
  SELECT
    v_ticket_id,
    (line->>'line_number')::integer,
    (line->>'ticket_type_id')::uuid,
    line->>'tipo_nome',
    NULLIF(line->>'pricing_tier_id', '')::uuid,
    NULLIF(line->>'lote_nome', ''),
    (line->>'valor_unit')::numeric,
    (line->>'qty')::integer
  FROM jsonb_array_elements(v_lines) AS normalized(line);

  RETURN QUERY SELECT v_ticket_id, v_final, v_quantity, v_summary;
END $$;

CREATE OR REPLACE FUNCTION release_spectator_ticket_order(
  p_ticket_id uuid,
  p_target_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket record;
  v_item record;
  v_now timestamptz := now();
BEGIN
  IF p_target_status NOT IN ('estornado', 'expirado') THEN
    RAISE EXCEPTION 'spectator_release_status_invalid';
  END IF;

  SELECT id, status_pagamento, cupom_id, items_normalized,
         inventory_released_at, coupon_released_at
    INTO v_ticket
  FROM spectator_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;
  IF v_ticket.inventory_released_at IS NOT NULL THEN
    UPDATE spectator_tickets
    SET status_pagamento = p_target_status
    WHERE id = p_ticket_id
      AND status_pagamento NOT IN ('estornado', 'expirado');
    RETURN false;
  END IF;
  IF NOT v_ticket.items_normalized THEN
    RAISE EXCEPTION 'spectator_items_not_normalized';
  END IF;

  FOR v_item IN
    SELECT id, ticket_type_id, pricing_tier_id, quantidade
    FROM spectator_ticket_items
    WHERE ticket_id = p_ticket_id
      AND inventory_released_at IS NULL
    ORDER BY ticket_type_id, pricing_tier_id, id
    FOR UPDATE
  LOOP
    IF v_item.ticket_type_id IS NOT NULL THEN
      UPDATE spectator_ticket_types
      SET vendidos = GREATEST(0, vendidos - v_item.quantidade)
      WHERE id = v_item.ticket_type_id;
    END IF;
    IF v_item.pricing_tier_id IS NOT NULL THEN
      UPDATE pricing_tiers
      SET vendidos = GREATEST(0, vendidos - v_item.quantidade)
      WHERE id = v_item.pricing_tier_id;
    END IF;
    UPDATE spectator_ticket_items
    SET inventory_released_at = v_now
    WHERE id = v_item.id;
  END LOOP;

  IF v_ticket.cupom_id IS NOT NULL AND v_ticket.coupon_released_at IS NULL THEN
    UPDATE coupons
    SET usos_atuais = GREATEST(0, usos_atuais - 1)
    WHERE id = v_ticket.cupom_id;
  END IF;

  UPDATE spectator_tickets
  SET status_pagamento = p_target_status,
      inventory_released_at = v_now,
      coupon_released_at = CASE WHEN cupom_id IS NOT NULL THEN v_now ELSE coupon_released_at END,
      repasse_status = CASE WHEN p_target_status = 'estornado' THEN 'estornado' ELSE repasse_status END
  WHERE id = p_ticket_id;

  RETURN true;
END $$;

REVOKE ALL ON FUNCTION create_spectator_ticket_order(uuid, jsonb, text, text, text, text, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_spectator_ticket_order(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_spectator_ticket_order(uuid, jsonb, text, text, text, text, text, text, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION release_spectator_ticket_order(uuid, text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-spectator-ticket-items done';
