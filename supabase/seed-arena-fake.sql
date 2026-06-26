-- ================================================================
-- SEED: 30 alunos fake para testar a página /arena/financeiro
-- Execute no Supabase SQL Editor (acesso postgres necessário)
-- Pode rodar mais de uma vez sem problema (ON CONFLICT DO NOTHING)
-- ================================================================

DO $$
DECLARE
  v_arena_id  uuid;
  v_dono_id   uuid;

  -- IDs das 3 turmas seed
  v_class_manha uuid := gen_random_uuid();
  v_class_tarde  uuid := gen_random_uuid();
  v_class_noite  uuid := gen_random_uuid();

  -- 30 UUIDs para auth.users e profiles
  v_uids uuid[] := ARRAY(SELECT gen_random_uuid() FROM generate_series(1,30));
  -- 30 UUIDs para arena_students
  v_sids uuid[] := ARRAY(SELECT gen_random_uuid() FROM generate_series(1,30));

  nomes text[] := ARRAY[
    'Pedro Silva','Lucas Oliveira','Mateus Santos','Gabriel Costa',
    'Rafael Ferreira','Daniel Alves','Bruno Rodrigues','Felipe Lima',
    'Eduardo Martins','Thiago Pereira','João Souza','André Barbosa',
    'Rodrigo Nascimento','Carlos Monteiro','Gustavo Carvalho',
    'Ana Julia','Marina Ribeiro','Camila Nunes','Fernanda Azevedo',
    'Letícia Moreira','Juliana Castro','Beatriz Melo','Patricia Gomes',
    'Vanessa Torres','Amanda Cunha','Sofia Rocha','Isabela Dias',
    'Larissa Teixeira','Carolina Pinto','Renata Correia'
  ];

  usernames text[] := ARRAY[
    'f_pedrosilva','f_lucasoliv','f_mateussantos','f_gabcosta',
    'f_rafaelftv','f_danielalves','f_brunordg','f_felipelima',
    'f_dumartins','f_thiagoftv','f_joaosouza','f_andrebarbosa',
    'f_rodriguinhoftv','f_carlosmonteiro','f_gustavocarv',
    'f_anajulia','f_marinaribs','f_caminunes','f_ferazevedo',
    'f_leticiaftv','f_julianac','f_beasantos','f_patriciag',
    'f_vanessaft','f_amandacunha','f_sofiar','f_isabelas',
    'f_lariteixeira','f_carolpinto','f_renatacorr'
  ];

  mensalidades numeric[] := ARRAY[
    120,150,120,180,150,
    120,200,150,120,180,
    150,120,200,150,180,
    120,150,180,120,200,
    150,120,180,150,120,
    200,150,120,180,150
  ];

  i int;
  v_tmp     uuid;
  v_tmp_sid uuid;
