-- DEMONSTRACAO CONTROLADA: Copa Bahia / Aprendiz.
-- 15 duplas fake + 1 inscricao real = chave de 16.
-- Oitavas, quartas e semifinais concluidas; final e 3o lugar abertas.
-- UUIDs f7... sao exclusivos e removiveis pelo script de cleanup.

BEGIN;

DO $$
DECLARE v_count integer;
BEGIN
  IF to_regclass('public.bracket_participants') IS NULL THEN
    RAISE EXCEPTION 'BRACKET_DEMO_REQUIRES_V1_MIGRATIONS';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.championship_categories
    WHERE id = '3fddb756-c9b3-42a6-8cbd-4b1003ecc891'::uuid
      AND championship_id = '61212887-0228-4fcb-9f45-016f0399b01e'::uuid
      AND nome = 'Aprendiz'
  ) THEN RAISE EXCEPTION 'BRACKET_DEMO_CATEGORY_NOT_FOUND'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.bracket_matches
    WHERE championship_id = '61212887-0228-4fcb-9f45-016f0399b01e'::uuid
      AND category_id = '3fddb756-c9b3-42a6-8cbd-4b1003ecc891'::uuid
  ) THEN RAISE EXCEPTION 'BRACKET_DEMO_REFUSES_EXISTING_MATCHES'; END IF;
  SELECT count(*) INTO v_count FROM public.bracket_participants
  WHERE championship_id = '61212887-0228-4fcb-9f45-016f0399b01e'::uuid
    AND category_id = '3fddb756-c9b3-42a6-8cbd-4b1003ecc891'::uuid AND active = true;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'BRACKET_DEMO_EXPECTED_ONE_REAL_PARTICIPANT_FOUND_%', v_count;
  END IF;
END $$;

