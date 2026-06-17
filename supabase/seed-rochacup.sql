-- Cria o RochaCup vinculado à conta carlosrocha0923@gmail.com
-- Rodar no Supabase SQL Editor.

DO $$
DECLARE
  v_user_id   uuid;
  v_champ_id  uuid;
BEGIN

  -- 1. Pega o user_id pelo e-mail
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'carlosrocha0923@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado. Verifique o e-mail.';
  END IF;

  -- 2. Garante que a conta de organizador existe
  INSERT INTO organizer_accounts (user_id, telefone, chave_pix, tipo_chave_pix, habilitado)
  VALUES (v_user_id, '00000000000', 'carlosrocha0923@gmail.com', 'EMAIL', true)
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Cria o campeonato
  INSERT INTO championships (
    organizador_id,
    nome,
    descricao,
    regulamento,
    data_inicio,
    data_fim,
    inscricoes_inicio,
    inscricoes_fim,
    cidade,
    estado,
    local,
    status
  )
  VALUES (
    v_user_id,
    'RochaCup',
    'Campeonato de teste para validação da plataforma RankFTV.',
    'Regulamento padrão do RochaCup. Categorias mistas e masculinas.',
    '2026-07-12',
    '2026-07-13',
    '2026-06-20',
    '2026-07-10',
    'Eunápolis',
    'BA',
    'Arena Beach RochaCup',
    'inscricoes_abertas'
  )
  RETURNING id INTO v_champ_id;

  -- 4. Cria as categorias
  INSERT INTO championship_categories (championship_id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max, max_duplas)
  VALUES
    (v_champ_id, 'Iniciante',     'masculino', 15000, 0,    999,  20),
    (v_champ_id, 'Intermediário', 'masculino', 18000, 1000, 1999, 16),
    (v_champ_id, 'Amador',        'masculino', 22000, 2000, 2999, 12),
    (v_champ_id, 'Iniciante',     'feminino',  12000, 0,    999,  16);

  RAISE NOTICE 'RochaCup criado com sucesso! ID: %', v_champ_id;
END;
$$;
