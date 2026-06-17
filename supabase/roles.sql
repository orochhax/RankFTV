-- Sistema de roles da plataforma RankFTV.
-- Roda esse SQL no SQL Editor do Supabase.

-- 1. Adiciona a coluna role em profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'ceo'));

-- 2. Define o CEO (Carlos)
UPDATE profiles
SET role = 'ceo'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'carlosrocha0923@gmail.com'
);

-- 3. Impede que o próprio usuário altere seu role via client.
--    O role só pode ser mudado por alguém com service_role (você, via SQL ou admin panel futuro).
--    A policy de UPDATE existente no profiles deve excluir a coluna role.
--    Se ainda não há policy de UPDATE no profiles, cria aqui:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_update_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "profiles_update_own" ON profiles
        FOR UPDATE USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    $policy$;
  END IF;
END $$;

-- Atenção: a policy acima permite o usuário atualizar qualquer campo do próprio perfil,
-- incluindo role. Para bloquear especificamente a coluna role no client, use um trigger:
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Permite mudança de role só quando vem do service_role (admin)
  IF NEW.role <> OLD.role AND current_setting('role') <> 'service_role' THEN
    RAISE EXCEPTION 'Alteração de role não permitida pelo client.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_change_trigger ON profiles;
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_change();

-- Para dar role de admin pra alguém (rodar manualmente quando precisar):
-- UPDATE profiles SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'email-do-admin@exemplo.com');

-- Para remover admin (rebaixar de volta pra user):
-- UPDATE profiles SET role = 'user'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'email@exemplo.com');
