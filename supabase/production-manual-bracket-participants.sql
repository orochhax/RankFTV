BEGIN;

ALTER TABLE public.bracket_participants
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.bracket_participants
  DROP CONSTRAINT IF EXISTS bracket_participants_source_type_check,
  DROP CONSTRAINT IF EXISTS bracket_participants_check,
  DROP CONSTRAINT IF EXISTS bracket_participants_source_reference_check;

ALTER TABLE public.bracket_participants
  ADD CONSTRAINT bracket_participants_source_type_check
    CHECK (source_type IN ('team', 'athlete_ticket', 'manual')),
  ADD CONSTRAINT bracket_participants_source_reference_check
    CHECK (
      (source_type = 'team' AND team_id IS NOT NULL AND athlete_ticket_id IS NULL)
      OR (source_type = 'athlete_ticket' AND athlete_ticket_id IS NOT NULL AND team_id IS NULL)
      OR (source_type = 'manual' AND team_id IS NULL AND athlete_ticket_id IS NULL AND created_by IS NOT NULL)
    );

CREATE UNIQUE INDEX IF NOT EXISTS bracket_participants_manual_name_uidx
  ON public.bracket_participants (championship_id, category_id, lower(display_name_snapshot))
  WHERE source_type = 'manual' AND active = true;

COMMIT;
NOTIFY pgrst, 'reload schema';
