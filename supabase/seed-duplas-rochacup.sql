-- 5 duplas fake no RochaCup para testes
-- Usa os atletas fake (atleta2@rankftv.test … atleta11@rankftv.test)
-- Status variados: 3 pagos, 1 pendente, 1 estornado

DO $$
DECLARE
  v_carlos_id uuid;
  v_champ_id  uuid;

  -- IDs das categorias (até 3)
  v_cats      uuid[];
  v_cat_count int;

  -- IDs dos 10 atletas fake que vamos usar (atleta2..atleta11)
  v_atletas   uuid[];

  v_team_id   uuid;
  v_cat_id    uuid;
  v_a1        uuid;
  v_a2        uuid;

  -- Dados de cada dupla: índice no array de atletas, status_pagamento
  v_pairs     int[][] := ARRAY[
    ARRAY[1,2],  -- dupla 1: atleta2 + atleta3
    ARRAY[3,4],  -- dupla 2: atleta4 + atleta5
    ARRAY[5,6],  -- dupla 3: atleta6 + atleta7
    ARRAY[7,8],  -- dupla 4: atleta8 + atleta9
    ARRAY[9,10]  -- dupla 5: atleta10 + atleta11
  ];
  v_status    text[] := ARRAY['pago','pago','pago','pendente','estornado'];

  i int;
BEGIN
  -- Organizador (dono do RochaCup)
  SELECT id INTO v_carlos_id FROM auth.users
  WHERE email = 'carlosrocha0923@gmail.com' LIMIT 1;
  IF v_carlos_id IS NULL THEN
    RAISE EXCEPTION 'Usuário carlosrocha0923@gmail.com não encontrado.';
  END IF;

  -- RochaCup mais recente
  SELECT id INTO v_champ_id FROM championships
  WHERE organizador_id = v_carlos_id
    AND nome ILIKE '%RochaCup%'
  ORDER BY data_inicio DESC LIMIT 1;
  IF v_champ_id IS NULL THEN
    RAISE EXCEPTION 'RochaCup não encontrado.';
  END IF;

  -- Categorias do campeonato (até 3, ordem de criação)
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO v_cats
  FROM championship_categories
  WHERE championship_id = v_champ_id;
  IF v_cats IS NULL OR ARRAY_LENGTH(v_cats, 1) = 0 THEN
    RAISE EXCEPTION 'Nenhuma categoria no RochaCup.';
  END IF;
  v_cat_count := ARRAY_LENGTH(v_cats, 1);

  -- Coleta IDs dos atletas fake atleta2..atleta11
  SELECT ARRAY_AGG(sub.id ORDER BY sub.email)
  INTO v_atletas
  FROM (
    SELECT id, email FROM auth.users
    WHERE email LIKE '%@rankftv.test'
      AND email != 'atleta1@rankftv.test'
    ORDER BY email
    LIMIT 10
  ) sub;

  IF v_atletas IS NULL OR ARRAY_LENGTH(v_atletas, 1) < 10 THEN
    RAISE EXCEPTION 'Menos de 10 atletas fake disponíveis. Rode seed-atletas-rochhacup.sql primeiro.';
  END IF;

  -- Cria as 5 duplas
  FOR i IN 1..5 LOOP
    v_a1    := v_atletas[ v_pairs[i][1] ];
    v_a2    := v_atletas[ v_pairs[i][2] ];
    v_cat_id := v_cats[ ((i - 1) % v_cat_count) + 1 ];  -- distribui pelas categorias

    -- Evita duplicata (mesma dupla no mesmo campeonato)
    IF EXISTS (
      SELECT 1 FROM teams
      WHERE championship_id = v_champ_id
        AND atleta1_id = v_a1
    ) THEN
      RAISE NOTICE 'Dupla % já existe, pulando.', i;
      CONTINUE;
    END IF;

    INSERT INTO teams (championship_id, category_id, atleta1_id, atleta2_id, status)
    VALUES (v_champ_id, v_cat_id, v_a1, v_a2, 'confirmado')
    RETURNING id INTO v_team_id;

    INSERT INTO registrations (team_id, championship_id, category_id, valor, status_pagamento)
    SELECT
      v_team_id,
      v_champ_id,
      v_cat_id,
      cc.valor_inscricao / 100.0,
      v_status[i]
    FROM championship_categories cc WHERE cc.id = v_cat_id;

    -- Credential para os pagos
    IF v_status[i] = 'pago' THEN
      INSERT INTO credentials (user_id, championship_id, role, qr_token)
      VALUES (v_a1, v_champ_id, 'atleta', 'QR-FAKE-DUPLA-' || i || '-A1')
      ON CONFLICT (user_id, championship_id, role) DO NOTHING;

      INSERT INTO credentials (user_id, championship_id, role, qr_token)
      VALUES (v_a2, v_champ_id, 'atleta', 'QR-FAKE-DUPLA-' || i || '-A2')
      ON CONFLICT (user_id, championship_id, role) DO NOTHING;
    END IF;

    RAISE NOTICE 'Dupla % criada — status: % — categoria: %', i, v_status[i], v_cat_id;
  END LOOP;

  RAISE NOTICE 'Concluído! 5 duplas inseridas no RochaCup.';
END;
$$;
