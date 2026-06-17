-- =============================================================
-- RANKFTV — Inscrições e duplas (Fase 1: pagamento com split)
-- Execute no Supabase SQL Editor (pode rodar mais de uma vez).
-- =============================================================

-- CPF do atleta, salvo na primeira inscrição paga.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf text;

-- ── TABELAS ──────────────────────────────────────────────────

-- Dupla inscrita num campeonato. atleta1 fez a inscrição; atleta2
-- é o parceiro convidado (pode ser null até aceitar o convite).
CREATE TABLE IF NOT EXISTS teams (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  championship_id   uuid        NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  category_id       uuid        NOT NULL REFERENCES championship_categories(id),
  atleta1_id        uuid        NOT NULL REFERENCES auth.users(id),
  atleta2_id        uuid        REFERENCES auth.users(id),
  parceiro_username text,
  status            text        NOT NULL DEFAULT 'convite_pendente'
                      CHECK (status IN ('convite_pendente', 'confirmado', 'cancelado')),
  created_at        timestamptz DEFAULT now()
);

-- Inscrição com dados do pagamento. Um atleta paga o valor cheio da dupla.
CREATE TABLE IF NOT EXISTS registrations (
  id                   uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id              uuid         NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  championship_id      uuid         NOT NULL REFERENCES championships(id),
  category_id          uuid         NOT NULL REFERENCES championship_categories(id),
  valor                numeric(10,2) NOT NULL,
  status_pagamento     text         NOT NULL DEFAULT 'pendente'
                         CHECK (status_pagamento IN ('pendente', 'pago', 'estornado')),
  asaas_payment_id     text,
  invoice_url          text,   -- link de pagamento (cartão débito/crédito)
  pix_copy_paste       text,
  pix_qr_code_base64   text,
  created_at           timestamptz  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teams_championship ON teams(championship_id);
CREATE INDEX IF NOT EXISTS idx_teams_atleta1      ON teams(atleta1_id);
CREATE INDEX IF NOT EXISTS idx_registrations_team ON registrations(team_id);
CREATE INDEX IF NOT EXISTS idx_reg_asaas_payment  ON registrations(asaas_payment_id);

-- ── SEGURANÇA (RLS) ───────────────────────────────────────────

ALTER TABLE teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ver duplas (lista pública no detalhe do campeonato).
DROP POLICY IF EXISTS teams_select ON teams;
CREATE POLICY teams_select ON teams FOR SELECT USING (true);

-- Só o atleta1 cria a dupla em nome dele mesmo.
DROP POLICY IF EXISTS teams_insert ON teams;
CREATE POLICY teams_insert ON teams FOR INSERT
  WITH CHECK (atleta1_id = auth.uid());

-- Atleta2 pode atualizar o status (aceitar/recusar convite).
DROP POLICY IF EXISTS teams_update ON teams;
CREATE POLICY teams_update ON teams FOR UPDATE
  USING (atleta1_id = auth.uid() OR atleta2_id = auth.uid());

-- Atleta1 pode ver a própria inscrição; atleta2 também.
DROP POLICY IF EXISTS registrations_select ON registrations;
CREATE POLICY registrations_select ON registrations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = team_id
      AND (t.atleta1_id = auth.uid() OR t.atleta2_id = auth.uid())
  ));

-- Só o atleta1 cria a inscrição.
DROP POLICY IF EXISTS registrations_insert ON registrations;
CREATE POLICY registrations_insert ON registrations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = team_id AND t.atleta1_id = auth.uid()
  ));

-- Atualização feita só via service_role (webhook do Asaas atualiza status).
-- O atleta1 pode atualizar enquanto pendente (ex: cancelar antes de pagar).
DROP POLICY IF EXISTS registrations_update ON registrations;
CREATE POLICY registrations_update ON registrations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = team_id AND t.atleta1_id = auth.uid()
  ));

-- ── GRANTS ────────────────────────────────────────────────────

GRANT SELECT ON teams, registrations TO anon, authenticated;
GRANT INSERT, UPDATE ON teams, registrations TO authenticated;
