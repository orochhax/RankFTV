-- =============================================================
-- INGRESSOS DE PLATEIA (espectadores)
--
-- Mesma conta/mesmo motor de repasse das inscrições de atleta: o dinheiro cai
-- na conta Asaas da plataforma e é repassado via Pix pra MESMA chave do
-- organizador. A diferença é só a "etiqueta" (atleta x espectador) pro
-- financeiro mostrar o detalhamento.
--
-- Decisões de produto (jun/2026):
--  - Vários tipos de ingresso (inteira/meia/VIP) por campeonato.
--  - Compra como VISITANTE (sem conta): nome/email/cpf, QR vai por e-mail.
--  - SEM taxa da plataforma por enquanto (repassa 100% — só o custo do gateway).
--
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.
-- =============================================================

-- Tipos de ingresso (inteira/meia/VIP) por campeonato
CREATE TABLE IF NOT EXISTS spectator_ticket_types (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id uuid NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  nome            text NOT NULL,
  valor           numeric NOT NULL DEFAULT 0,
  ativo           boolean NOT NULL DEFAULT true,
  ordem           int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spectator_types_champ ON spectator_ticket_types(championship_id);

-- Ingressos comprados (checkout de visitante)
CREATE TABLE IF NOT EXISTS spectator_tickets (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id       uuid NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  ticket_type_id        uuid REFERENCES spectator_ticket_types(id) ON DELETE SET NULL,
  tipo_nome             text,                         -- snapshot do nome do tipo
  comprador_nome        text NOT NULL,
  comprador_email       text NOT NULL,
  comprador_cpf         text,                         -- protegido por RLS (só dono lê)
  valor                 numeric NOT NULL DEFAULT 0,
  status_pagamento      text NOT NULL DEFAULT 'pendente',  -- pendente | pago | estornado
  billing_type          text,
  asaas_payment_id      text,
  pix_copy_paste        text,
  pix_qr_code_base64    text,
  invoice_url           text,
  qr_token              text NOT NULL DEFAULT (gen_random_uuid())::text,
  code                  text,                         -- código curto pra digitar na portaria
  checked_in            boolean NOT NULL DEFAULT false,
  checkin_at            timestamptz,
  repasse_status        text NOT NULL DEFAULT 'pendente',  -- pendente|processando|aguardando_liquidacao|repassado|estornado|erro
  repasse_data_prevista timestamptz,
  repasse_transfer_id   text,
  repasse_erro          text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spectator_tickets_champ ON spectator_tickets(championship_id);

ALTER TABLE spectator_tickets DROP CONSTRAINT IF EXISTS spectator_tickets_status_pagamento_check;
ALTER TABLE spectator_tickets
  ADD CONSTRAINT spectator_tickets_status_pagamento_check
  CHECK (status_pagamento IN ('pendente', 'pago', 'estornado'));

ALTER TABLE spectator_tickets DROP CONSTRAINT IF EXISTS spectator_tickets_repasse_status_check;
ALTER TABLE spectator_tickets
  ADD CONSTRAINT spectator_tickets_repasse_status_check
  CHECK (repasse_status IN ('pendente','processando','aguardando_liquidacao','repassado','estornado','erro'));

-- ── RLS ──────────────────────────────────────────────────────
-- Tipos: leitura pública (pra mostrar os preços na página de compra),
-- escrita só do dono do campeonato.
ALTER TABLE spectator_ticket_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spectator_types_select ON spectator_ticket_types;
CREATE POLICY spectator_types_select ON spectator_ticket_types FOR SELECT USING (true);

DROP POLICY IF EXISTS spectator_types_write ON spectator_ticket_types;
CREATE POLICY spectator_types_write ON spectator_ticket_types FOR ALL
  USING (EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = spectator_ticket_types.championship_id AND c.organizador_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = spectator_ticket_types.championship_id AND c.organizador_id = auth.uid()
  ));

-- Ingressos: leitura só do dono do campeonato. A escrita (checkout de visitante
-- e webhook) é feita pelo service_role, que bypassa RLS — visitante não tem conta.
ALTER TABLE spectator_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spectator_tickets_select_owner ON spectator_tickets;
CREATE POLICY spectator_tickets_select_owner ON spectator_tickets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = spectator_tickets.championship_id AND c.organizador_id = auth.uid()
  ));

-- Grants
GRANT SELECT                         ON spectator_ticket_types TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE         ON spectator_ticket_types TO authenticated; -- limitado pela RLS
GRANT ALL                            ON spectator_ticket_types TO service_role;
GRANT SELECT                         ON spectator_tickets       TO authenticated; -- limitado pela RLS (só dono)
GRANT ALL                            ON spectator_tickets       TO service_role;

NOTIFY pgrst, 'reload schema';
