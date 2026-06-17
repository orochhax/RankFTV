-- Inscreve carlosrocha0923@gmail.com no RochaCup como atleta1,
-- pareado com o primeiro atleta fake (ThiagoNunes1) como atleta2.
-- Pagamento já marcado como pago.

DO $$
DECLARE
  v_carlos_id   uuid;
  v_parceiro_id uuid;
  v_champ_id    uuid;
  v_cat_id      uuid;
  v_team_id     uuid;
BEGIN
  -- Usuário principal
  SELECT id INTO v_carlos_id FROM auth.users
  WHERE email = 'carlosrocha0923@gmail.com' LIMIT 1;
  IF v_carlos_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  -- RochaCup (qualquer edição, a mais recente)
  SELECT id INTO v_champ_id FROM championships
  WHERE organizador_id = v_carlos_id
    AND nome ILIKE '%RochaCup%'
  ORDER BY data_inicio DESC LIMIT 1;
  IF v_champ_id IS NULL THEN
    RAISE EXCEPTION 'RochaCup não encontrado.';
  END IF;

  -- Primeira categoria disponível no campeonato
  SELECT id INTO v_cat_id FROM championship_categories
  WHERE championship_id = v_champ_id
  ORDER BY created_at LIMIT 1;
  IF v_cat_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma categoria encontrada no RochaCup.';
  END IF;

  -- Parceiro: Thiago Nunes (atleta fake criado pelo seed anterior, slug = thiagonunes1)
  SELECT id INTO v_parceiro_id FROM profiles
  WHERE username = 'thiagonunes1'
  LIMIT 1;
  -- Fallback: qualquer atleta fake (email @rankftv.test) que não seja o Carlos
  IF v_parceiro_id IS NULL THEN
    SELECT p.id INTO v_parceiro_id
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE u.email LIKE '%@rankftv.test'
    LIMIT 1;
  END IF;
  -- Se ainda não achou, continua sem parceiro (convite_pendente)

  -- Cria a dupla
  INSERT INTO teams (championship_id, category_id, atleta1_id, atleta2_id, status)
  VALUES (
    v_champ_id,
    v_cat_id,
    v_carlos_id,
    v_parceiro_id,
    CASE WHEN v_parceiro_id IS NOT NULL THEN 'confirmado' ELSE 'convite_pendente' END
  )
  RETURNING id INTO v_team_id;

  -- Cria a inscrição com pagamento marcado como pago
  INSERT INTO registrations (team_id, championship_id, category_id, valor, status_pagamento)
  SELECT
    v_team_id,
    v_champ_id,
    v_cat_id,
    cc.valor_inscricao / 100.0,
    'pago'
  FROM championship_categories cc WHERE cc.id = v_cat_id;

  RAISE NOTICE 'Inscrição criada! Team ID: %', v_team_id;
  RAISE NOTICE 'Parceiro: %', COALESCE(v_parceiro_id::text, 'nenhum (convite pendente)');
END;
$$;
