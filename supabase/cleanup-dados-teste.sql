-- Limpeza do banco de dados de teste.
-- Remove todos os dados de teste, mantendo apenas a conta real do CEO
-- (carlos.rocha0923@gmail.com).
--
-- ATENÇÃO: rode APENAS no ambiente de produção/desenvolvimento limpo.
-- Isso é irreversível.

-- Identifica o usuário real (CEO) pelo e-mail
-- (Ajuste o e-mail se necessário)
DO $$
DECLARE
  ceo_id UUID;
BEGIN
  SELECT id INTO ceo_id FROM auth.users WHERE email = 'carlosrocha0923@gmail.com';

  IF ceo_id IS NULL THEN
    RAISE EXCEPTION 'CEO user not found — verifique o e-mail e tente novamente';
  END IF;

  -- Remove registrations de outros usuários
  DELETE FROM registrations
  WHERE team_id IN (
    SELECT id FROM teams
    WHERE atleta1_id != ceo_id AND (atleta2_id IS NULL OR atleta2_id != ceo_id)
  );

  -- Remove teams que não envolvem o CEO
  DELETE FROM teams
  WHERE atleta1_id != ceo_id AND (atleta2_id IS NULL OR atleta2_id != ceo_id);

  -- Remove bracket_matches de campeonatos que não pertencem ao CEO
  DELETE FROM bracket_matches
  WHERE championship_id IN (
    SELECT id FROM championships WHERE organizador_id != ceo_id
  );

  -- Remove championship_categories de campeonatos que não pertencem ao CEO
  DELETE FROM championship_categories
  WHERE championship_id IN (
    SELECT id FROM championships WHERE organizador_id != ceo_id
  );

  -- Remove campeonatos que não pertencem ao CEO
  DELETE FROM championships WHERE organizador_id != ceo_id;

  -- Remove credentials de outros usuários
  DELETE FROM credentials WHERE user_id != ceo_id;

  -- Remove page_followers de outros usuários (não é o CEO quem segue)
  DELETE FROM page_followers WHERE user_id != ceo_id;

  -- Remove pages de outros usuários
  DELETE FROM pages WHERE owner_id != ceo_id;

  -- Remove ranking_entries de outros usuários
  DELETE FROM ranking_entries WHERE user_id != ceo_id;

  -- Remove conquistas de outros usuários
  DELETE FROM conquistas WHERE user_id != ceo_id;

  -- Remove notifications de outros usuários
  DELETE FROM notifications WHERE user_id != ceo_id;

  -- Remove organizer_accounts de outros usuários
  DELETE FROM organizer_accounts WHERE user_id != ceo_id;

  -- Remove profiles de outros usuários
  DELETE FROM profiles WHERE id != ceo_id;

  -- Deleta os usuários de teste do Supabase Auth (exceto o CEO)
  -- Nota: auth.users requer permissão de service_role — rode isso no SQL Editor
  -- com a chave de service_role ativa (padrão no Supabase Dashboard).
  DELETE FROM auth.users WHERE id != ceo_id;

  RAISE NOTICE 'Limpeza concluída. Usuário CEO (%) mantido.', ceo_id;
END $$;
