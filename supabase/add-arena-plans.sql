-- Planos da arena: mensalidade (múltiplos) e aluguel (único).
-- RODAR NO SQL EDITOR DO SUPABASE.

CREATE TABLE IF NOT EXISTS arena_plans (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id   uuid NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  tipo       text NOT NULL CHECK (tipo IN ('mensalidade', 'aluguel')),
  nome       text NOT NULL,
  descricao  text,
  valor      numeric(10,2) NOT NULL,
  ativo      boolean NOT NULL DEFAULT true,
  ordem      int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arena_plans_arena ON arena_plans (arena_id);

ALTER TABLE arena_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arena_plans_public_read" ON arena_plans;
DROP POLICY IF EXISTS "arena_plans_dono"        ON arena_plans;

-- Qualquer um pode ver os planos ativos
CREATE POLICY "arena_plans_public_read" ON arena_plans
  FOR SELECT USING (true);

-- Dono gerencia os planos da própria arena
CREATE POLICY "arena_plans_dono" ON arena_plans
  FOR ALL USING (
    arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
  ) WITH CHECK (
    arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
  );

GRANT SELECT ON arena_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON arena_plans TO authenticated;

NOTIFY migrations, 'add-arena-plans done';
