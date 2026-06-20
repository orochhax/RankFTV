-- =============================================================
-- SEED — 30 duplas fake no campeonato "Open Sanport de Futevôlei"
-- Cria 60 atletas fake (perfil via trigger), 30 duplas e 30
-- inscrições PAGAS, distribuídas entre as categorias do campeonato
-- respeitando o gênero de cada categoria.
--
-- Seguro rodar mais de uma vez? NÃO — gera novos atletas a cada
-- execução. Pra limpar, use o bloco de limpeza no final.
-- =============================================================

DO $$
DECLARE
  champ_id    uuid := 'b03d54ad-d815-443c-be30-474d1697888f';
  cats        uuid[];
  cat_generos text[];
  cat_valores numeric[];
  n_cats      int;
  i           int;
  c           int := 0;
  cat_idx     int;
  cat_id      uuid;
  cat_genero  text;
  cat_valor   numeric;
  team_genero text;
  u1 uuid; u2 uuid;
  nome1 text; nome2 text;
  new_team uuid;

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
BEGIN
  -- Categorias do campeonato
  SELECT array_agg(id ORDER BY id),
         array_agg(genero ORDER BY id),
         array_agg(valor_inscricao ORDER BY id)
    INTO cats, cat_generos, cat_valores
  FROM championship_categories
  WHERE championship_id = champ_id;

  n_cats := COALESCE(array_length(cats, 1), 0);
  IF n_cats = 0 THEN
    RAISE EXCEPTION 'Campeonato % não tem categorias.', champ_id;
  END IF;

  FOR i IN 1..30 LOOP
    cat_idx    := ((i - 1) % n_cats) + 1;
    cat_id     := cats[cat_idx];
    cat_genero := cat_generos[cat_idx];
    cat_valor  := cat_valores[cat_idx];

    -- Gênero dos atletas segue a categoria; mista alterna
    IF cat_genero = 'feminino' THEN
      team_genero := 'feminino';
    ELSIF cat_genero = 'masculino' THEN
      team_genero := 'masculino';
    ELSE
      team_genero := CASE WHEN i % 2 = 0 THEN 'feminino' ELSE 'masculino' END;
    END IF;

    -- ── Atleta 1 ──
    c := c + 1;
    IF team_genero = 'feminino' THEN
      nome1 := fem_first[((c * 1) % 30) + 1] || ' ' || sobrenomes[((c * 7) % 30) + 1];
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
      'fake.sanport.' || c || '@rankftv.test',
      crypt('senha123456', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('username', 'sanport_fake_' || c, 'nome', nome1),
      false, '', '', '', ''
    )
    RETURNING id INTO u1;

    UPDATE profiles
       SET genero = team_genero,
           rating = 100 + (c * 37) % 1800
     WHERE id = u1;

    -- ── Atleta 2 ──
    c := c + 1;
    IF team_genero = 'feminino' THEN
      nome2 := fem_first[((c * 3) % 30) + 1] || ' ' || sobrenomes[((c * 5) % 30) + 1];
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
      'fake.sanport.' || c || '@rankftv.test',
      crypt('senha123456', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('username', 'sanport_fake_' || c, 'nome', nome2),
      false, '', '', '', ''
    )
    RETURNING id INTO u2;

    UPDATE profiles
       SET genero = team_genero,
           rating = 100 + (c * 41) % 1800
     WHERE id = u2;

    -- ── Dupla ──
    INSERT INTO teams (championship_id, category_id, atleta1_id, atleta2_id, status)
    VALUES (champ_id, cat_id, u1, u2, 'confirmado')
    RETURNING id INTO new_team;

    -- ── Inscrição paga ──
    INSERT INTO registrations (team_id, championship_id, category_id, valor, status_pagamento)
    VALUES (new_team, champ_id, cat_id, cat_valor, 'pago');
  END LOOP;

  RAISE NOTICE '30 duplas fake criadas no campeonato %.', champ_id;
END $$;


-- =============================================================
-- LIMPEZA (rode só quando quiser apagar os fakes deste seed)
-- Apaga inscrições, duplas e os 60 atletas fake (cascata).
-- =============================================================
-- DELETE FROM auth.users
--  WHERE email LIKE 'fake.sanport.%@rankftv.test';
-- (registrations/teams somem por ON DELETE CASCADE via teams.atleta1_id?
--  NÃO — teams.atleta1_id não tem cascade. Use o bloco abaixo:)
--
-- DO $$
-- DECLARE champ_id uuid := 'b03d54ad-d815-443c-be30-474d1697888f';
-- BEGIN
--   DELETE FROM registrations r USING teams t
--     WHERE r.team_id = t.id
--       AND t.atleta1_id IN (SELECT id FROM auth.users WHERE email LIKE 'fake.sanport.%@rankftv.test');
--   DELETE FROM teams
--     WHERE atleta1_id IN (SELECT id FROM auth.users WHERE email LIKE 'fake.sanport.%@rankftv.test');
--   DELETE FROM auth.users WHERE email LIKE 'fake.sanport.%@rankftv.test';
-- END $$;
