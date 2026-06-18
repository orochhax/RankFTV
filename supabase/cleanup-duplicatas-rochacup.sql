-- Remove TODAS as inscrições, times e credenciais do seu usuário no RochaCup
-- para começar do zero com a validação de duplicata ativa.
-- Rodar no Supabase SQL Editor.

DO $$
DECLARE
  v_user_id   uuid;
  v_champ_id  uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'carlosrocha0923@gmail.com' LIMIT 1;
  SELECT id INTO v_champ_id FROM championships WHERE nome = 'RochaCup' LIMIT 1;

  -- Remove registrations ligadas aos teams deste usuário neste camp
  DELETE FROM registrations
  WHERE team_id IN (
    SELECT id FROM teams
    WHERE championship_id = v_champ_id
      AND (atleta1_id = v_user_id OR atleta2_id = v_user_id)
  );

  -- Remove os teams
  DELETE FROM teams
  WHERE championship_id = v_champ_id
    AND (atleta1_id = v_user_id OR atleta2_id = v_user_id);

  -- Remove credenciais
  DELETE FROM credentials
  WHERE championship_id = v_champ_id
    AND user_id = v_user_id;

  RAISE NOTICE 'Limpeza concluída para user % no camp %', v_user_id, v_champ_id;
END;
$$;