WITH names AS (
  SELECT ARRAY[
    'Ana','Bruno','Carlos','Daniel','Eduardo','Felipe','Gabriel','Henrique','Igor','Joao',
    'Kaua','Lucas','Mateus','Nicolas','Otavio','Pedro','Rafael','Samuel','Thiago','Vinicius',
    'Arthur','Bernardo','Caio','Diego','Enzo','Fabio','Gustavo','Heitor','Leonardo','Murilo'
  ]::text[] AS value
), fake_pairs AS (
  SELECT n, value[n * 2 - 1] || ' Teste FTV' AS atleta_a, value[n * 2] || ' Teste FTV' AS atleta_b
  FROM names CROSS JOIN generate_series(1, 15) AS n
)
INSERT INTO public.athlete_tickets (
  id, championship_id, category_id, categoria_nome,
  comprador_nome, comprador_cpf, comprador_email, comprador_genero,
  parceiro_nome, parceiro_cpf, parceiro_email, parceiro_genero,
  valor, status_pagamento, code, qr_token, access_token
)
SELECT
  ('f7000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  '61212887-0228-4fcb-9f45-016f0399b01e'::uuid,
  '3fddb756-c9b3-42a6-8cbd-4b1003ecc891'::uuid,
  'Aprendiz', atleta_a,
  (99000000000::bigint + n * 2 - 1)::text,
  'bracket-v1-' || lpad(n::text, 2, '0') || 'a@invalid.rankftv', 'masculino', atleta_b,
  (99000000000::bigint + n * 2)::text,
  'bracket-v1-' || lpad(n::text, 2, '0') || 'b@invalid.rankftv', 'masculino',
  0, 'pago', 'TESTE-CHAVE-V1-' || lpad(n::text, 2, '0'),
  'fake-bracket-v1-qr-' || lpad(n::text, 2, '0'),
  'fake-bracket-v1-access-' || lpad(n::text, 2, '0')
FROM fake_pairs;

DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.bracket_participants
  WHERE championship_id = '61212887-0228-4fcb-9f45-016f0399b01e'::uuid
    AND category_id = '3fddb756-c9b3-42a6-8cbd-4b1003ecc891'::uuid AND active = true;
  IF v_count <> 16 THEN
    RAISE EXCEPTION 'BRACKET_DEMO_EXPECTED_SIXTEEN_PARTICIPANTS_FOUND_%', v_count;
  END IF;
END $$;

WITH ordered_participants AS (
  SELECT id, row_number() OVER (
    ORDER BY CASE WHEN athlete_ticket_id::text LIKE 'f7000000-0000-4000-8000-%' THEN 1 ELSE 0 END,
      display_name_snapshot, id
  ) AS position
  FROM public.bracket_participants
  WHERE championship_id = '61212887-0228-4fcb-9f45-016f0399b01e'::uuid
    AND category_id = '3fddb756-c9b3-42a6-8cbd-4b1003ecc891'::uuid AND active = true
), match_plan(id, round_index, match_index, position_a, position_b, winner_position, sets_a, sets_b, set_details, is_third_place) AS (
  VALUES
    ('f7100000-0000-4000-8000-000000000001'::uuid,0,0, 1::bigint, 2::bigint, 1::bigint,2,0,'[{"a":18,"b":12},{"a":18,"b":14}]'::jsonb,false),
    ('f7100000-0000-4000-8000-000000000002'::uuid,0,1, 3::bigint, 4::bigint, 4::bigint,1,2,'[{"a":18,"b":15},{"a":13,"b":18},{"a":11,"b":15}]'::jsonb,false),
    ('f7100000-0000-4000-8000-000000000003'::uuid,0,2, 5::bigint, 6::bigint, 5::bigint,2,1,'[{"a":18,"b":10},{"a":16,"b":18},{"a":15,"b":9}]'::jsonb,false),
    ('f7100000-0000-4000-8000-000000000004'::uuid,0,3, 7::bigint, 8::bigint, 8::bigint,0,2,'[{"a":12,"b":18},{"a":14,"b":18}]'::jsonb,false),
    ('f7100000-0000-4000-8000-000000000005'::uuid,0,4, 9::bigint,10::bigint, 9::bigint,2,0,'[{"a":18,"b":8},{"a":18,"b":11}]'::jsonb,false),
    ('f7100000-0000-4000-8000-000000000006'::uuid,0,5,11::bigint,12::bigint,12::bigint,1,2,'[{"a":18,"b":16},{"a":10,"b":18},{"a":12,"b":15}]'::jsonb,false),
    ('f7100000-0000-4000-8000-000000000007'::uuid,0,6,13::bigint,14::bigint,13::bigint,2,1,'[{"a":18,"b":13},{"a":15,"b":18},{"a":15,"b":12}]'::jsonb,false),
    ('f7100000-0000-4000-8000-000000000008'::uuid,0,7,15::bigint,16::bigint,16::bigint,0,2,'[{"a":9,"b":18},{"a":13,"b":18}]'::jsonb,false),
    ('f7100000-0000-4000-8000-000000000009'::uuid,1,0, 1::bigint, 4::bigint, 1::bigint,2,1,'[{"a":18,"b":13},{"a":14,"b":18},{"a":15,"b":11}]'::jsonb,false),
    ('f7100000-0000-4000-8000-000000000010'::uuid,1,1, 5::bigint, 8::bigint, 8::bigint,1,2,'[{"a":18,"b":16},{"a":12,"b":18},{"a":10,"b":15}]'::jsonb,false),
    ('f7100000-0000-4000-8000-000000000011'::uuid,1,2, 9::bigint,12::bigint, 9::bigint,2,0,'[{"a":18,"b":14},{"a":18,"b":9}]'::jsonb,false),
    ('f7100000-0000-4000-8000-000000000012'::uuid,1,3,13::bigint,16::bigint,16::bigint,0,2,'[{"a":11,"b":18},{"a":15,"b":18}]'::jsonb,false),
    ('f7100000-0000-4000-8000-000000000013'::uuid,2,0, 1::bigint, 8::bigint, 8::bigint,1,2,'[{"a":18,"b":15},{"a":13,"b":18},{"a":12,"b":15}]'::jsonb,false),
    ('f7100000-0000-4000-8000-000000000014'::uuid,2,1, 9::bigint,16::bigint, 9::bigint,2,1,'[{"a":18,"b":11},{"a":16,"b":18},{"a":15,"b":13}]'::jsonb,false),
    ('f7100000-0000-4000-8000-000000000015'::uuid,3,0, 8::bigint, 9::bigint,NULL::bigint,NULL::integer,NULL::integer,NULL::jsonb,false),
    ('f7100000-0000-4000-8000-000000000016'::uuid,4,0, 1::bigint,16::bigint,NULL::bigint,NULL::integer,NULL::integer,NULL::jsonb,true)
)
INSERT INTO public.bracket_matches (
  id, championship_id, category_id, round_index, match_index,
  participant_a_id, participant_b_id, winner_participant_id,
  sets_a, sets_b, set_details, is_third_place, court_label
)
SELECT plan.id,
  '61212887-0228-4fcb-9f45-016f0399b01e'::uuid,
  '3fddb756-c9b3-42a6-8cbd-4b1003ecc891'::uuid,
  plan.round_index, plan.match_index, participant_a.id, participant_b.id, winner.id,
  plan.sets_a, plan.sets_b, plan.set_details, plan.is_third_place
  , '1'
FROM match_plan plan
LEFT JOIN ordered_participants participant_a ON participant_a.position = plan.position_a
LEFT JOIN ordered_participants participant_b ON participant_b.position = plan.position_b
LEFT JOIN ordered_participants winner ON winner.position = plan.winner_position;

COMMIT;

SELECT
  (SELECT count(*) FROM public.athlete_tickets WHERE id::text LIKE 'f7000000-0000-4000-8000-%') AS fake_tickets,
  (SELECT count(*) FROM public.bracket_matches WHERE id::text LIKE 'f7100000-0000-4000-8000-%') AS demo_matches,
  (SELECT count(*) FROM public.bracket_matches WHERE id::text LIKE 'f7100000-0000-4000-8000-%' AND winner_participant_id IS NOT NULL) AS completed_matches;
