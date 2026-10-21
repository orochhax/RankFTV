-- Central de Evolução — dados pessoais isolados do restante da RankFTV.
-- Aplicar somente depois de homologação e aprovação explícita.

CREATE TABLE IF NOT EXISTS public.evo_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_study_target_minutes integer NOT NULL DEFAULT 120 CHECK (daily_study_target_minutes BETWEEN 1 AND 1440),
  weekly_study_target_minutes integer NOT NULL DEFAULT 600 CHECK (weekly_study_target_minutes BETWEEN 1 AND 10080),
  follower_target integer NOT NULL DEFAULT 500 CHECK (follower_target >= 0),
  current_weight_kg numeric(5,2) CHECK (current_weight_kg IS NULL OR current_weight_kg BETWEEN 20 AND 500),
  goal_weight_kg numeric(5,2) CHECK (goal_weight_kg IS NULL OR goal_weight_kg BETWEEN 20 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evo_study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_date date NOT NULL,
  minutes integer NOT NULL CHECK (minutes BETWEEN 1 AND 1440),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'timer')),
  started_at timestamptz,
  ended_at timestamptz,
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX IF NOT EXISTS evo_study_sessions_user_date_idx ON public.evo_study_sessions(user_id, study_date DESC);

CREATE TABLE IF NOT EXISTS public.evo_roadmap_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id text NOT NULL CHECK (char_length(task_id) BETWEEN 1 AND 160),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, task_id)
);

CREATE TABLE IF NOT EXISTS public.evo_training_logs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_date date NOT NULL,
  body_parts text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, training_date),
  CHECK (cardinality(body_parts) BETWEEN 1 AND 8)
);

CREATE TABLE IF NOT EXISTS public.evo_weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_on date NOT NULL,
  weight_kg numeric(5,2) NOT NULL CHECK (weight_kg BETWEEN 20 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, measured_on)
);
CREATE INDEX IF NOT EXISTS evo_weight_logs_user_date_idx ON public.evo_weight_logs(user_id, measured_on DESC);

CREATE TABLE IF NOT EXISTS public.evo_follower_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_on date NOT NULL,
  followers integer NOT NULL CHECK (followers >= 0),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, measured_on)
);
CREATE INDEX IF NOT EXISTS evo_follower_snapshots_user_date_idx ON public.evo_follower_snapshots(user_id, measured_on DESC);

CREATE TABLE IF NOT EXISTS public.evo_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  purchased_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evo_equipment_user_priority_idx ON public.evo_equipment(user_id, priority, created_at);

CREATE TABLE IF NOT EXISTS public.evo_weekly_videos (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  idea_id uuid REFERENCES public.yt_ideas(id) ON DELETE SET NULL,
  title_snapshot text CHECK (title_snapshot IS NULL OR char_length(title_snapshot) <= 240),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);
CREATE INDEX IF NOT EXISTS evo_weekly_videos_idea_idx ON public.evo_weekly_videos(idea_id) WHERE idea_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.evo_project_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text NOT NULL CHECK (char_length(project_id) BETWEEN 1 AND 100),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'blocked', 'completed')),
  note text CHECK (note IS NULL OR char_length(note) <= 1000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS public.evo_source_snapshots (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_kind text NOT NULL CHECK (source_kind IN ('roadmap', 'rankftv')),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  source_hash text NOT NULL CHECK (char_length(source_hash) BETWEEN 16 AND 128),
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, source_kind)
);

CREATE TABLE IF NOT EXISTS public.evo_ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  verdict text NOT NULL CHECK (char_length(verdict) BETWEEN 1 AND 2000),
  actions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(actions) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evo_ai_reviews_user_week_idx ON public.evo_ai_reviews(user_id, week_start DESC, created_at DESC);

CREATE OR REPLACE FUNCTION public.evo_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.evo_touch_updated_at() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'evo_settings', 'evo_study_sessions', 'evo_roadmap_progress',
    'evo_training_logs', 'evo_weight_logs', 'evo_follower_snapshots',
    'evo_equipment', 'evo_weekly_videos', 'evo_project_progress',
    'evo_source_snapshots', 'evo_ai_reviews'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_owner_all', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id)',
      table_name || '_owner_all', table_name
    );
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS evo_settings_touch_updated_at ON public.evo_settings;
CREATE TRIGGER evo_settings_touch_updated_at BEFORE UPDATE ON public.evo_settings
FOR EACH ROW EXECUTE FUNCTION public.evo_touch_updated_at();
DROP TRIGGER IF EXISTS evo_training_logs_touch_updated_at ON public.evo_training_logs;
CREATE TRIGGER evo_training_logs_touch_updated_at BEFORE UPDATE ON public.evo_training_logs
FOR EACH ROW EXECUTE FUNCTION public.evo_touch_updated_at();
DROP TRIGGER IF EXISTS evo_equipment_touch_updated_at ON public.evo_equipment;
CREATE TRIGGER evo_equipment_touch_updated_at BEFORE UPDATE ON public.evo_equipment
FOR EACH ROW EXECUTE FUNCTION public.evo_touch_updated_at();
DROP TRIGGER IF EXISTS evo_weekly_videos_touch_updated_at ON public.evo_weekly_videos;
CREATE TRIGGER evo_weekly_videos_touch_updated_at BEFORE UPDATE ON public.evo_weekly_videos
FOR EACH ROW EXECUTE FUNCTION public.evo_touch_updated_at();

COMMENT ON TABLE public.evo_settings IS 'Preferências privadas da Central de Evolução.';
COMMENT ON TABLE public.evo_source_snapshots IS 'Cópias importadas manualmente dos arquivos locais; nunca lê caminhos locais em produção.';
