-- Impede reenvio do mesmo marco do funil para a mesma sessão e contexto.
BEGIN;

WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY session_id, event_name,
      COALESCE(championship_id, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid)
    ORDER BY created_at, id
  ) AS duplicate_rank
  FROM public.public_funnel_events
)
DELETE FROM public.public_funnel_events AS events
USING ranked
WHERE events.id = ranked.id AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS public_funnel_events_dedupe_idx
  ON public.public_funnel_events
  (session_id, event_name,
   (COALESCE(championship_id, '00000000-0000-0000-0000-000000000000'::uuid)),
   (COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid)));

COMMIT;
