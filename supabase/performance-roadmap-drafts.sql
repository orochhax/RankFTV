-- Rascunhos persistentes e importacao normalizada de roadmaps.
-- Execute depois de performance-roadmap-ai.sql e performance-study-modules.sql.

ALTER TABLE perf_study_roadmap_generation
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'ai';
ALTER TABLE perf_study_roadmap_generation
  ADD COLUMN IF NOT EXISTS original_filename text;
ALTER TABLE perf_study_roadmap_generation
  ADD COLUMN IF NOT EXISTS source_sha256 text;
ALTER TABLE perf_study_roadmap_generation
  ADD COLUMN IF NOT EXISTS preview_title text;
ALTER TABLE perf_study_roadmap_generation
  ADD COLUMN IF NOT EXISTS preview_description text;
ALTER TABLE perf_study_roadmap_generation
  ADD COLUMN IF NOT EXISTS module_count integer;
ALTER TABLE perf_study_roadmap_generation
  ADD COLUMN IF NOT EXISTS step_count integer;
ALTER TABLE perf_study_roadmap_generation
  ADD COLUMN IF NOT EXISTS total_estimated_minutes integer;

ALTER TABLE perf_study_roadmap_generation
  DROP CONSTRAINT IF EXISTS perf_study_generation_origin_valid;
ALTER TABLE perf_study_roadmap_generation
  ADD CONSTRAINT perf_study_generation_origin_valid
  CHECK (origin IN ('ai', 'import'));
ALTER TABLE perf_study_roadmap_generation
  DROP CONSTRAINT IF EXISTS perf_study_generation_module_count_valid;
ALTER TABLE perf_study_roadmap_generation
  ADD CONSTRAINT perf_study_generation_module_count_valid
  CHECK (module_count IS NULL OR module_count >= 0);
ALTER TABLE perf_study_roadmap_generation
  DROP CONSTRAINT IF EXISTS perf_study_generation_step_count_valid;
ALTER TABLE perf_study_roadmap_generation
  ADD CONSTRAINT perf_study_generation_step_count_valid
  CHECK (step_count IS NULL OR step_count >= 0);
ALTER TABLE perf_study_roadmap_generation
  DROP CONSTRAINT IF EXISTS perf_study_generation_total_minutes_valid;
ALTER TABLE perf_study_roadmap_generation
  ADD CONSTRAINT perf_study_generation_total_minutes_valid
  CHECK (total_estimated_minutes IS NULL OR total_estimated_minutes >= 0);

-- Torna as geracoes antigas imediatamente recuperaveis na biblioteca.
UPDATE perf_study_roadmap_generation AS generation
SET
  preview_title = COALESCE(preview_title, generated_plan ->> 'title'),
  preview_description = COALESCE(preview_description, generated_plan ->> 'description'),
  module_count = COALESCE(
    module_count,
    CASE
      WHEN jsonb_typeof(generated_plan -> 'modules') = 'array'
        THEN jsonb_array_length(generated_plan -> 'modules')
      ELSE 0
    END
  ),
  step_count = COALESCE(
    step_count,
    (SELECT count(*)::integer FROM jsonb_path_query(generation.generated_plan, '$.modules[*].steps[*]'))
  ),
  total_estimated_minutes = COALESCE(
    total_estimated_minutes,
    CASE
      WHEN (generated_plan ->> 'totalEstimatedMinutes') ~ '^[0-9]+$'
        THEN (generated_plan ->> 'totalEstimatedMinutes')::integer
      ELSE 0
    END
  )
WHERE generated_plan IS NOT NULL;

CREATE INDEX IF NOT EXISTS perf_study_generation_ready_drafts_idx
  ON perf_study_roadmap_generation(user_id, created_at DESC)
  WHERE status = 'ready';

NOTIFY pgrst, 'reload schema';
