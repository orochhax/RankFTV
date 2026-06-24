-- =============================================================
-- SEED COMPLETO — Estação Open · Etapa Brasília
--
-- O que este script faz:
--   1. Atualiza o perfil @rochhax (rating, camisa, gênero)
--   2. Insere conquistas do Carlos com destaque na Home
--   3. Popula histórico de campeonatos e ranking geral do Carlos
--   4. Garante que o campeonato tem 4 categorias (cria se faltar)
--   5. Cria 40 atletas fake → 20 duplas → 20 inscrições PAGAS
--   6. Cria credenciais (mix de checked_in / não)
--   7. Cria shirt_production (mix de produzido / não)
--
-- Seguro rodar UMA VEZ. Para limpar, use o bloco de limpeza no final.
-- =============================================================

DO $$
DECLARE
  -- IDs principais
  v_ceo_id      uuid;
  v_champ_id    uuid;
  v_athlete_id  uuid;

  -- Categorias
  cat_masc_a    uuid;
  cat_masc_b    uuid;
  cat_fem       uuid;
  cat_mista     uuid;

  -- Auxiliares de loop
  u1 uuid; u2 uuid;
  new_team uuid;
  new_reg  uuid;
  i int;
  c int := 0;
  v_ev record;

  -- Arrays de categorias para ciclagem por dupla
  cats        uuid[]    := ARRAY[]::uuid[];
  cat_generos text[]    := ARRAY[]::text[];
  cat_valores numeric[] := ARRAY[]::numeric[];
  cat_id      uuid;
  cat_genero  text;
  cat_valor   numeric;
  team_genero text;

  -- Tamanhos de camisa
  tamanhos text[] := ARRAY['PP','P','M','G','GG','XGG'];

  -- Nomes
  masc_first text[] := ARRAY[
    'Lucas','Gabriel','Mateus','Rafael','Bruno','Thiago','Felipe','Pedro',
    'Gustavo','Diego','André','Vinícius','Caio','Rodrigo','Marcelo','Daniel',
    'Eduardo','Leonardo','Fábio','Igor','Henrique','Murilo','Otávio','Renato',
    'Samuel','Vitor','Wesley','Alan','Breno','César'];
  fem_first text[] := ARRAY[
    'Ana','Beatriz','Carla','Daniela','Eduarda','Fernanda','Gabriela','Helena',
    'Isabela','Júlia','Larissa','Mariana','Natália','Patrícia','Renata','Sofia',
    'Tatiana','Vanessa','Yasmin','Bruna','Camila','Letícia','Marina','Priscila',
    'Rebeca','Sabrina','Talita','Vivian','Aline','Bianca'];
  sobrenomes text[] := ARRAY[
    'Silva','Santos','Oliveira','Souza','Lima','Pereira','Costa','Almeida',
    'Nascimento','Araújo','Ribeiro','Carvalho','Gomes','Martins','Rocha','Barbosa',
    'Mendes','Cardoso','Teixeira','Moraes','Cavalcanti','Dias','Castro','Campos',
    'Freitas','Pinto','Moreira','Nunes','Vieira','Ramos'];

  nome1 text; nome2 text;
  rating1 int; rating2 int;
  shirt1 text; shirt2 text;
  repasse_st  text;
  checkin1    bool; checkin2    bool;
  prod1       bool; prod2       bool;
  checkin_ts1 timestamptz; checkin_ts2 timestamptz;

