-- =============================================================
-- Seed: 16 duplas no RochaCup → Bracket de Oitavas de Final
-- Cria 30 atletas (oitavas01..oitavas30@rankftv.test) + 15 duplas
-- na PRIMEIRA categoria do RochaCup, todas com status 'pago'.
-- Combinado com a 1 dupla paga já existente = 16 times → Oitavas.
--
-- Rode no SQL Editor do Supabase (pode rodar 1x só).
-- =============================================================

DO $$
DECLARE
  v_carlos_id uuid;
  v_champ_id  uuid;
  v_cat_id    uuid;

  -- 30 atletas com nomes brasileiros realistas (15 duplas)
  v_nomes text[] := ARRAY[
    'Amanda Ribeiro',    'André Santos',
    'Beatriz Costa',     'Bruno Lima',
    'Camila Ferreira',   'Diego Alves',
    'Daniela Souza',     'Eduardo Pereira',
    'Elena Martins',     'Felipe Rodrigues',
    'Fernanda Oliveira', 'Gabriel Silva',
    'Giovana Carvalho',  'Gustavo Monteiro',
    'Helena Barbosa',    'Henrique Torres',
    'Isabela Freitas',   'Igor Nascimento',
    'Juliana Melo',      'João Pedro Gomes',
    'Katia Vieira',      'Lucas Castro',
    'Larissa Campos',    'Leonardo Nunes',
    'Mariana Moreira',   'Marcos Dias',
    'Natalia Cunha',     'Nicolas Cardoso',
    'Paula Azevedo',     'Pedro Henrique Ramos'
  ];

  v_uids    uuid[] := ARRAY[]::uuid[];
  v_uid     uuid;
  v_team_id uuid;
  v_email   text;
  v_nome    text;
  v_slug    text;
  i         int;
BEGIN

  -- ── organizador ──────────────────────────────────────────────
  SELECT id INTO v_carlos_id FROM auth.users
  WHERE email = 'carlosrocha0923@gmail.com' LIMIT 1;
  IF v_carlos_id IS NULL THEN
    RAISE EXCEPTION 'Usuário carlosrocha0923@gmail.com não encontrado.';
  END IF;

  -- ── RochaCup ─────────────────────────────────────────────────
  SELECT id INTO v_champ_id FROM championships
  WHERE organizador_id = v_carlos_id
    AND nome ILIKE '%RochaCup%'
  ORDER BY data_inicio DESC LIMIT 1;
  IF v_champ_id IS NULL THEN
    RAISE EXCEPTION 'RochaCup não encontrado.';
  END IF;

  -- ── primeira categoria ────────────────────────────────────────
  SELECT id INTO v_cat_id FROM championship_categories
  WHERE championship_id = v_champ_id
  ORDER BY created_at LIMIT 1;
  IF v_cat_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma categoria no RochaCup.';
  END IF;

  RAISE NOTICE 'Campeonato: %  |  Categoria: %', v_champ_id, v_cat_id;

  -- ── cria / reutiliza 30 atletas ───────────────────────────────
  FOR i IN 1..30 LOOP
    v_nome  := v_nomes[i];
    v_slug  := lower(regexp_replace(v_nome, '[^a-zA-Z]', '', 'g')) || i::text;
    v_email := 'oitavas' || lpad(i::text, 2, '0') || '@rankftv.test';

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
      INSERT INTO auth.users (
        id,
        aud, role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token
      ) VALUES (
        gen_random_uuid(),
        'authenticated', 'authenticated',
        v_email,
        crypt('senha123', gen_salt('bf', 10)),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('nome', v_nome, 'username', v_slug),
        now(), now(),
        '', ''
      );
      -- O trigger handle_new_user() cria o profiles automaticamente.
    END IF;

    SELECT id INTO v_uid FROM auth.users WHERE email = v_email;
    v_uids := array_append(v_uids, v_uid);
  END LOOP;

  RAISE NOTICE '30 atletas prontos.';

  -- ── cria 15 duplas na primeira categoria ─────────────────────
  FOR i IN 1..15 LOOP
    IF EXISTS (
      SELECT 1 FROM teams
      WHERE championship_id = v_champ_id
        AND atleta1_id = v_uids[2 * i - 1]
    ) THEN
      RAISE NOTICE 'Dupla % já existe, pulando.', i;
      CONTINUE;
    END IF;

    INSERT INTO teams (championship_id, category_id, atleta1_id, atleta2_id, status)
    VALUES (v_champ_id, v_cat_id, v_uids[2*i - 1], v_uids[2*i], 'confirmado')
    RETURNING id INTO v_team_id;

    INSERT INTO registrations (team_id, championship_id, category_id, valor, status_pagamento)
    SELECT v_team_id, v_champ_id, v_cat_id, cc.valor_inscricao / 100.0, 'pago'
    FROM championship_categories cc
    WHERE cc.id = v_cat_id;

    RAISE NOTICE 'Dupla %/%: % & %', i, 15, v_nomes[2*i - 1], v_nomes[2*i];
  END LOOP;

  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Concluído! 15 duplas inseridas.';
  RAISE NOTICE 'Primeira categoria agora tem 16 duplas pagas';
  RAISE NOTICE '→ bracket: Oitavas → Quartas → Semis → Final';
  RAISE NOTICE '=================================================';
END;
$$;
