-- Remove somente os dados ficticios criados por organizer-wallet-demo-seed.sql.
BEGIN;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.organizer_withdrawal_allocations allocation
    JOIN public.organizer_receivables receivable ON receivable.id=allocation.receivable_id
    WHERE receivable.source_type='athlete_ticket'
      AND receivable.source_id::text LIKE 'd8100000-0000-4000-8000-%'
  ) THEN
    RAISE EXCEPTION 'DEMO_WITHDRAWAL_EXISTS_CLEANUP_ABORTED';
  END IF;
END;
$$;

DELETE FROM public.organizer_anticipations
WHERE receivable_id IN (
  SELECT id FROM public.organizer_receivables
  WHERE source_type='athlete_ticket'
    AND source_id::text LIKE 'd8100000-0000-4000-8000-%'
);
DELETE FROM public.organizer_receivables
WHERE source_type='athlete_ticket'
  AND source_id::text LIKE 'd8100000-0000-4000-8000-%';
DELETE FROM public.athlete_tickets
WHERE id::text LIKE 'd8100000-0000-4000-8000-%';
COMMIT;

SELECT count(*) AS dados_demo_restantes
FROM public.athlete_tickets
WHERE id::text LIKE 'd8100000-0000-4000-8000-%';
