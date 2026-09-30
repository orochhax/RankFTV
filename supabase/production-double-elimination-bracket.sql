-- RankFTV V1 — eliminatória simples e dupla eliminação.
-- Aditiva, idempotente e compatível com chaveamentos existentes.

ALTER TABLE public.championship_categories
  ADD COLUMN IF NOT EXISTS bracket_format text NOT NULL DEFAULT 'single_elimination';

ALTER TABLE public.championship_categories
  DROP CONSTRAINT IF EXISTS championship_categories_bracket_format_check;
ALTER TABLE public.championship_categories
  ADD CONSTRAINT championship_categories_bracket_format_check
  CHECK (bracket_format IN ('single_elimination', 'double_elimination'));

ALTER TABLE public.bracket_matches
  ADD COLUMN IF NOT EXISTS bracket_section text NOT NULL DEFAULT 'winners',
  ADD COLUMN IF NOT EXISTS section_round_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_winner_match_id uuid REFERENCES public.bracket_matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_winner_slot text,
  ADD COLUMN IF NOT EXISTS next_loser_match_id uuid REFERENCES public.bracket_matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_loser_slot text;

UPDATE public.bracket_matches
SET bracket_section = 'third_place'
WHERE is_third_place = true AND bracket_section <> 'third_place';

UPDATE public.bracket_matches
SET section_round_index = round_index
WHERE bracket_section = 'winners' AND section_round_index = 0;

ALTER TABLE public.bracket_matches
  DROP CONSTRAINT IF EXISTS bracket_matches_section_check,
  DROP CONSTRAINT IF EXISTS bracket_matches_next_winner_slot_check,
  DROP CONSTRAINT IF EXISTS bracket_matches_next_loser_slot_check;

ALTER TABLE public.bracket_matches
  ADD CONSTRAINT bracket_matches_section_check
    CHECK (bracket_section IN ('winners', 'losers', 'grand_final', 'reset_final', 'third_place')),
  ADD CONSTRAINT bracket_matches_next_winner_slot_check
    CHECK (next_winner_slot IS NULL OR next_winner_slot IN ('a', 'b')),
  ADD CONSTRAINT bracket_matches_next_loser_slot_check
    CHECK (next_loser_slot IS NULL OR next_loser_slot IN ('a', 'b'));

CREATE INDEX IF NOT EXISTS bracket_matches_section_round_idx
  ON public.bracket_matches (championship_id, category_id, bracket_section, section_round_index, match_index);

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-double-elimination-bracket done';
