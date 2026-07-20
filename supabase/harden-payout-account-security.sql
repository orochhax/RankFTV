-- =============================================================
-- RANKFTV — Hardening: chave Pix e dados de repasse de
-- organizer_accounts/arena_accounts.
--
-- organizer_accounts_update e arena_accounts_owner autorizam por dono, mas
-- sem restrição de coluna — combinado com GRANT UPDATE ... TO authenticated,
-- qualquer organizador/dono de arena podia trocar chave_pix, asaas_account_id,
-- asaas_wallet_id e habilitado direto pelo navegador, sem passar pela Server
-- Action. chave_pix é a coluna que de fato roteia dinheiro (transferirPix em
-- lib/repasse.ts e app/api/webhooks/asaas/route.ts) — trocá-la é o
-- equivalente a redirecionar o repasse pra uma conta de outra pessoa.
--
-- Depois desta migration:
--   - asaas_account_id/asaas_wallet_id/habilitado: só service_role escreve.
--   - chave_pix: só pelas RPCs abaixo (exigem dono autenticado), que também
--     carimbam chave_pix_atualizada_em — usado como cooldown de segurança:
--     repasses ficam retidos por PIX_COOLDOWN_HORAS (lib/pix.ts) depois de
--     qualquer troca de chave, e cada troca é auditada em
--     security_audit_log (ver app/painel/campeonatos/[id]/financeiro/actions.ts
--     e app/arena/[handle]/configuracoes — a Server Action chama
--     registrarAuditoria antes de invocar a RPC).
--
-- Idempotente — pode rodar mais de uma vez.
-- =============================================================

ALTER TABLE organizer_accounts ADD COLUMN IF NOT EXISTS chave_pix_atualizada_em timestamptz;
ALTER TABLE arena_accounts     ADD COLUMN IF NOT EXISTS chave_pix_atualizada_em timestamptz;

CREATE OR REPLACE FUNCTION protect_payout_account_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role') <> 'service_role' THEN
    IF NEW.chave_pix IS DISTINCT FROM OLD.chave_pix
       OR NEW.chave_pix_atualizada_em IS DISTINCT FROM OLD.chave_pix_atualizada_em THEN
      RAISE EXCEPTION 'Use a função de troca de chave Pix — não dá pra alterar direto.';
    END IF;
    IF NEW.asaas_account_id IS DISTINCT FROM OLD.asaas_account_id
       OR NEW.asaas_wallet_id IS DISTINCT FROM OLD.asaas_wallet_id
       OR NEW.habilitado IS DISTINCT FROM OLD.habilitado THEN
      RAISE EXCEPTION 'Campo administrado pela plataforma — não pode ser alterado pelo client.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_organizer_payout_fields_trigger ON organizer_accounts;
CREATE TRIGGER protect_organizer_payout_fields_trigger
  BEFORE UPDATE ON organizer_accounts
  FOR EACH ROW EXECUTE FUNCTION protect_payout_account_fields();

DROP TRIGGER IF EXISTS protect_arena_payout_fields_trigger ON arena_accounts;
CREATE TRIGGER protect_arena_payout_fields_trigger
  BEFORE UPDATE ON arena_accounts
  FOR EACH ROW EXECUTE FUNCTION protect_payout_account_fields();

-- ── Troca de chave Pix do organizador ────────────────────────────────────
CREATE OR REPLACE FUNCTION atualizar_chave_pix_organizador(p_chave text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;
  IF p_chave IS NULL OR length(trim(p_chave)) = 0 THEN
    RAISE EXCEPTION 'Informe a chave Pix.';
  END IF;

  INSERT INTO organizer_accounts (user_id, cpf_cnpj, telefone, chave_pix, chave_pix_atualizada_em)
    VALUES (auth.uid(), '', '', trim(p_chave), now())
    ON CONFLICT (user_id) DO UPDATE
      SET chave_pix = trim(p_chave), chave_pix_atualizada_em = now();
END;
$$;

REVOKE ALL ON FUNCTION atualizar_chave_pix_organizador(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION atualizar_chave_pix_organizador(text) TO authenticated;

-- ── Troca de chave Pix da arena ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION atualizar_chave_pix_arena(p_arena_id uuid, p_chave text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;
  IF p_chave IS NULL OR length(trim(p_chave)) = 0 THEN
    RAISE EXCEPTION 'Informe a chave Pix.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM arenas WHERE id = p_arena_id AND dono_id = auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  INSERT INTO arena_accounts (arena_id, user_id, cpf_cnpj, telefone, chave_pix, chave_pix_atualizada_em)
    VALUES (p_arena_id, auth.uid(), '', '', trim(p_chave), now())
    ON CONFLICT (arena_id) DO UPDATE
      SET chave_pix = trim(p_chave), chave_pix_atualizada_em = now();
END;
$$;

REVOKE ALL ON FUNCTION atualizar_chave_pix_arena(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION atualizar_chave_pix_arena(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'harden-payout-account-security done';
