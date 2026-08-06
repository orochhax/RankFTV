-- Geracao de roadmaps de estudo com IA.
-- Execute depois de performance-widgets.sql.

CREATE TABLE IF NOT EXISTS perf_study_roadmap_generation (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_plan jsonb,
  model text,
  prompt_version text NOT NULL DEFAULT 'roadmap-v1',
  provider_response_id text,
  input_tokens integer CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens integer CHECK (output_tokens IS NULL OR output_tokens >= 0),
  error_message text,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_study_generation_status_valid
    CHECK (status IN ('draft', 'generating', 'ready', 'accepted', 'failed'))
);

CREATE INDEX IF NOT EXISTS perf_study_generation_user_created_idx
  ON perf_study_roadmap_generation(user_id, created_at DESC);

ALTER TABLE perf_study_roadmap
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

ALTER TABLE perf_study_roadmap
  DROP CONSTRAINT IF EXISTS perf_study_roadmap_source_valid;

ALTER TABLE perf_study_roadmap
  ADD CONSTRAINT perf_study_roadmap_source_valid
  CHECK (source IN ('manual', 'import', 'ai'));

ALTER TABLE perf_study_roadmap
  ADD COLUMN IF NOT EXISTS generation_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'perf_study_roadmap_generation_fk'
      AND conrelid = 'perf_study_roadmap'::regclass
  ) THEN
    ALTER TABLE perf_study_roadmap
      ADD CONSTRAINT perf_study_roadmap_generation_fk
      FOREIGN KEY (generation_id)
      REFERENCES perf_study_roadmap_generation(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS perf_study_roadmap_generation_unique_idx
  ON perf_study_roadmap(generation_id)
  WHERE generation_id IS NOT NULL;

ALTER TABLE perf_study_roadmap_generation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_all ON perf_study_roadmap_generation;
CREATE POLICY owner_all ON perf_study_roadmap_generation
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE perf_study_roadmap_generation
  TO authenticated;

NOTIFY pgrst, 'reload schema';
