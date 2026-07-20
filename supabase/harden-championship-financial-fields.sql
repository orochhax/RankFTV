-- =============================================================
-- RANKFTV — Hardening: campos financeiros/administrativos de championships
-- não podem ser alterados pelo client do organizador.
--
-- championships_update (championships.sql) autoriza por dono
-- (organizador_id = auth.uid()), mas RLS não restringe QUAIS colunas —
-- combinado com GRANT UPDATE ON championships TO authenticated, qualquer
-- organizador podia rodar, direto do navegador:
--   supabase.from("championships").update({ is_elite: true, premium_fee_pendente: 0, taxa_plataforma: 0 })
-- e ativar Elite sem dívida, zerar a taxa da plataforma em toda inscrição,
-- ou se autopromover na vitrine — sem passar pelas Server Actions que
-- deveriam ser o único caminho pra essas mudanças.
--
-- status (rascunho/inscricoes_abertas/...) fica de fora do bloqueio: é
-- legitimamente escrito pelo próprio organizador via
-- app/painel/campeonatos/[id]/editar/actions.ts e app/.../publicar.
--
-- Mesmo padrão de supabase/roles.sql (prevent_role_change). Idempotente.
-- =============================================================

CREATE OR REPLACE FUNCTION protect_championship_financial_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role') <> 'service_role' THEN
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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_championship_financial_fields_trigger ON championships;
CREATE TRIGGER protect_championship_financial_fields_trigger
  BEFORE UPDATE ON championships
  FOR EACH ROW EXECUTE FUNCTION protect_championship_financial_fields();

-- prevent_role_change (supabase/roles.sql) não fixava search_path — corrige
-- aqui pra fechar a recomendação de segurança de "toda SECURITY DEFINER
-- fixa search_path" (uma função SECURITY DEFINER sem search_path fixo pode
-- ser enganada por um schema temporário do chamador com nome igual a uma
-- tabela referenciada sem qualificação).
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role <> OLD.role AND current_setting('role') <> 'service_role' THEN
    RAISE EXCEPTION 'Alteração de role não permitida pelo client.';
  END IF;
  RETURN NEW;
END;
$$;

-- ── tornarCampeonatoElite/cancelarCampeonatoElite hoje escrevem is_elite/
-- premium_fee_pendente com o client do próprio organizador
-- (app/painel/campeonatos/[id]/financeiro/actions.ts) — o trigger acima
-- bloquearia essas duas ações também. Substitui por duas RPCs SECURITY
-- DEFINER que fazem a mesma validação de dono + regra de negócio, mas
-- gravam como service_role (passam pelo trigger sem serem bloqueadas).

CREATE OR REPLACE FUNCTION ativar_championship_elite(p_champ_id uuid, p_preco_elite numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_champ record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT organizador_id, is_elite, status INTO v_champ
    FROM championships WHERE id = p_champ_id FOR UPDATE;
  IF NOT FOUND OR v_champ.organizador_id <> auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;
  IF v_champ.is_elite THEN
    RETURN jsonb_build_object('ok', true);
  END IF;
  IF v_champ.status NOT IN ('rascunho', 'inscricoes_abertas') THEN
    RAISE EXCEPTION 'O Elite só pode ser ativado enquanto as inscrições estão abertas.';
  END IF;

  UPDATE championships SET is_elite = true, premium_fee_pendente = p_preco_elite
    WHERE id = p_champ_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION cancelar_championship_elite(p_champ_id uuid, p_preco_elite numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_champ record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT organizador_id, is_elite, premium_fee_pendente INTO v_champ
    FROM championships WHERE id = p_champ_id FOR UPDATE;
  IF NOT FOUND OR v_champ.organizador_id <> auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;
  IF NOT v_champ.is_elite THEN
    RETURN jsonb_build_object('ok', true);
  END IF;
  IF v_champ.premium_fee_pendente < p_preco_elite THEN
    RAISE EXCEPTION 'O Plano Elite já começou a ser cobrado e não pode mais ser cancelado.';
  END IF;

  UPDATE championships SET is_elite = false, premium_fee_pendente = 0
    WHERE id = p_champ_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION ativar_championship_elite(uuid, numeric)   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION cancelar_championship_elite(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ativar_championship_elite(uuid, numeric)   TO authenticated;
GRANT EXECUTE ON FUNCTION cancelar_championship_elite(uuid, numeric) TO authenticated;

-- ── Fecha de vez a regressão de grant das funções de reivindicação/liberação
-- de lote, cupom e taxa Elite — os arquivos originais (add-coupons.sql,
-- add-pricing-tiers.sql, add-elite-fee-collection.sql) ainda concedem
-- EXECUTE a authenticated; se algum deles for rerodado, a brecha volta.
-- Fixa aqui pra não depender da ordem/permanência de production-security-
-- hardening.sql.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'claim_pricing_tier') THEN
    REVOKE ALL ON FUNCTION claim_pricing_tier(uuid, int) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION claim_pricing_tier(uuid, int) TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'release_pricing_tier') THEN
    REVOKE ALL ON FUNCTION release_pricing_tier(uuid, int) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION release_pricing_tier(uuid, int) TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'claim_coupon_use') THEN
    REVOKE ALL ON FUNCTION claim_coupon_use(uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION claim_coupon_use(uuid) TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'release_coupon_use') THEN
    REVOKE ALL ON FUNCTION release_coupon_use(uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION release_coupon_use(uuid) TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'claim_elite_fee') THEN
    REVOKE ALL ON FUNCTION claim_elite_fee(uuid, numeric) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION claim_elite_fee(uuid, numeric) TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'release_elite_fee') THEN
    REVOKE ALL ON FUNCTION release_elite_fee(uuid, numeric) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION release_elite_fee(uuid, numeric) TO service_role;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'harden-championship-financial-fields done';