BEGIN

  -- ─────────────────────────────────────────────────────────────
  -- 1. BUSCA DO CEO
  -- ─────────────────────────────────────────────────────────────
  SELECT id INTO v_ceo_id FROM auth.users
  WHERE email = 'carlosrocha0923@gmail.com' LIMIT 1;

  IF v_ceo_id IS NULL THEN
    RAISE EXCEPTION 'Conta carlosrocha0923@gmail.com não encontrada.';
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 2. PERFIL @rochhax — jogador avançado A / profissional
  -- ─────────────────────────────────────────────────────────────
  UPDATE profiles SET
    rating         = 1420,
    tamanho_camisa = 'G',
    genero         = 'masculino'
  WHERE id = v_ceo_id;

  -- ─────────────────────────────────────────────────────────────
  -- 3. CONQUISTAS (aparecem no card Meu Desempenho na Home)
  -- ─────────────────────────────────────────────────────────────
  DELETE FROM conquistas WHERE user_id = v_ceo_id;

  INSERT INTO conquistas (user_id, titulo, descricao, icone, cor, data_conquistada, destaque_ordem) VALUES
    (v_ceo_id, '🥇 Campeão Profissional', 'Campeão absoluto na categoria Profissional',      '🥇', '#F59E0B', '2026-02-21', 1),
    (v_ceo_id, '🏆 Triple Crown',         'Venceu 3 campeonatos seguidos no mesmo ano',      '🏆', '#6366F1', '2025-09-01', 2),
    (v_ceo_id, '⚡ Série Invicto',        '10 vitórias consecutivas na temporada 2025',      '⚡', '#10B981', '2025-08-23', 3),
    (v_ceo_id, '🎯 Sniper',               'Maior pontuação em jogo único (48 pontos)',        '🎯', '#EF4444', '2025-06-14', NULL),
    (v_ceo_id, '🌊 Rei da Areia',         'Participou de 20 campeonatos na plataforma',      '🌊', '#0EA5E9', '2025-03-15', NULL),
    (v_ceo_id, '🚀 Ascensão Meteórica',   'Subiu 6 categorias em menos de 2 anos',           '🚀', '#A855F7', '2024-06-22', NULL),
    (v_ceo_id, '💪 Guerreiro',            'Completou todos os jogos de uma edição sem W.O.', '💪', '#84CC16', '2024-10-19', NULL),
    (v_ceo_id, '🤝 Parceiro de Ferro',    'Jogou com o mesmo parceiro por 5 campeonatos',    '🤝', '#F97316', '2023-10-21', NULL);

  -- ─────────────────────────────────────────────────────────────
  -- 4. HISTÓRICO DE CAMPEONATOS + RANKING GERAL
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO external_athletes (nome, instagram, genero, user_id)
  VALUES ('Carlos', 'rochhax', 'masculino', v_ceo_id)
  ON CONFLICT (instagram)
    DO UPDATE SET user_id = EXCLUDED.user_id, genero = EXCLUDED.genero
  RETURNING id INTO v_athlete_id;

  -- Se o atleta já existia sem RETURNING, busca o id
  IF v_athlete_id IS NULL THEN
    SELECT id INTO v_athlete_id FROM external_athletes WHERE instagram = 'rochhax';
  END IF;

  DELETE FROM external_results WHERE athlete_id = v_athlete_id;

  FOR v_ev IN
    SELECT * FROM (VALUES
      ('Praia Cup — Estreantes',    '2023-02-18'::date, 'estreante_b',     3, 'Diego',  70),
      ('Arena Open',                '2023-06-24'::date, 'estreante_a',     3, 'Diego',  85),
      ('Copa Litoral',              '2023-10-21'::date, 'iniciante_b',     2, 'Rafa',  100),
      ('Circuito Verão',            '2024-02-17'::date, 'iniciante_a',     2, 'Rafa',  110),
      ('Torneio da Cidade',         '2024-06-22'::date, 'intermediario_b', 1, 'Bruno', 120),
      ('Open Regional',             '2024-10-19'::date, 'intermediario_a', 2, 'Bruno', 130),
      ('Desafio dos Campeões',      '2025-03-15'::date, 'avancado_b',      1, 'Léo',  140),
      ('Master Cup',                '2025-08-23'::date, 'avancado_a',      2, 'Léo',  150),
      ('Team Águia Footvolley Cup', '2026-02-21'::date, 'profissional',    1, 'Léo',  160)
    ) AS x(nome, data, categoria, colocacao, parceiro, pontos)
  LOOP
    INSERT INTO external_tournaments (nome_circuito, tier, data)
    VALUES (v_ev.nome, 'nacional', v_ev.data)
    ON CONFLICT (nome_circuito, data) DO NOTHING;

    INSERT INTO external_results (tournament_id, athlete_id, colocacao, parceiro_nome, pontos, categoria)
    SELECT et.id, v_athlete_id, v_ev.colocacao, v_ev.parceiro, v_ev.pontos, v_ev.categoria
    FROM external_tournaments et
    WHERE et.nome_circuito = v_ev.nome AND et.data = v_ev.data;
  END LOOP;

  DELETE FROM ranking_individual WHERE instagram = 'rochhax';
  INSERT INTO ranking_individual (nome, instagram, genero, pontos)
  VALUES ('Carlos', 'rochhax', 'masculino', 1065);

  RAISE NOTICE 'Perfil, conquistas, histórico e ranking de @rochhax prontos.';

  -- ─────────────────────────────────────────────────────────────
  -- 5. CAMPEONATO — Estação Open · Etapa Brasília
  -- ─────────────────────────────────────────────────────────────
  SELECT id INTO v_champ_id FROM championships
  WHERE nome ILIKE '%Esta%o Open%Bras%'
     OR nome ILIKE '%Esta%ao Open%Bras%'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_champ_id IS NULL THEN
    INSERT INTO championships (
      organizador_id, nome, descricao, regulamento,
      data_inicio, data_fim, cidade, estado, local,
      status, taxa_plataforma,
      banner_from, banner_to
    ) VALUES (
      v_ceo_id,
      'Estação Open – Etapa Brasília',
      'Maior Open de Futevôlei da capital federal. Três dias de competição na Estação das Artes, com transmissão ao vivo.',
      'Regulamento oficial CBFV. Categoria definida pelo rating da dupla. Arbitragem profissional. Saques acima de 5 jogadores permitidos.',
      '2026-07-18', '2026-07-20',
      'Brasília', 'DF',
      'Estação das Artes – Setor Comercial Sul, Brasília',
      'inscricoes_abertas', 10,
      'from-blue-700', 'to-cyan-500'
    )
    RETURNING id INTO v_champ_id;
    RAISE NOTICE 'Campeonato criado do zero: %', v_champ_id;
  ELSE
    RAISE NOTICE 'Campeonato encontrado: %', v_champ_id;
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 6. CATEGORIAS — garante as 4 categorias base
  -- ─────────────────────────────────────────────────────────────
  -- Masculina A (maior valor)
  SELECT id INTO cat_masc_a FROM championship_categories
  WHERE championship_id = v_champ_id AND genero = 'masculino'
  ORDER BY valor_inscricao DESC LIMIT 1;

  IF cat_masc_a IS NULL THEN
    INSERT INTO championship_categories
      (championship_id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max)
    VALUES (v_champ_id, 'Masculino A', 'masculino', 220, 1100, 9999)
    RETURNING id INTO cat_masc_a;
  END IF;

  -- Masculina B (segundo masculino)
  SELECT id INTO cat_masc_b FROM championship_categories
  WHERE championship_id = v_champ_id AND genero = 'masculino' AND id <> cat_masc_a
  ORDER BY valor_inscricao DESC LIMIT 1;

  IF cat_masc_b IS NULL THEN
    INSERT INTO championship_categories
      (championship_id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max)
    VALUES (v_champ_id, 'Masculino B', 'masculino', 180, 0, 1099)
    RETURNING id INTO cat_masc_b;
  END IF;

  -- Feminina
  SELECT id INTO cat_fem FROM championship_categories
  WHERE championship_id = v_champ_id AND genero = 'feminino' LIMIT 1;

  IF cat_fem IS NULL THEN
    INSERT INTO championship_categories
      (championship_id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max)
    VALUES (v_champ_id, 'Feminino', 'feminino', 160, 0, 9999)
    RETURNING id INTO cat_fem;
  END IF;

  -- Mista
  SELECT id INTO cat_mista FROM championship_categories
  WHERE championship_id = v_champ_id AND genero = 'mista' LIMIT 1;

  IF cat_mista IS NULL THEN
    INSERT INTO championship_categories
      (championship_id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max)
    VALUES (v_champ_id, 'Mista', 'mista', 170, 0, 9999)
    RETURNING id INTO cat_mista;
  END IF;

  -- Arrays de distribuição: 8 MascA, 5 MascB, 4 Fem, 3 Mista = 20 duplas
  cats        := ARRAY[cat_masc_a,cat_masc_a,cat_masc_a,cat_masc_a,cat_masc_a,cat_masc_a,cat_masc_a,cat_masc_a,
                       cat_masc_b,cat_masc_b,cat_masc_b,cat_masc_b,cat_masc_b,
                       cat_fem,cat_fem,cat_fem,cat_fem,
                       cat_mista,cat_mista,cat_mista];
  cat_generos := ARRAY['masculino','masculino','masculino','masculino','masculino','masculino','masculino','masculino',
                       'masculino','masculino','masculino','masculino','masculino',
                       'feminino','feminino','feminino','feminino',
                       'mista','mista','mista'];
  cat_valores := ARRAY[220,220,220,220,220,220,220,220,
                       180,180,180,180,180,
                       160,160,160,160,
                       170,170,170]::numeric[];

  RAISE NOTICE 'Categorias OK. Iniciando criação das 20 duplas...';

  -- ─────────────────────────────────────────────────────────────
  -- 7. 20 DUPLAS — 40 atletas, credenciais e camisas
  -- ─────────────────────────────────────────────────────────────
  FOR i IN 1..20 LOOP
    cat_id     := cats[i];
    cat_genero := cat_generos[i];
    cat_valor  := cat_valores[i];

    IF cat_genero = 'feminino' THEN
      team_genero := 'feminino';
    ELSIF cat_genero = 'masculino' THEN
      team_genero := 'masculino';
    ELSE
      team_genero := CASE WHEN i % 2 = 1 THEN 'masculino' ELSE 'feminino' END;
    END IF;

    rating1 := CASE cat_id
      WHEN cat_masc_a THEN 1100 + (i * 47) % 700
      WHEN cat_masc_b THEN  400 + (i * 53) % 700
      WHEN cat_fem    THEN  300 + (i * 61) % 900
      ELSE                  200 + (i * 41) % 800
    END;
    rating2 := CASE cat_id
      WHEN cat_masc_a THEN 1100 + (i * 71) % 700
      WHEN cat_masc_b THEN  400 + (i * 59) % 700
      WHEN cat_fem    THEN  300 + (i * 67) % 900
      ELSE                  200 + (i * 37) % 800
    END;

    -- ── Atleta 1 ────────────────────────────────────────────
    c := c + 1;
    shirt1 := tamanhos[((c * 3) % 6) + 1];

    IF team_genero = 'feminino' THEN
      nome1 := fem_first[((c * 1) % 30) + 1]  || ' ' || sobrenomes[((c * 7) % 30) + 1];
    ELSE
      nome1 := masc_first[((c * 1) % 30) + 1] || ' ' || sobrenomes[((c * 7) % 30) + 1];
    END IF;

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
      'authenticated', 'authenticated',
      'fake.brasilia.' || c || '@rankftv.test',
      crypt('senha123456', gen_salt('bf')),
      now(), now() - (i || ' days')::interval, now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('username', 'bsb_fake_' || c, 'nome', nome1),
      false, '', '', '', ''
    ) RETURNING id INTO u1;

    UPDATE profiles SET genero = team_genero, rating = rating1, tamanho_camisa = shirt1 WHERE id = u1;

    -- ── Atleta 2 ────────────────────────────────────────────
    c := c + 1;
    shirt2 := tamanhos[((c * 5) % 6) + 1];

    -- Mista: atleta2 tem gênero oposto
    IF cat_genero = 'mista' THEN
      team_genero := CASE WHEN team_genero = 'masculino' THEN 'feminino' ELSE 'masculino' END;
    END IF;

    IF team_genero = 'feminino' THEN
      nome2 := fem_first[((c * 3) % 30) + 1]  || ' ' || sobrenomes[((c * 5) % 30) + 1];
    ELSE
      nome2 := masc_first[((c * 3) % 30) + 1] || ' ' || sobrenomes[((c * 5) % 30) + 1];
    END IF;

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
      'authenticated', 'authenticated',
      'fake.brasilia.' || c || '@rankftv.test',
      crypt('senha123456', gen_salt('bf')),
      now(), now() - (i || ' days')::interval, now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('username', 'bsb_fake_' || c, 'nome', nome2),
      false, '', '', '', ''
    ) RETURNING id INTO u2;

    UPDATE profiles SET genero = team_genero, rating = rating2, tamanho_camisa = shirt2 WHERE id = u2;

    -- ── Dupla ───────────────────────────────────────────────
    INSERT INTO teams (championship_id, category_id, atleta1_id, atleta2_id, status)
    VALUES (v_champ_id, cat_id, u1, u2, 'confirmado')
    RETURNING id INTO new_team;

    -- ── Inscrição PAGA (15 repassadas, 5 pendentes) ─────────
    repasse_st := CASE WHEN i <= 15 THEN 'repassado' ELSE 'pendente' END;

    INSERT INTO registrations (
      team_id, championship_id, category_id,
      valor, status_pagamento,
      asaas_payment_id,
      repasse_status, repasse_data_prevista, repasse_transfer_id,
      elite_fee_coletada
    ) VALUES (
      new_team, v_champ_id, cat_id,
      cat_valor, 'pago',
      'pay_FAKE_BSB_' || lpad(i::text, 4, '0'),
      repasse_st,
      CASE WHEN repasse_st = 'repassado'
           THEN now() - ((20 - i) || ' hours')::interval
           ELSE now() + '48 hours'::interval END,
      CASE WHEN repasse_st = 'repassado'
           THEN 'tr_FAKE_BSB_' || lpad(i::text, 4, '0')
           ELSE NULL END,
      0
    ) RETURNING id INTO new_reg;

    -- ── Credenciais (70% com check-in) ──────────────────────
    checkin1    := i <= 14;
    checkin2    := i <= 14;
    checkin_ts1 := CASE WHEN checkin1 THEN now() - ((30 - i * 2) || ' minutes')::interval ELSE NULL END;
    checkin_ts2 := CASE WHEN checkin2 THEN now() - ((28 - i * 2) || ' minutes')::interval ELSE NULL END;

    INSERT INTO credentials (user_id, championship_id, role, checked_in, checkin_at)
    VALUES (u1, v_champ_id, 'atleta', checkin1, checkin_ts1)
    ON CONFLICT (user_id, championship_id, role) DO NOTHING;

    INSERT INTO credentials (user_id, championship_id, role, checked_in, checkin_at)
    VALUES (u2, v_champ_id, 'atleta', checkin2, checkin_ts2)
    ON CONFLICT (user_id, championship_id, role) DO NOTHING;

    -- ── Produção de camisas (60% prontas) ───────────────────
    prod1 := i <= 12;
    prod2 := i <= 12;

    INSERT INTO shirt_production (championship_id, athlete_id, produced, retirado_por, data_retirada)
    VALUES (
      v_champ_id, u1, prod1,
      CASE WHEN prod1 THEN nome1 ELSE NULL END,
      CASE WHEN prod1 THEN (current_date - ((20 - i) || ' days')::interval)::date ELSE NULL END
    ) ON CONFLICT (championship_id, athlete_id) DO NOTHING;

    INSERT INTO shirt_production (championship_id, athlete_id, produced, retirado_por, data_retirada)
    VALUES (
      v_champ_id, u2, prod2,
      CASE WHEN prod2 THEN nome2 ELSE NULL END,
      CASE WHEN prod2 THEN (current_date - ((18 - i) || ' days')::interval)::date ELSE NULL END
    ) ON CONFLICT (championship_id, athlete_id) DO NOTHING;

  END LOOP;

  RAISE NOTICE '✅ Seed concluído! Campeonato: %', v_champ_id;
  RAISE NOTICE '   • 40 atletas fake | 20 inscrições pagas (15 rep. / 5 pend.)';
  RAISE NOTICE '   • 40 credenciais (28 check-in / 12 sem) | 40 camisas (24 ok / 16 pend.)';

END $$;


-- =============================================================
-- LIMPEZA — apaga tudo que este seed criou
-- =============================================================
--
-- DO $$
-- DECLARE v_champ_id uuid;
-- BEGIN
--   SELECT id INTO v_champ_id FROM championships
--   WHERE nome ILIKE '%Esta%o Open%Bras%' ORDER BY created_at DESC LIMIT 1;
--   DELETE FROM shirt_production WHERE championship_id = v_champ_id
--     AND athlete_id IN (SELECT id FROM auth.users WHERE email LIKE 'fake.brasilia.%@rankftv.test');
--   DELETE FROM credentials WHERE championship_id = v_champ_id
--     AND user_id IN (SELECT id FROM auth.users WHERE email LIKE 'fake.brasilia.%@rankftv.test');
--   DELETE FROM registrations WHERE championship_id = v_champ_id;
--   DELETE FROM teams WHERE championship_id = v_champ_id;
--   DELETE FROM auth.users WHERE email LIKE 'fake.brasilia.%@rankftv.test';
-- END $$;
