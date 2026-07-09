-- =============================================================
-- CUPONS DE DESCONTO — por campeonato, aplicável a inscrição de atleta
-- e/ou ingresso de plateia.
--
-- O desconto é aplicado sobre o valor base ANTES da taxa da plataforma
-- (a taxa é sempre calculada em cima do valor já com desconto).
--
-- A reivindicação de uso é ATÔMICA (FOR UPDATE), mesmo padrão já usado
-- em claim_elite_fee — dois compradores não conseguem usar a última
-- vaga do cupom ao mesmo tempo.
--
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.
-- =============================================================

CREATE TABLE IF NOT EXISTS coupons (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id   uuid NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  codigo            text NOT NULL,
  tipo_desconto     text NOT NULL CHECK (tipo_desconto IN ('percentual', 'valor_fixo')),
  valor_desconto    numeric(10,2) NOT NULL CHECK (valor_desconto > 0),
  aplica_em         text NOT NULL DEFAULT 'ambos' CHECK (aplica_em IN ('atleta', 'plateia', 'ambos')),
  quantidade_maxima int,          -- null = ilimitado
  usos_atuais       int NOT NULL DEFAULT 0,
  data_inicio       timestamptz,  -- null = já vale
  data_fim          timestamptz,  -- null = não expira
  ativo             boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (championship_id, codigo)
);

CREATE INDEX IF NOT EXISTS coupons_championship ON coupons (championship_id);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_dono" ON coupons;
CREATE POLICY "coupons_dono" ON coupons FOR ALL USING (
  championship_id IN (SELECT id FROM championships WHERE organizador_id = auth.uid())
) WITH CHECK (
  championship_id IN (SELECT id FROM championships WHERE organizador_id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON coupons TO authenticated;
GRANT ALL ON coupons TO service_role;

-- ── Rastro de uso (auditoria) nas tabelas de inscrição/ingresso ─────────────
ALTER TABLE registrations     ADD COLUMN IF NOT EXISTS cupom_id uuid REFERENCES coupons(id) ON DELETE SET NULL;
ALTER TABLE athlete_tickets   ADD COLUMN IF NOT EXISTS cupom_id uuid REFERENCES coupons(id) ON DELETE SET NULL;
ALTER TABLE spectator_tickets ADD COLUMN IF NOT EXISTS cupom_id uuid REFERENCES coupons(id) ON DELETE SET NULL;

-- ── Reivindicação atômica de uso ─────────────────────────────────────────────
-- Trava a linha do cupom, confere se ainda é válido (ativo, dentro do
-- período, ainda tem vaga) e incrementa usos_atuais. Retorna true se
-- conseguiu reivindicar, false caso contrário — o chamador NÃO deve
-- prosseguir com a cobrança se vier false.
CREATE OR REPLACE FUNCTION claim_coupon_use(p_coupon_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max    int;
  v_usos   int;
  v_ativo  boolean;
  v_inicio timestamptz;
  v_fim    timestamptz;
BEGIN
  SELECT quantidade_maxima, usos_atuais, ativo, data_inicio, data_fim
    INTO v_max, v_usos, v_ativo, v_inicio, v_fim
    FROM coupons
    WHERE id = p_coupon_id
    FOR UPDATE;

  IF NOT FOUND OR NOT v_ativo THEN RETURN false; END IF;
  IF v_inicio IS NOT NULL AND now() < v_inicio THEN RETURN false; END IF;
  IF v_fim    IS NOT NULL AND now() > v_fim    THEN RETURN false; END IF;
  IF v_max    IS NOT NULL AND v_usos >= v_max  THEN RETURN false; END IF;

  UPDATE coupons SET usos_atuais = usos_atuais + 1 WHERE id = p_coupon_id;
  RETURN true;
END $$;

-- Devolve o uso reivindicado (cobrança falhou depois de reivindicar).
CREATE OR REPLACE FUNCTION release_coupon_use(p_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE coupons SET usos_atuais = GREATEST(0, usos_atuais - 1) WHERE id = p_coupon_id;
END $$;

GRANT EXECUTE ON FUNCTION claim_coupon_use(uuid)   TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION release_coupon_use(uuid) TO service_role, authenticated;

NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'add-coupons done';
