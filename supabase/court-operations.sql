BEGIN;

ALTER TABLE public.bracket_matches ADD COLUMN IF NOT EXISTS court_label text;
ALTER TABLE public.bracket_matches ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE public.bracket_matches ADD COLUMN IF NOT EXISTS called_at timestamptz;
ALTER TABLE public.bracket_matches ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE public.bracket_matches ADD COLUMN IF NOT EXISTS finished_at timestamptz;
ALTER TABLE public.bracket_matches ADD COLUMN IF NOT EXISTS operational_status text NOT NULL DEFAULT 'scheduled';

ALTER TABLE public.bracket_matches DROP CONSTRAINT IF EXISTS bracket_matches_operational_status_check;
ALTER TABLE public.bracket_matches ADD CONSTRAINT bracket_matches_operational_status_check
  CHECK (operational_status IN ('scheduled', 'called', 'in_progress', 'finished'));

CREATE INDEX IF NOT EXISTS bracket_matches_court_schedule_idx
  ON public.bracket_matches (championship_id, court_label, scheduled_at)
  WHERE court_label IS NOT NULL;

COMMIT;
NOTIFY pgrst, 'reload schema';
