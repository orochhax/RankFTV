-- Cartão padrão do aluno na arena, usado pra recorrência e aulas avulsas.
-- RODAR NO SQL EDITOR DO SUPABASE.
--
-- Guarda só o TOKEN devolvido pelo Asaas (POST /creditCard/tokenize) e
-- metadados não sensíveis (bandeira, 4 últimos dígitos, validade). Número
-- completo e CVV nunca chegam a esta tabela nem passam pelo Supabase fora
-- do corpo da chamada HTTP direta ao Asaas — ver lib/asaas.ts.

CREATE TABLE IF NOT EXISTS arena_student_cards (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id           uuid NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asaas_customer_id  text NOT NULL,
  asaas_card_token   text NOT NULL,
  brand              text,
  last4              text,
  exp_month          int,
  exp_year           int,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (arena_id, user_id)
);

CREATE INDEX IF NOT EXISTS arena_student_cards_user ON arena_student_cards (user_id);

ALTER TABLE arena_student_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arena_student_cards_own" ON arena_student_cards;
CREATE POLICY "arena_student_cards_own" ON arena_student_cards
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Só o próprio aluno enxerga o cartão — dono/professor/staff da arena não
-- precisam e não devem ver metadados de cartão de outra pessoa. Cobranças
-- usam o token via service_role no servidor, nunca lido pelo navegador do
-- dono/professor.
GRANT SELECT, INSERT, UPDATE, DELETE ON arena_student_cards TO authenticated;

NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'add-arena-student-cards done';
