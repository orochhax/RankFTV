-- =============================================================
-- RANKFTV — Conta de organizador (Fase 1: split de pagamento)
-- Execute no Supabase SQL Editor (pode rodar mais de uma vez).
--
-- Qualquer usuário pode virar organizador; basta completar os dados
-- abaixo. O asaas_wallet_id é preenchido automaticamente quando a
-- subconta é criada no Asaas via API.
-- =============================================================

CREATE TABLE IF NOT EXISTS organizer_accounts (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  cpf_cnpj         text        NOT NULL,
  telefone         text        NOT NULL,
  -- Preenchido pela API quando a subconta Asaas é criada:
  asaas_account_id text,
  asaas_wallet_id  text,
  -- true = subconta criada e aprovada; false = aguardando ou pendente
  habilitado       boolean     NOT NULL DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizer_accounts_user ON organizer_accounts(user_id);

-- ── SEGURANÇA (RLS) ───────────────────────────────────────────

ALTER TABLE organizer_accounts ENABLE ROW LEVEL SECURITY;

-- Usuário vê e edita apenas a própria conta de organizador.
DROP POLICY IF EXISTS organizer_accounts_select ON organizer_accounts;
CREATE POLICY organizer_accounts_select ON organizer_accounts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS organizer_accounts_insert ON organizer_accounts;
CREATE POLICY organizer_accounts_insert ON organizer_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS organizer_accounts_update ON organizer_accounts;
CREATE POLICY organizer_accounts_update ON organizer_accounts FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── GRANTS ────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON organizer_accounts TO authenticated;
