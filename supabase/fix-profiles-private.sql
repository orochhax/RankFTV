-- =============================================================
-- FIX (HIGH) — CPF e telefone eram publicamente legíveis.
--
-- A tabela `profiles` tem SELECT público (USING true), então a anon key
-- (que vai no JS do browser) conseguia ler cpf/telefone de QUALQUER um.
-- Solução: mover esses campos para `profiles_private`, com RLS que só
-- deixa o próprio dono ler/escrever, e remover as colunas do `profiles`.
--
-- ORDEM SEM QUEBRA:
--   PARTE 1 (cria a tabela + copia dados) → rode AGORA, antes/junto do deploy.
--   PARTE 2 (remove cpf/telefone do profiles) → rode DEPOIS que o deploy
--           do código novo terminar (Vercel "Ready").
-- Seguro rodar mais de uma vez.
-- =============================================================

-- ===================== PARTE 1 (rode agora) ==================

-- 1. Tabela privada (1 linha por usuário)
CREATE TABLE IF NOT EXISTS profiles_private (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf        text,
  telefone   text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Copia o que já existe em profiles (cpf/telefone não nulos)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'cpf'
  ) THEN
    INSERT INTO profiles_private (user_id, cpf, telefone)
    SELECT id, cpf, telefone
    FROM profiles
    WHERE cpf IS NOT NULL OR telefone IS NOT NULL
    ON CONFLICT (user_id) DO UPDATE
      SET cpf      = COALESCE(EXCLUDED.cpf, profiles_private.cpf),
          telefone = COALESCE(EXCLUDED.telefone, profiles_private.telefone);
  END IF;
END $$;

-- 3. RLS: só o dono acessa a própria linha
ALTER TABLE profiles_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_private_select ON profiles_private;
CREATE POLICY profiles_private_select ON profiles_private FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_private_insert ON profiles_private;
CREATE POLICY profiles_private_insert ON profiles_private FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_private_update ON profiles_private;
CREATE POLICY profiles_private_update ON profiles_private FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. Grants: authenticated (dono via RLS) e service_role (admin). anon: NADA.
GRANT SELECT, INSERT, UPDATE ON profiles_private TO authenticated;
GRANT ALL    ON profiles_private TO service_role;

NOTIFY pgrst, 'reload schema';


-- ============ PARTE 2 (rode só APÓS o deploy terminar) ============
-- Fecha o vazamento: remove as colunas sensíveis do profiles público.
-- Enquanto não rodar isto, cpf/telefone antigos ainda ficam legíveis.

-- ALTER TABLE profiles DROP COLUMN IF EXISTS cpf;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS telefone;
-- NOTIFY pgrst, 'reload schema';
