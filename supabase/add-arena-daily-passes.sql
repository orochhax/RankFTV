-- Estende arena_plans.tipo para incluir 'diaria'
-- Execute no Supabase SQL Editor

-- 1. Remove a constraint antiga e cria nova com 'diaria'
ALTER TABLE arena_plans DROP CONSTRAINT IF EXISTS arena_plans_tipo_check;
ALTER TABLE arena_plans
  ADD CONSTRAINT arena_plans_tipo_check
  CHECK (tipo IN ('mensalidade', 'aluguel', 'diaria'));

-- 2. Cria tabela de diárias de aluno (pagamento único por sessão de treino)
CREATE TABLE IF NOT EXISTS arena_daily_passes (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id            uuid          NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  plan_id             uuid          NOT NULL REFERENCES arena_plans(id) ON DELETE CASCADE,
  user_id             uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data                date          NOT NULL,
  valor               numeric(10,2) NOT NULL,
  status_pagamento    text          NOT NULL DEFAULT 'pendente'
                        CHECK (status_pagamento IN ('pendente','pago','estornado','cancelado')),
  repasse_status      text          NOT NULL DEFAULT 'pendente'
                        CHECK (repasse_status IN ('pendente','processando','aguardando_liquidacao','concluido','estornado')),
  asaas_payment_id    text,
  asaas_customer_id   text,
  billing_type        text,
  created_at          timestamptz   NOT NULL DEFAULT now()
);

-- 3. RLS
ALTER TABLE arena_daily_passes ENABLE ROW LEVEL SECURITY;

-- Aluno vê as próprias diárias
CREATE POLICY "aluno_ver_proprias_diarias" ON arena_daily_passes
  FOR SELECT USING (user_id = auth.uid());

-- Dono da arena vê todas da arena
CREATE POLICY "dono_ver_diarias_arena" ON arena_daily_passes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM arenas
      WHERE arenas.id = arena_daily_passes.arena_id
        AND arenas.dono_id = auth.uid()
    )
  );

-- Usuário autenticado pode inserir (próprio user_id)
CREATE POLICY "autenticado_inserir_diaria" ON arena_daily_passes
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Service role (webhook) pode fazer tudo
CREATE POLICY "service_role_tudo_diarias" ON arena_daily_passes
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
