-- =============================================================
-- 30 atletas fake para o RochaCup — teste do check-in.
-- Rode no SQL Editor do Supabase (pode rodar 1x só).
-- Cria: auth.users + profiles + credentials no RochaCup.
-- 17 já passaram no QR (checked_in = true), 13 ainda pendentes.
-- =============================================================

DO $$
DECLARE
  v_org_id    uuid;
  v_champ_id  uuid;
  v_uid       uuid;

  -- Nomes realistas em ordem aleatória (para teste de ordem alfabética)
  v_nomes text[] := ARRAY[
    'Thiago Nunes',     'Amanda Ribeiro',   'Rafael Barbosa',
    'Camila Freitas',   'Lucas Martins',    'Beatriz Correia',
    'Eduardo Ferreira', 'Fernanda Lopes',   'André Santos',
    'Isabela Cunha',    'Gabriel Rocha',    'Helena Moura',
    'Bruno Oliveira',   'Júlia Rodrigues',  'Carlos Lima',
    'Daniela Pinto',    'Matheus Araújo',   'Elisa Carvalho',
    'Felipe Alves',     'Gabriela Teixeira','Daniel Costa',
    'Victor Mendes',    'Samuel Gomes',     'Otávio Ramos',
    'William Castro',   'Paulo Cardoso',    'Igor Pereira',
    'Nathan Dias',      'Henrique Souza',   'João Silva'
  ];

  -- 1 = já confirmado, 0 = pendente  (17 confirmados, 13 pendentes)
  v_checkins int[] := ARRAY[
    1, 1, 1,
    0, 1, 1,
    0, 1, 1,
    0, 1, 0,
    1, 1, 0,
    1, 0, 1,
    0, 1, 1,
    0, 1, 1,
    0, 1, 0,
    1, 0, 1
  ];

  i int;
  v_slug text;
BEGIN
  -- Busca o organizador
  SELECT id INTO v_org_id FROM auth.users
  WHERE email = 'carlosrocha0923@gmail.com' LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Usuário carlosrocha0923@gmail.com não encontrado.';
  END IF;

  -- Busca o RochaCup mais recente (aberto ou qualquer status)
  SELECT id INTO v_champ_id FROM championships
  WHERE organizador_id = v_org_id
    AND nome ILIKE '%RochaCup%'
  ORDER BY data_inicio DESC
  LIMIT 1;

  IF v_champ_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum campeonato RochaCup encontrado. Verifique se o seed do campeonato foi rodado.';
  END IF;

  RAISE NOTICE 'Criando atletas para campeonato ID: %', v_champ_id;

  FOR i IN 1..30 LOOP
    v_uid  := gen_random_uuid();
    v_slug := lower(regexp_replace(v_nomes[i], '[^a-zA-Z]', '', 'g')) || i::text;

    -- Cria o usuário no auth (mínimo necessário)
    INSERT INTO auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      v_uid,
      'authenticated',
      'authenticated',
      v_slug || '@rankftv.test',
      crypt('senha123', gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome', v_nomes[i], 'username', v_slug),
      now(),
      now(),
      '',
      ''
    );
    -- O trigger handle_new_user() já cria o profiles automaticamente.

    -- Cria a credencial para o RochaCup
    INSERT INTO credentials (
      user_id,
      championship_id,
      role,
      qr_token,
      checked_in,
      checkin_at
    ) VALUES (
      v_uid,
      v_champ_id,
      'atleta',
      'QR-ROCHHACUP-' || i,
      v_checkins[i] = 1,
      CASE
        WHEN v_checkins[i] = 1
        THEN now() - (random() * interval '3 hours')
        ELSE NULL
      END
    );

  END LOOP;

  RAISE NOTICE '✓ 30 atletas criados. 17 confirmados, 13 pendentes.';
  RAISE NOTICE 'Tokens disponíveis: QR-ROCHHACUP-1 até QR-ROCHHACUP-30';
  RAISE NOTICE 'Tokens pendentes (para testar scan): QR-ROCHHACUP-4, 7, 10, 12, 15, 17, 19, 22, 25, 27, 28, 29 e o anterior TEST-QR-TOKEN-ROCHHAX';
END;
$$;
