-- Fase B: ingresso de atleta sem login (guest checkout).
-- Molde: spectator_tickets + campos de categoria + dados do parceiro.
-- RODAR NO SQL EDITOR DO SUPABASE.

CREATE TABLE IF NOT EXISTS athlete_tickets (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id      uuid NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  category_id          uuid REFERENCES championship_categories(id) ON DELETE SET NULL,
  categoria_nome       text,            -- snapshot; persiste mesmo se categoria mudar nome

  -- Comprador (atleta 1, quem paga)
  comprador_nome       text NOT NULL,
  comprador_cpf        text NOT NULL,
  comprador_email      text NOT NULL,
  comprador_zap        text,
  comprador_genero     text CHECK (comprador_genero IN ('masculino', 'feminino')),
  comprador_nascimento date,            -- opcional: faixa etária
  comprador_camisa     text,            -- opcional: tamanho de kit

  -- Parceiro (atleta 2)
  parceiro_nome        text NOT NULL,
  parceiro_cpf         text NOT NULL,
  parceiro_email       text,
  parceiro_zap         text,
  parceiro_genero      text CHECK (parceiro_genero IN ('masculino', 'feminino')),

  -- Pagamento
  valor                numeric(10,2) NOT NULL DEFAULT 0,
  status_pagamento     text NOT NULL DEFAULT 'pendente'
                         CHECK (status_pagamento IN ('pendente', 'pago', 'estornado')),
  billing_type         text,
  asaas_payment_id     text,
  pix_copy_paste       text,
  pix_qr_code_base64   text,
  invoice_url          text,

  -- Credencial de entrada
  code                 text UNIQUE,
  qr_token             text UNIQUE DEFAULT gen_random_uuid()::text,
  access_token         text NOT NULL DEFAULT gen_random_uuid()::text,
  checked_in           boolean NOT NULL DEFAULT false,
  checkin_at           timestamptz,

  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Índices para busca pública por CPF+email e para o painel do organizador
CREATE INDEX IF NOT EXISTS athlete_tickets_comprador
  ON athlete_tickets (comprador_cpf, comprador_email);
CREATE INDEX IF NOT EXISTS athlete_tickets_parceiro
  ON athlete_tickets (parceiro_cpf, parceiro_email);
CREATE INDEX IF NOT EXISTS athlete_tickets_championship
  ON athlete_tickets (championship_id);
CREATE UNIQUE INDEX IF NOT EXISTS athlete_tickets_access_token_unique
  ON athlete_tickets(access_token);

-- RLS: visitante não tem conta → escrita via service_role (bypass RLS).
--       Dono do campeonato lê os ingressos do seu evento.
ALTER TABLE athlete_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "athlete_tickets_owner_select" ON athlete_tickets;
CREATE POLICY "athlete_tickets_owner_select" ON athlete_tickets
  FOR SELECT USING (
    championship_id IN (
      SELECT id FROM championships WHERE organizador_id = auth.uid()
    )
  );

GRANT ALL ON TABLE athlete_tickets TO authenticated;

-- Após rodar: NOTIFY "add-athlete-tickets done";
NOTIFY migrations, 'add-athlete-tickets done';
