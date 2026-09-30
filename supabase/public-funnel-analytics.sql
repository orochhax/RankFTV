BEGIN;

CREATE TABLE IF NOT EXISTS public.public_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  event_name text NOT NULL CHECK (event_name IN (
    'search_used', 'championship_viewed', 'category_selected',
    'athlete_data_started', 'checkout_reviewed', 'payment_confirmed'
  )),
  championship_id uuid REFERENCES public.championships(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.championship_categories(id) ON DELETE SET NULL,
  experience_version text NOT NULL CHECK (experience_version IN ('legacy', 'discovery_v2')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (occurred_at <= now() + interval '5 minutes')
);

CREATE INDEX IF NOT EXISTS public_funnel_events_occurred_idx
  ON public.public_funnel_events (occurred_at DESC, event_name, experience_version);
CREATE INDEX IF NOT EXISTS public_funnel_events_session_idx
  ON public.public_funnel_events (session_id, occurred_at);

ALTER TABLE public.public_funnel_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_funnel_events FROM anon, authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
