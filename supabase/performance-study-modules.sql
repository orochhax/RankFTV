-- Estudos v2: multiplos roadmaps, modulos, recursos e avaliacoes.
-- Execute depois de performance-roadmap-ai.sql.

-- Um usuario pode manter mais de um roadmap em andamento e escolher qual visualizar.
DROP INDEX IF EXISTS perf_study_active_roadmap_idx;

ALTER TABLE perf_study_roadmap
  ADD COLUMN IF NOT EXISTS difficulty_level text;
ALTER TABLE perf_study_roadmap
  ADD COLUMN IF NOT EXISTS quality_score integer;
ALTER TABLE perf_study_roadmap
  ADD COLUMN IF NOT EXISTS workload_score integer;
ALTER TABLE perf_study_roadmap
  ADD COLUMN IF NOT EXISTS total_estimated_minutes integer;

ALTER TABLE perf_study_roadmap
  DROP CONSTRAINT IF EXISTS perf_study_roadmap_difficulty_valid;
ALTER TABLE perf_study_roadmap
  ADD CONSTRAINT perf_study_roadmap_difficulty_valid
  CHECK (difficulty_level IS NULL OR difficulty_level IN ('introductory', 'intermediate', 'advanced', 'mixed'));
ALTER TABLE perf_study_roadmap
  DROP CONSTRAINT IF EXISTS perf_study_roadmap_quality_score_valid;
ALTER TABLE perf_study_roadmap
  ADD CONSTRAINT perf_study_roadmap_quality_score_valid
  CHECK (quality_score IS NULL OR quality_score BETWEEN 0 AND 100);
ALTER TABLE perf_study_roadmap
  DROP CONSTRAINT IF EXISTS perf_study_roadmap_workload_score_valid;
ALTER TABLE perf_study_roadmap
  ADD CONSTRAINT perf_study_roadmap_workload_score_valid
  CHECK (workload_score IS NULL OR workload_score BETWEEN 0 AND 100);
ALTER TABLE perf_study_roadmap
  DROP CONSTRAINT IF EXISTS perf_study_roadmap_total_minutes_valid;
ALTER TABLE perf_study_roadmap
  ADD CONSTRAINT perf_study_roadmap_total_minutes_valid
  CHECK (total_estimated_minutes IS NULL OR total_estimated_minutes >= 0);

CREATE TABLE IF NOT EXISTS perf_study_roadmap_module (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roadmap_id uuid NOT NULL REFERENCES perf_study_roadmap(id) ON DELETE CASCADE,
  title text NOT NULL,
  objective text,
  success_criteria text,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_study_module_roadmap_order_unique UNIQUE (roadmap_id, order_index)
);
ALTER TABLE perf_study_roadmap_module
  ADD COLUMN IF NOT EXISTS topics jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE perf_study_roadmap_module
  DROP CONSTRAINT IF EXISTS perf_study_module_topics_valid;
ALTER TABLE perf_study_roadmap_module
  ADD CONSTRAINT perf_study_module_topics_valid CHECK (jsonb_typeof(topics) = 'array');
CREATE INDEX IF NOT EXISTS perf_study_module_user_roadmap_idx
  ON perf_study_roadmap_module(user_id, roadmap_id, order_index);

ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES perf_study_roadmap_module(id) ON DELETE CASCADE;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS completion_criteria text;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS instructions text;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS requirements text;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS workspace text;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS resource_title text;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS resource_url text;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS resource_channel text;

ALTER TABLE perf_study_roadmap_item
  DROP CONSTRAINT IF EXISTS perf_study_item_kind_valid;
ALTER TABLE perf_study_roadmap_item
  ADD CONSTRAINT perf_study_item_kind_valid
  CHECK (item_kind IN (
    'core', 'reinforcement', 'challenge', 'check', 'criterion', 'general',
    'reading', 'video', 'practice', 'quiz', 'project', 'checkpoint'
  ));
CREATE INDEX IF NOT EXISTS perf_study_item_module_order_idx
  ON perf_study_roadmap_item(module_id, order_index)
  WHERE module_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS perf_study_assessment_question (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES perf_study_roadmap_item(id) ON DELETE CASCADE,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  prompt text NOT NULL,
  options jsonb NOT NULL,
  correct_option integer,
  correct_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation text NOT NULL,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_study_question_options_valid CHECK (
    jsonb_typeof(options) = 'array'
    AND jsonb_array_length(options) BETWEEN 2 AND 8
  ),
  CONSTRAINT perf_study_question_answer_valid CHECK (
    (question_type = 'multiple_choice'
      AND correct_option >= 0
      AND correct_option < jsonb_array_length(options)
      AND correct_order = '[]'::jsonb)
    OR
    (question_type = 'ordering'
      AND correct_option IS NULL
      AND jsonb_typeof(correct_order) = 'array'
      AND jsonb_array_length(correct_order) = jsonb_array_length(options))
  ),
  CONSTRAINT perf_study_question_type_valid CHECK (question_type IN ('multiple_choice', 'ordering')),
  CONSTRAINT perf_study_question_item_order_unique UNIQUE (item_id, order_index)
);
ALTER TABLE perf_study_assessment_question
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'multiple_choice';
ALTER TABLE perf_study_assessment_question
  ADD COLUMN IF NOT EXISTS correct_order jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE perf_study_assessment_question
  ALTER COLUMN correct_option DROP NOT NULL;
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
  ADD CONSTRAINT perf_study_question_type_valid CHECK (question_type IN ('multiple_choice', 'ordering'));
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
CREATE INDEX IF NOT EXISTS perf_study_question_user_item_idx
  ON perf_study_assessment_question(user_id, item_id, order_index);

CREATE TABLE IF NOT EXISTS perf_study_assessment_attempt (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES perf_study_roadmap_item(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  correct_count integer NOT NULL CHECK (correct_count >= 0),
  total_count integer NOT NULL CHECK (total_count > 0),
  score numeric(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_study_attempt_answers_valid CHECK (jsonb_typeof(answers) = 'object')
);
CREATE INDEX IF NOT EXISTS perf_study_attempt_user_item_idx
  ON perf_study_assessment_attempt(user_id, item_id, submitted_at DESC);

ALTER TABLE perf_study_roadmap_generation
  ADD COLUMN IF NOT EXISTS web_search_calls integer NOT NULL DEFAULT 0
  CHECK (web_search_calls >= 0);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'perf_study_roadmap_module',
    'perf_study_assessment_question',
    'perf_study_assessment_attempt'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name);
    EXECUTE format('DROP POLICY IF EXISTS owner_all ON %I;', table_name);
    EXECUTE format(
      'CREATE POLICY owner_all ON %I FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());',
      table_name
    );
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  perf_study_roadmap_module,
  perf_study_assessment_question,
  perf_study_assessment_attempt
TO authenticated;

NOTIFY pgrst, 'reload schema';
