-- Pagamentos de arena: mensalidade recorrente + aluguel pontual.
-- RODAR NO SQL EDITOR DO SUPABASE.

-- ── 1. Configuração de pagamento nos planos ───────────────────────────────────
ALTER TABLE arena_plans
  ADD COLUMN IF NOT EXISTS aceita_credito  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS aceita_debito   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dia_vencimento  int     NOT NULL DEFAULT 10
    CHECK (dia_vencimento BETWEEN 1 AND 28);
-- dia_vencimento: só para planos de mensalidade (dia do mês para cobrança recorrente)

-- ── 2. Dados de assinatura no vínculo aluno-arena ────────────────────────────
ALTER TABLE arena_students
  ADD COLUMN IF NOT EXISTS plan_id               uuid REFERENCES arena_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS asaas_customer_id     text,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text;

-- ── 3. Reservas de aluguel da quadra ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arena_rentals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id           uuid NOT NULL REFERENCES arenas(id)      ON DELETE CASCADE,
  plan_id            uuid NOT NULL REFERENCES arena_plans(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  data               date NOT NULL,
  hora               text NOT NULL,                -- "HH:MM"
  valor              numeric(10,2) NOT NULL,
  status_pagamento   text NOT NULL DEFAULT 'pendente'
                       CHECK (status_pagamento IN ('pendente','pago','estornado','cancelado')),
  repasse_status     text NOT NULL DEFAULT 'pendente'
                       CHECK (repasse_status IN ('pendente','processando','concluido','estornado','aguardando_liquidacao')),
  asaas_payment_id   text,
  asaas_customer_id  text,
  billing_type       text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arena_rentals_arena   ON arena_rentals (arena_id);
CREATE INDEX IF NOT EXISTS arena_rentals_user    ON arena_rentals (user_id);
CREATE INDEX IF NOT EXISTS arena_rentals_data    ON arena_rentals (data);

ALTER TABLE arena_rentals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arena_rentals_own"  ON arena_rentals;
DROP POLICY IF EXISTS "arena_rentals_dono" ON arena_rentals;

-- Usuário vê suas próprias reservas
CREATE POLICY "arena_rentals_own" ON arena_rentals
  FOR SELECT USING (user_id = auth.uid());

-- Dono da arena vê e gerencia todas as reservas
CREATE POLICY "arena_rentals_dono" ON arena_rentals
  FOR ALL USING (
    arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
  ) WITH CHECK (
    arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
  );

-- Usuário pode inserir suas próprias reservas
CREATE POLICY "arena_rentals_insert" ON arena_rentals
  FOR INSERT WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT ON arena_rentals TO authenticated;
GRANT UPDATE ON arena_rentals TO authenticated; -- para cancelar

NOTIFY migrations, 'add-arena-payments done';