BEGIN

  -- ── 1. Pega a primeira arena ──────────────────────────────────
  SELECT id, dono_id INTO v_arena_id, v_dono_id
  FROM arenas WHERE nome ILIKE '%Carlos Gregorio%' ORDER BY created_at LIMIT 1;

  IF v_arena_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma arena encontrada. Crie uma arena no painel primeiro.';
  END IF;
  RAISE NOTICE 'Usando arena: %', v_arena_id;

  -- ── 2. Cria usuários fake em auth.users ───────────────────────
  FOR i IN 1..30 LOOP
    INSERT INTO auth.users (
      id, email, created_at, updated_at, email_confirmed_at,
      aud, role, encrypted_password,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      v_uids[i],
      'seed_' || usernames[i] || '@rankftv-fake.test',
      NOW() - ((30 + i * 3) * INTERVAL '1 day'),
      NOW(),
      NOW() - ((30 + i * 3) * INTERVAL '1 day'),
      'authenticated',
      'authenticated',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      -- O trigger handle_new_user() lê 'username' e 'nome' daqui para criar o profile
      jsonb_build_object('username', usernames[i], 'nome', nomes[i])
    ) ON CONFLICT DO NOTHING;

    -- Re-lê o ID real (pode ser diferente se o email já existia de outra rodada)
    SELECT id INTO v_tmp FROM auth.users
    WHERE email = 'seed_' || usernames[i] || '@rankftv-fake.test';
    v_uids[i] := v_tmp;
  END LOOP;
  -- O trigger handle_new_user() já criou os profiles automaticamente acima.

  -- ── 4. Cria 3 turmas (se não existirem já) ───────────────────
  INSERT INTO arena_classes (id, arena_id, titulo, horario, dias_semana, ativo)
  VALUES
    (v_class_manha, v_arena_id, 'Turma Manhã', '08:00', ARRAY[1,2,3,4,5], true),
    (v_class_tarde,  v_arena_id, 'Turma Tarde', '15:00', ARRAY[1,3,5,6],   true),
    (v_class_noite,  v_arena_id, 'Turma Noite', '19:00', ARRAY[2,4,6],     true)
  ON CONFLICT DO NOTHING;

  -- ── 5. Matricula 30 alunos ────────────────────────────────────
  FOR i IN 1..30 LOOP
    INSERT INTO arena_students (
      id, arena_id, user_id, status, valor_mensalidade, data_entrada
    ) VALUES (
      v_sids[i],
      v_arena_id,
      v_uids[i],
      'ativo',
      mensalidades[i],
      (CURRENT_DATE - ((15 + i * 4) * INTERVAL '1 day'))::date
    ) ON CONFLICT DO NOTHING;

    -- Re-lê o ID real (pode ter conflito em user_id+arena_id de rodada anterior)
    SELECT id INTO v_tmp_sid FROM arena_students
    WHERE arena_id = v_arena_id AND user_id = v_uids[i];
    v_sids[i] := v_tmp_sid;
  END LOOP;

  -- ── 6. Presenças (últimos 60 dias) ───────────────────────────
  --
  -- Padrão de frequência:
  --   idx  1-10  → heavy   (~80% nos dias úteis)
  --   idx 11-20  → médio   (~45%)
  --   idx 21-30  → leve    (~18%)
  --
  -- Efeito de tendência (faz as setas aparecerem):
  --   idx  1-5   → caíram nos últimos 30 dias  (× 0.2)  → seta vermelha
  --   idx 26-30  → subiram nos últimos 30 dias (× 3.5)  → seta verde
  --   demais     → estáveis

  INSERT INTO arena_attendance (id, arena_id, class_id, user_id, data)
  SELECT
    gen_random_uuid(),
    v_arena_id,
    -- Distribui entre as turmas por dia da semana
    CASE EXTRACT(DOW FROM d.d)::int
      WHEN 1 THEN v_class_manha
      WHEN 2 THEN v_class_noite
      WHEN 3 THEN v_class_manha
      WHEN 4 THEN v_class_noite
      WHEN 5 THEN v_class_tarde
      WHEN 6 THEN v_class_tarde
      ELSE        v_class_tarde   -- domingo (raramente)
    END,
    v_uids[s.idx],
    d.d
  FROM
    generate_series(1, 30)                                              AS s(idx),
    generate_series(CURRENT_DATE - 59, CURRENT_DATE, '1 day'::interval) AS d(d)
  WHERE
    random() < LEAST(0.96,
      -- Probabilidade base por grupo e dia da semana
      (CASE
        WHEN s.idx <= 10 THEN
          CASE EXTRACT(DOW FROM d.d)::int
            WHEN 0 THEN 0.15 WHEN 1 THEN 0.90 WHEN 2 THEN 0.85
            WHEN 3 THEN 0.90 WHEN 4 THEN 0.85 WHEN 5 THEN 0.90 WHEN 6 THEN 0.60
            ELSE 0.5 END
        WHEN s.idx <= 20 THEN
          CASE EXTRACT(DOW FROM d.d)::int
            WHEN 0 THEN 0.05 WHEN 1 THEN 0.50 WHEN 2 THEN 0.30
            WHEN 3 THEN 0.55 WHEN 4 THEN 0.40 WHEN 5 THEN 0.50 WHEN 6 THEN 0.35
            ELSE 0.05 END
        ELSE
          CASE EXTRACT(DOW FROM d.d)::int
            WHEN 0 THEN 0.00 WHEN 1 THEN 0.18 WHEN 2 THEN 0.08
            WHEN 3 THEN 0.22 WHEN 4 THEN 0.12 WHEN 5 THEN 0.18 WHEN 6 THEN 0.12
            ELSE 0.00 END
      END)
      -- Multiplicador de tendência
      * (CASE
          WHEN s.idx <= 5  AND d.d >= CURRENT_DATE - 30 THEN 0.2   -- caíram: vermelhos
          WHEN s.idx >= 26 AND d.d >= CURRENT_DATE - 30 THEN 3.5   -- subiram: verdes
          ELSE 1.0
         END)
    )
  ON CONFLICT DO NOTHING;

  -- ── 7. Cobranças mensais (últimos 6 meses) ────────────────────
  INSERT INTO student_charges (
    id, arena_id, arena_student_id, user_id,
    competencia, valor, status_pagamento
  )
  SELECT
    gen_random_uuid(),
    v_arena_id,
    v_sids[s.idx],
    v_uids[s.idx],
    TO_CHAR(
      DATE_TRUNC('month', CURRENT_DATE) - (m.m * INTERVAL '1 month'),
      'YYYY-MM'
    ),
    mensalidades[s.idx],
    -- Mês atual: 25% pendente | Mês passado: 8% pendente | Restantes: pago
    CASE
      WHEN m.m = 0 AND random() < 0.25 THEN 'pendente'
      WHEN m.m = 1 AND random() < 0.08 THEN 'pendente'
      ELSE 'pago'
    END
  FROM
    generate_series(1, 30) AS s(idx),
    generate_series(0,  5) AS m(m)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Seed concluído! 30 alunos, presenças e cobranças adicionados à arena: %', v_arena_id;
END;
$$;
