-- Remove exclusivamente os dados criados por bracket-demo-copa-bahia-seed.sql.

BEGIN;

DELETE FROM public.bracket_matches
WHERE id::text LIKE 'f7100000-0000-4000-8000-%';

DELETE FROM public.support_case_attachments
WHERE case_id IN (
  SELECT id
  FROM public.support_cases
  WHERE athlete_ticket_id::text LIKE 'f7000000-0000-4000-8000-%'
);

DELETE FROM public.support_case_notes
WHERE case_id IN (
  SELECT id
  FROM public.support_cases
  WHERE athlete_ticket_id::text LIKE 'f7000000-0000-4000-8000-%'
);

DELETE FROM public.support_cases
WHERE athlete_ticket_id::text LIKE 'f7000000-0000-4000-8000-%';

DELETE FROM public.athlete_ticket_credential_events
WHERE athlete_ticket_id::text LIKE 'f7000000-0000-4000-8000-%';

DELETE FROM public.athlete_tickets
WHERE id::text LIKE 'f7000000-0000-4000-8000-%';

COMMIT;

SELECT
  (SELECT count(*) FROM public.athlete_tickets WHERE id::text LIKE 'f7000000-0000-4000-8000-%') AS fake_tickets_remaining,
  (SELECT count(*) FROM public.bracket_matches WHERE id::text LIKE 'f7100000-0000-4000-8000-%') AS demo_matches_remaining;
