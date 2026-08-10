-- Modelos reutilizaveis de treino por grupos musculares.
-- Migration aditiva/idempotente. Execute manualmente no Supabase SQL Editor.

BEGIN;

CREATE TABLE IF NOT EXISTS perf_academy_workout_template (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  muscle_groups text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_academy_workout_template_muscles_valid CHECK (
    cardinality(muscle_groups) > 0
    AND muscle_groups <@ ARRAY[
      'peito','ombros','biceps','triceps','antebracos','abdomen','costas',
      'gluteos','quadriceps','posteriores','panturrilhas'
    ]::text[]
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS perf_academy_workout_template_name_idx
  ON perf_academy_workout_template(user_id, lower(btrim(name)));
CREATE INDEX IF NOT EXISTS perf_academy_workout_template_user_idx
  ON perf_academy_workout_template(user_id, created_at);

ALTER TABLE perf_academy_workout_template ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS perf_academy_workout_template_owner ON perf_academy_workout_template;
CREATE POLICY perf_academy_workout_template_owner
  ON perf_academy_workout_template
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON perf_academy_workout_template TO authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
