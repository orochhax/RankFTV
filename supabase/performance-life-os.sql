-- Carlos Life OS: extensao aditiva do painel privado /admin/performance.
-- Seguro para executar mais de uma vez. Nao remove dados existentes.

CREATE TABLE IF NOT EXISTS perf_category (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  area text,
  color text,
  icon text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS perf_category_active_name_idx
  ON perf_category(user_id, type, lower(name)) WHERE active;

CREATE TABLE IF NOT EXISTS perf_event (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  category_id uuid REFERENCES perf_category(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'planned',
  source text NOT NULL DEFAULT 'manual',
  external_id text,
  external_calendar_id text,
  location text,
  link text,
  recurrence_rule jsonb,
  recurrence_group_id uuid,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_event_dates_valid CHECK (end_at > start_at),
  CONSTRAINT perf_event_status_valid CHECK (status IN ('planned','in_progress','completed','cancelled')),
  CONSTRAINT perf_event_source_valid CHECK (source IN ('manual','google_calendar','system','recurring'))
);
CREATE UNIQUE INDEX IF NOT EXISTS perf_event_external_idx
  ON perf_event(user_id, external_calendar_id, external_id)
  WHERE external_id IS NOT NULL AND external_calendar_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS perf_event_user_start_idx ON perf_event(user_id, start_at);

CREATE TABLE IF NOT EXISTS perf_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL,
  area text NOT NULL,
  type text,
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  intensity numeric CHECK (intensity IS NULL OR (intensity >= 1 AND intensity <= 10)),
  status text NOT NULL DEFAULT 'completed',
  result text,
  learning text,
  personal_rating numeric CHECK (personal_rating IS NULL OR (personal_rating >= 0 AND personal_rating <= 10)),
  evidence_url text,
  goal_id uuid,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  legacy_source text,
  legacy_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_activity_status_valid CHECK (status IN ('planned','completed','partial','cancelled'))
);
CREATE UNIQUE INDEX IF NOT EXISTS perf_activity_legacy_idx
  ON perf_activity(user_id, legacy_source, legacy_id)
  WHERE legacy_source IS NOT NULL AND legacy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS perf_activity_user_date_idx ON perf_activity(user_id, date DESC);

CREATE TABLE IF NOT EXISTS perf_goal (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  area text NOT NULL DEFAULT 'pessoal',
  goal_type text NOT NULL DEFAULT 'quantity',
  initial_value numeric NOT NULL DEFAULT 0,
  current_value numeric NOT NULL DEFAULT 0,
  target_value numeric NOT NULL,
  unit text NOT NULL DEFAULT 'unidade',
  start_date date NOT NULL DEFAULT current_date,
  deadline date,
  priority integer NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  status text NOT NULL DEFAULT 'active',
  allow_over_target boolean NOT NULL DEFAULT false,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_goal_status_valid CHECK (status IN ('not_started','active','at_risk','completed','paused','cancelled'))
);
CREATE INDEX IF NOT EXISTS perf_goal_user_status_idx ON perf_goal(user_id, active, priority);

CREATE TABLE IF NOT EXISTS perf_portfolio_snapshot (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_value numeric(14,2) NOT NULL CHECK (total_value >= 0),
  previous_value numeric(14,2),
  variation_amount numeric(14,2),
  variation_percentage numeric(12,4),
  movement text NOT NULL DEFAULT 'stable' CHECK (movement IN ('up','down','stable')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS perf_portfolio_user_date_idx ON perf_portfolio_snapshot(user_id, date DESC);

CREATE TABLE IF NOT EXISTS perf_investment_withdrawal (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  institution text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS perf_withdrawal_user_date_idx ON perf_investment_withdrawal(user_id, date DESC);

CREATE TABLE IF NOT EXISTS perf_review (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'weekly',
  period_start date NOT NULL,
  period_end date NOT NULL,
  rating integer CHECK (rating IS NULL OR (rating BETWEEN 0 AND 10)),
  progress text,
  failures text,
  main_error text,
  risk text,
  neglected_area text,
  adjustment text,
  priority text,
  status text NOT NULL DEFAULT 'draft',
  ai_insight_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, type, period_start)
);

CREATE TABLE IF NOT EXISTS perf_ai_insight (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'on_demand',
  analysis_start date NOT NULL,
  analysis_end date NOT NULL,
  main_area text,
  diagnosis text NOT NULL,
  main_error text,
  risk text,
  recommended_action text,
  projection text,
  priority integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'new',
  feedback text,
  source_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS perf_ai_user_created_idx ON perf_ai_insight(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS perf_google_calendar_connection (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  google_account_id text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  selected_calendars jsonb NOT NULL DEFAULT '[]'::jsonb,
  sync_direction text NOT NULL DEFAULT 'google_to_life_os',
  last_sync_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE perf_profile ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Bahia';
ALTER TABLE perf_profile ADD COLUMN IF NOT EXISTS week_starts_on smallint NOT NULL DEFAULT 1;
ALTER TABLE perf_profile ADD COLUMN IF NOT EXISTS insight_time time;
ALTER TABLE perf_habit ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE perf_habit ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES perf_category(id) ON DELETE SET NULL;
ALTER TABLE perf_habit ADD COLUMN IF NOT EXISTS period text NOT NULL DEFAULT 'anytime';
ALTER TABLE perf_habit ADD COLUMN IF NOT EXISTS frequency_type text NOT NULL DEFAULT 'daily';
ALTER TABLE perf_habit ADD COLUMN IF NOT EXISTS weekdays smallint[];
ALTER TABLE perf_habit ADD COLUMN IF NOT EXISTS weekly_target numeric;
ALTER TABLE perf_habit ADD COLUMN IF NOT EXISTS monthly_target numeric;
ALTER TABLE perf_habit ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE perf_habit ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE perf_habit ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE perf_habit ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE perf_habit ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 2;
ALTER TABLE perf_habit ADD COLUMN IF NOT EXISTS reminder_time time;
ALTER TABLE perf_habit ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE perf_habit_log ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE perf_habit_log ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE perf_habit_log ADD COLUMN IF NOT EXISTS points numeric;
ALTER TABLE perf_habit_log ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill seguro: os treinos antigos continuam existindo nas tabelas antigas.
INSERT INTO perf_activity (user_id, title, date, area, type, duration_minutes, status, notes, legacy_source, legacy_id)
SELECT user_id,
       CASE tipo WHEN 'tecnico' THEN 'Treino técnico' WHEN 'fisico' THEN 'Treino físico' ELSE 'Partida' END,
       data, 'futevolei', tipo, duracao_min, 'completed', obs, 'perf_training', id
FROM perf_training t
WHERE NOT EXISTS (
  SELECT 1 FROM perf_activity a
  WHERE a.user_id = t.user_id AND a.legacy_source = 'perf_training' AND a.legacy_id = t.id
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'perf_category','perf_event','perf_activity','perf_goal','perf_portfolio_snapshot',
    'perf_investment_withdrawal','perf_review','perf_ai_insight','perf_google_calendar_connection'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_all ON %I;', t);
    EXECUTE format('CREATE POLICY owner_all ON %I FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());', t);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  perf_category, perf_event, perf_activity, perf_goal, perf_portfolio_snapshot,
  perf_investment_withdrawal, perf_review, perf_ai_insight, perf_google_calendar_connection
TO authenticated;

NOTIFY pgrst, 'reload schema';
