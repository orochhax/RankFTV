BEGIN;

ALTER TABLE public.championships
  ADD COLUMN IF NOT EXISTS total_courts integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS main_court_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS primary_court_number integer NOT NULL DEFAULT 1;

ALTER TABLE public.championships
  DROP CONSTRAINT IF EXISTS championships_total_courts_check,
  DROP CONSTRAINT IF EXISTS championships_main_court_count_check,
  DROP CONSTRAINT IF EXISTS championships_primary_court_number_check,
  ADD CONSTRAINT championships_total_courts_check
    CHECK (total_courts BETWEEN 1 AND 32),
  ADD CONSTRAINT championships_main_court_count_check
    CHECK (main_court_count BETWEEN 1 AND total_courts),
  ADD CONSTRAINT championships_primary_court_number_check
    CHECK (primary_court_number BETWEEN 1 AND total_courts);

COMMIT;
NOTIFY pgrst, 'reload schema';
