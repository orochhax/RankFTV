-- Disposable integration test for production-participant-category-uniqueness.sql.
-- Run only against a local restored database. The transaction is rolled back.

BEGIN;

DO $$
DECLARE
  v_organizer uuid := '00000000-0000-4000-8000-000000000101';
  v_athlete_a uuid := '00000000-0000-4000-8000-000000000102';
  v_athlete_b uuid := '00000000-0000-4000-8000-000000000103';
  v_championship uuid := '00000000-0000-4000-8000-000000000201';
  v_category_a uuid := '00000000-0000-4000-8000-000000000301';
  v_category_b uuid := '00000000-0000-4000-8000-000000000302';
  v_ticket uuid;
  v_team uuid;
  v_registration uuid;
  v_conflict boolean;
  v_team_status text;
BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
  VALUES
    (v_organizer, 'organizer-participant-test@example.invalid',
      '{"username":"organizer_participant_test","nome":"Organizer Test"}'::jsonb, now(), now()),
    (v_athlete_a, 'athlete-a-participant-test@example.invalid',
      '{"username":"athlete_a_participant_test","nome":"Athlete A"}'::jsonb, now(), now()),
    (v_athlete_b, 'athlete-b-participant-test@example.invalid',
      '{"username":"athlete_b_participant_test","nome":"Athlete B"}'::jsonb, now(), now());

  INSERT INTO profiles_private (user_id, cpf)
  VALUES
    (v_athlete_a, '111.111.111-11'),
    (v_athlete_b, '222.222.222-22');

  INSERT INTO championships (
    id, organizador_id, nome, data_inicio, data_fim, cidade, estado, local
  ) VALUES (
    v_championship, v_organizer, 'Participant Uniqueness Test',
    current_date + 30, current_date + 31, 'Test City', 'BA', 'Test Arena'
  );

  INSERT INTO championship_categories (id, championship_id, nome, genero)
  VALUES
    (v_category_a, v_championship, 'Category A', 'mista'),
    (v_category_b, v_championship, 'Category B', 'mista');

  -- First quick-checkout participation is valid.
  INSERT INTO athlete_tickets (
    championship_id, category_id, comprador_nome, comprador_cpf,
    comprador_email, parceiro_nome, parceiro_cpf, access_token, user_id
  ) VALUES (
    v_championship, v_category_a, 'Athlete A', '11111111111',
    'athlete-a-participant-test@example.invalid', 'Partner C', '33333333333',
    'participant-test-ticket-a', v_athlete_a
  ) RETURNING id INTO v_ticket;

  -- Same buyer, same category, must be refused.
  v_conflict := false;
  BEGIN
    INSERT INTO athlete_tickets (
      championship_id, category_id, comprador_nome, comprador_cpf,
      comprador_email, parceiro_nome, parceiro_cpf, access_token
    ) VALUES (
      v_championship, v_category_a, 'Athlete A Again', '111.111.111-11',
      'athlete-a-again@example.invalid', 'Partner D', '44444444444',
      'participant-test-ticket-duplicate-buyer'
    );
  EXCEPTION WHEN unique_violation THEN
    v_conflict := SQLERRM LIKE '%PARTICIPANT_ALREADY_REGISTERED%';
  END;
  IF NOT v_conflict THEN
    RAISE EXCEPTION 'TEST_FAILED: duplicate buyer in the same category was accepted';
  END IF;

  -- The same identity cannot evade the rule by becoming the partner.
  v_conflict := false;
  BEGIN
    INSERT INTO athlete_tickets (
      championship_id, category_id, comprador_nome, comprador_cpf,
      comprador_email, parceiro_nome, parceiro_cpf, access_token
    ) VALUES (
      v_championship, v_category_a, 'Athlete E', '55555555555',
      'athlete-e@example.invalid', 'Athlete A As Partner', '11111111111',
      'participant-test-ticket-duplicate-partner'
    );
  EXCEPTION WHEN unique_violation THEN
    v_conflict := SQLERRM LIKE '%PARTICIPANT_ALREADY_REGISTERED%';
  END;
  IF NOT v_conflict THEN
    RAISE EXCEPTION 'TEST_FAILED: duplicate partner in the same category was accepted';
  END IF;

  -- A different category in the same championship remains valid.
  INSERT INTO athlete_tickets (
    championship_id, category_id, comprador_nome, comprador_cpf,
    comprador_email, parceiro_nome, parceiro_cpf, access_token, user_id
  ) VALUES (
    v_championship, v_category_b, 'Athlete A', '11111111111',
    'athlete-a-participant-test@example.invalid', 'Partner F', '66666666666',
    'participant-test-ticket-category-b', v_athlete_a
  );

  -- A terminal quick-checkout row releases its category reservation.
  UPDATE athlete_tickets SET status_pagamento = 'estornado' WHERE id = v_ticket;
  INSERT INTO athlete_tickets (
    championship_id, category_id, comprador_nome, comprador_cpf,
    comprador_email, parceiro_nome, parceiro_cpf, access_token, user_id
  ) VALUES (
    v_championship, v_category_a, 'Athlete A Repurchase', '11111111111',
    'athlete-a-participant-test@example.invalid', 'Partner G', '77777777777',
    'participant-test-ticket-after-refund', v_athlete_a
  );

  -- Cross-flow protection: an authenticated team cannot reuse an identity
  -- already reserved by quick checkout in the same category.
  v_conflict := false;
  BEGIN
    INSERT INTO teams (championship_id, category_id, atleta1_id, status)
    VALUES (v_championship, v_category_a, v_athlete_a, 'aguardando_pagamento');
  EXCEPTION WHEN unique_violation THEN
    v_conflict := SQLERRM LIKE '%PARTICIPANT_ALREADY_REGISTERED%';
  END;
  IF NOT v_conflict THEN
    RAISE EXCEPTION 'TEST_FAILED: cross-flow duplicate was accepted';
  END IF;

  -- A clean authenticated team is valid in category A.
  INSERT INTO teams (championship_id, category_id, atleta1_id, status)
  VALUES (v_championship, v_category_a, v_athlete_b, 'aguardando_pagamento')
  RETURNING id INTO v_team;

  INSERT INTO registrations (team_id, championship_id, category_id, valor)
  VALUES (v_team, v_championship, v_category_a, 100)
  RETURNING id INTO v_registration;

  -- The same team participant is allowed in another category.
  INSERT INTO teams (championship_id, category_id, atleta1_id, status)
  VALUES (v_championship, v_category_b, v_athlete_b, 'aguardando_pagamento');

  -- A terminal registration automatically cancels the team reservation.
  UPDATE registrations SET status_pagamento = 'expirado' WHERE id = v_registration;
  SELECT status INTO v_team_status FROM teams WHERE id = v_team;
  IF v_team_status <> 'cancelado' THEN
    RAISE EXCEPTION 'TEST_FAILED: terminal registration did not release the team';
  END IF;

  INSERT INTO teams (championship_id, category_id, atleta1_id, status)
  VALUES (v_championship, v_category_a, v_athlete_b, 'aguardando_pagamento');

  RAISE NOTICE 'PASS: participant/category uniqueness, cross-flow protection and terminal release';
END;
$$;

ROLLBACK;
