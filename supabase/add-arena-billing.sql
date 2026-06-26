-- Fase E: Cobranças recorrentes — mensalidade do aluno + assinatura do dono.
-- RODAR NO SQL EDITOR DO SUPABASE.

-- ── student_charges ───────────────────────────────────────────────────────────
-- Mensalidades cobradas do aluno pela arena. Repasse 100% ao dono (só gateway).

CREATE TABLE IF NOT EXISTS student_charges (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id           uuid NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  arena_student_id   uuid NOT NULL REFERENCES arena_students(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competencia        text NOT NULL,          -- "YYYY-MM" (mês de referência)
  valor              numeric(10,2) NOT NULL,
  status_pagamento   text NOT NULL DEFAULT 'pendente'
                       CHECK (status_pagamento IN ('pendente', 'pago', 'estornado', 'cancelado')),
  asaas_payment_id   text,
  pix_copy_paste     text,
  pix_qr_code_base64 text,
  invoice_url        text,
  pago_em            timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (arena_student_id, competencia)
);

CREATE INDEX IF NOT EXISTS student_charges_aluno  ON student_charges (arena_student_id);
CREATE INDEX IF NOT EXISTS student_charges_arena  ON student_charges (arena_id);
CREATE INDEX IF NOT EXISTS student_charges_user   ON student_charges (user_id);

ALTER TABLE student_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_charges_own"  ON student_charges;
DROP POLICY IF EXISTS "student_charges_dono" ON student_charges;

-- Aluno vê suas próprias cobranças
CREATE POLICY "student_charges_own" ON student_charges
  FOR SELECT USING (user_id = auth.uid());

-- Dono da arena vê e cria cobranças dos seus alunos
CREATE POLICY "student_charges_dono" ON student_charges
  FOR ALL USING (
    arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
  ) WITH CHECK (
    arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON student_charges TO authenticated;

-- ── arena_subscriptions ───────────────────────────────────────────────────────
-- Assinatura do DONO com a plataforma. Arena só fica ativa com status 'ativo'.

CREATE TABLE IF NOT EXISTS arena_subscriptions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id             uuid NOT NULL UNIQUE REFERENCES arenas(id) ON DELETE CASCADE,
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plano                text NOT NULL DEFAULT 'basico',
  status               text NOT NULL DEFAULT 'trial'
                         CHECK (status IN ('trial', 'ativo', 'inadimplente', 'cancelado')),
  asaas_subscription_id text,
  proximo_vencimento   date,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arena_subs_user ON arena_subscriptions (user_id);

ALTER TABLE arena_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arena_subs_own" ON arena_subscriptions;
CREATE POLICY "arena_subs_own" ON arena_subscriptions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON arena_subscriptions TO authenticated;

-- Cria registro de trial automático quando uma arena é criada.
-- Requer que arenas já exista (criada pela Fase C).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'arenas'
  ) THEN
    INSERT INTO arena_subscriptions (arena_id, user_id, plano, status)
    SELECT a.id, a.dono_id, 'basico', 'trial'
    FROM arenas a
    WHERE NOT EXISTS (
      SELECT 1 FROM arena_subscriptions s WHERE s.arena_id = a.id
    );
  END IF;
END $$;

NOTIFY migrations, 'add-arena-billing done';
