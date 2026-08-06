-- Detalhes praticos por etapa e perguntas de ordenacao para os roadmaps.
-- Migration aditiva e idempotente: preserva roadmaps, perguntas e tentativas existentes.

BEGIN;

ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS requirements text;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS workspace text;

ALTER TABLE perf_study_assessment_question
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'multiple_choice';
ALTER TABLE perf_study_assessment_question
  ADD COLUMN IF NOT EXISTS correct_order jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE perf_study_assessment_question
  ALTER COLUMN correct_option DROP NOT NULL;

UPDATE perf_study_assessment_question
SET question_type = 'multiple_choice',
    correct_order = '[]'::jsonb
WHERE question_type IS NULL
   OR question_type NOT IN ('multiple_choice', 'ordering');

ALTER TABLE perf_study_assessment_question
  DROP CONSTRAINT IF EXISTS perf_study_question_options_valid;
ALTER TABLE perf_study_assessment_question
  DROP CONSTRAINT IF EXISTS perf_study_question_answer_valid;
ALTER TABLE perf_study_assessment_question
  DROP CONSTRAINT IF EXISTS perf_study_question_type_valid;

ALTER TABLE perf_study_assessment_question
  ADD CONSTRAINT perf_study_question_options_valid CHECK (
    jsonb_typeof(options) = 'array'
    AND jsonb_array_length(options) BETWEEN 2 AND 8
  );
ALTER TABLE perf_study_assessment_question
  ADD CONSTRAINT perf_study_question_type_valid CHECK (
    question_type IN ('multiple_choice', 'ordering')
  );
ALTER TABLE perf_study_assessment_question
  ADD CONSTRAINT perf_study_question_answer_valid CHECK (
    (question_type = 'multiple_choice'
      AND correct_option >= 0
      AND correct_option < jsonb_array_length(options)
      AND correct_order = '[]'::jsonb)
    OR
    (question_type = 'ordering'
      AND correct_option IS NULL
      AND jsonb_typeof(correct_order) = 'array'
      AND jsonb_array_length(correct_order) = jsonb_array_length(options))
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
