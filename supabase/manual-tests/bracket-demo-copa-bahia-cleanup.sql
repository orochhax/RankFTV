-- Remove exclusivamente a demonstracao Copa Bahia / Aprendiz.
-- Preserva o campeonato, a categoria e a unica dupla real. Interrompe se o
-- conjunto remoto nao for exatamente o seed esperado.

BEGIN;

DO $$
DECLARE
  v_fake_tickets integer;
  v_fake_participants integer;
  v_real_participants integer;
  v_matches integer;
BEGIN
  SELECT count(*) INTO v_fake_tickets
  FROM public.athlete_tickets
  WHERE id::text LIKE 'f7000000-0000-4000-8000-%';

  SELECT count(*) FILTER (WHERE athlete_ticket_id::text LIKE 'f7000000-0000-4000-8000-%'),
         count(*) FILTER (WHERE athlete_ticket_id IS NULL OR athlete_ticket_id::text NOT LIKE 'f7000000-0000-4000-8000-%')
    INTO v_fake_participants, v_real_participants
  FROM public.bracket_participants
  WHERE championship_id = '61212887-0228-4fcb-9f45-016f0399b01e'::uuid
    AND category_id = '3fddb756-c9b3-42a6-8cbd-4b1003ecc891'::uuid
    AND active = true;

  SELECT count(*) INTO v_matches
  FROM public.bracket_matches
  WHERE championship_id = '61212887-0228-4fcb-9f45-016f0399b01e'::uuid
    AND category_id = '3fddb756-c9b3-42a6-8cbd-4b1003ecc891'::uuid;

  IF v_fake_tickets <> 15 OR v_fake_participants <> 15 OR v_real_participants <> 1 OR v_matches <> 30 THEN
    RAISE EXCEPTION 'BRACKET_DEMO_CLEANUP_REFUSED tickets=% fake_participants=% real_participants=% matches=%',
      v_fake_tickets, v_fake_participants, v_real_participants, v_matches;
  END IF;
END $$;

SELECT public.reverse_bracket_category_ratings(
  '61212887-0228-4fcb-9f45-016f0399b01e'::uuid,
  '3fddb756-c9b3-42a6-8cbd-4b1003ecc891'::uuid
);

DELETE FROM public.bracket_matches
WHERE championship_id = '61212887-0228-4fcb-9f45-016f0399b01e'::uuid
  AND category_id = '3fddb756-c9b3-42a6-8cbd-4b1003ecc891'::uuid;

DELETE FROM public.support_case_attachments
WHERE case_id IN (
  SELECT id FROM public.support_cases
  WHERE athlete_ticket_id::text LIKE 'f7000000-0000-4000-8000-%'
);

DELETE FROM public.support_case_notes
WHERE case_id IN (
  SELECT id FROM public.support_cases
  WHERE athlete_ticket_id::text LIKE 'f7000000-0000-4000-8000-%'
);

DELETE FROM public.support_cases
WHERE athlete_ticket_id::text LIKE 'f7000000-0000-4000-8000-%';

DELETE FROM public.athlete_ticket_credential_events
WHERE athlete_ticket_id::text LIKE 'f7000000-0000-4000-8000-%';

DELETE FROM public.athlete_tickets
WHERE id::text LIKE 'f7000000-0000-4000-8000-%';

UPDATE public.championship_categories
SET bracket_confirmed_at = NULL
WHERE id = '3fddb756-c9b3-42a6-8cbd-4b1003ecc891'::uuid
  AND championship_id = '61212887-0228-4fcb-9f45-016f0399b01e'::uuid;

COMMIT;

SELECT
  (SELECT count(*) FROM public.athlete_tickets WHERE id::text LIKE 'f7000000-0000-4000-8000-%') AS fake_tickets_remaining,
  (SELECT count(*) FROM public.bracket_participants WHERE athlete_ticket_id::text LIKE 'f7000000-0000-4000-8000-%') AS fake_participants_remaining,
  (SELECT count(*) FROM public.bracket_matches WHERE championship_id = '61212887-0228-4fcb-9f45-016f0399b01e'::uuid AND category_id = '3fddb756-c9b3-42a6-8cbd-4b1003ecc891'::uuid) AS demo_matches_remaining;
