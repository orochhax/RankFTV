-- Estrutura didatica detalhada inspirada no roadmap de referencia do usuario.
-- Migration aditiva e idempotente: roadmaps e progresso existentes sao preservados.

BEGIN;

ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS preparation_steps jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS practice_exercises jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS reflection_questions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS completion_checklist jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS evidence_prompt text;

ALTER TABLE perf_study_roadmap_item
  DROP CONSTRAINT IF EXISTS perf_study_preparation_steps_valid;
ALTER TABLE perf_study_roadmap_item
  DROP CONSTRAINT IF EXISTS perf_study_practice_exercises_valid;
ALTER TABLE perf_study_roadmap_item
  DROP CONSTRAINT IF EXISTS perf_study_reflection_questions_valid;
ALTER TABLE perf_study_roadmap_item
  DROP CONSTRAINT IF EXISTS perf_study_completion_checklist_valid;

ALTER TABLE perf_study_roadmap_item
  ADD CONSTRAINT perf_study_preparation_steps_valid CHECK (
    jsonb_typeof(preparation_steps) = 'array'
    AND jsonb_array_length(preparation_steps) <= 8
  );
ALTER TABLE perf_study_roadmap_item
  ADD CONSTRAINT perf_study_practice_exercises_valid CHECK (
    jsonb_typeof(practice_exercises) = 'array'
    AND jsonb_array_length(practice_exercises) <= 8
  );
ALTER TABLE perf_study_roadmap_item
  ADD CONSTRAINT perf_study_reflection_questions_valid CHECK (
    jsonb_typeof(reflection_questions) = 'array'
    AND jsonb_array_length(reflection_questions) <= 8
  );
ALTER TABLE perf_study_roadmap_item
  ADD CONSTRAINT perf_study_completion_checklist_valid CHECK (
    jsonb_typeof(completion_checklist) = 'array'
    AND jsonb_array_length(completion_checklist) <= 8
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
