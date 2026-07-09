-- =============================================================
-- LOTES / PREÇO ESCALONADO — "1º Lote R$50, 2º Lote R$70", virando por
-- data ou por quantidade vendida. Um lote pertence a UMA categoria de
-- atleta OU UM tipo de ingresso de plateia (nunca os dois).
--
-- O lote vigente é o de menor `ordem` que ainda não expirou por data E
-- ainda não esgotou por quantidade. Se a categoria/tipo não tiver
-- nenhum lote configurado, continua usando o valor base normal
-- (championship_categories.valor_inscricao / spectator_ticket_types.valor)
-- — compatível com todo campeonato já existente, sem quebrar nada.
--
-- `vendidos` é incrementado/decrementado ATOMICAMENTE (FOR UPDATE),
-- mesmo padrão de claim_elite_fee / claim_coupon_use.
--
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.
-- =============================================================

CREATE TABLE IF NOT EXISTS pricing_tiers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       uuid REFERENCES championship_categories(id) ON DELETE CASCADE,
  ticket_type_id    uuid REFERENCES spectator_ticket_types(id) ON DELETE CASCADE,
  nome              text NOT NULL,           -- "1º Lote", "2º Lote", "Promocional"
  valor             numeric(10,2) NOT NULL CHECK (valor >= 0),
  ordem             int NOT NULL DEFAULT 0,  -- sequência de virada, menor = primeiro
  quantidade_maxima int,                     -- null = só corta por data
  vendidos          int NOT NULL DEFAULT 0,
  data_fim          timestamptz,             -- null = só corta por quantidade
  ativo             boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (category_id IS NOT NULL AND ticket_type_id IS NULL) OR
    (category_id IS NULL AND ticket_type_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS pricing_tiers_category     ON pricing_tiers (category_id);
CREATE INDEX IF NOT EXISTS pricing_tiers_ticket_type   ON pricing_tiers (ticket_type_id);

ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_tiers_dono" ON pricing_tiers;
CREATE POLICY "pricing_tiers_dono" ON pricing_tiers FOR ALL USING (
  category_id IN (
    SELECT cc.id FROM championship_categories cc
    JOIN championships c ON c.id = cc.championship_id
    WHERE c.organizador_id = auth.uid()
  )
  OR
  ticket_type_id IN (
    SELECT tt.id FROM spectator_ticket_types tt
    JOIN championships c ON c.id = tt.championship_id
    WHERE c.organizador_id = auth.uid()
  )
) WITH CHECK (
  category_id IN (
    SELECT cc.id FROM championship_categories cc
    JOIN championships c ON c.id = cc.championship_id
    WHERE c.organizador_id = auth.uid()
  )
  OR
  ticket_type_id IN (
    SELECT tt.id FROM spectator_ticket_types tt
    JOIN championships c ON c.id = tt.championship_id
    WHERE c.organizador_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON pricing_tiers TO authenticated;
GRANT ALL ON pricing_tiers TO service_role;

-- ── Rastro de uso (auditoria) — atleta é sempre 1 unidade por linha;
-- plateia guarda o lote usado dentro do próprio jsonb `itens` (carrinho
-- pode ter vários tipos, cada um com seu lote independente).
ALTER TABLE registrations   ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES pricing_tiers(id) ON DELETE SET NULL;
ALTER TABLE athlete_tickets ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES pricing_tiers(id) ON DELETE SET NULL;

-- ── Reivindicação atômica de N unidades de um lote ──────────────────────────
-- Trava a linha do lote, confere se ainda é válido (ativo, dentro da data,
-- ainda cabe p_qty dentro do limite) e incrementa `vendidos`. Retorna true
-- se conseguiu reivindicar, false caso contrário.
CREATE OR REPLACE FUNCTION claim_pricing_tier(p_tier_id uuid, p_qty int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max      int;
  v_vendidos int;
  v_ativo    boolean;
  v_fim      timestamptz;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN RETURN false; END IF;

  SELECT quantidade_maxima, vendidos, ativo, data_fim
    INTO v_max, v_vendidos, v_ativo, v_fim
    FROM pricing_tiers
    WHERE id = p_tier_id
    FOR UPDATE;

  IF NOT FOUND OR NOT v_ativo THEN RETURN false; END IF;
  IF v_fim IS NOT NULL AND now() > v_fim THEN RETURN false; END IF;
  IF v_max IS NOT NULL AND v_vendidos + p_qty > v_max THEN RETURN false; END IF;

  UPDATE pricing_tiers SET vendidos = vendidos + p_qty WHERE id = p_tier_id;
  RETURN true;
END $$;

-- Devolve p_qty unidades reivindicadas (cobrança falhou depois de reivindicar,
-- ou uma outra linha do mesmo carrinho falhou e precisa desfazer esta).
CREATE OR REPLACE FUNCTION release_pricing_tier(p_tier_id uuid, p_qty int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN RETURN; END IF;
  UPDATE pricing_tiers SET vendidos = GREATEST(0, vendidos - p_qty) WHERE id = p_tier_id;
END $$;

GRANT EXECUTE ON FUNCTION claim_pricing_tier(uuid, int)   TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION release_pricing_tier(uuid, int) TO service_role, authenticated;

NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'add-pricing-tiers done';
