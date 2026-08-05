-- Carlos Life OS dashboard: tarefas recorrentes e registros diarios.
-- Migracao aditiva e idempotente. Execute no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS perf_task (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_date date NOT NULL,
  recurrence_type text NOT NULL DEFAULT 'none',
  recurrence_end_date date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_task_recurrence_valid CHECK (recurrence_type IN ('none', 'daily')),
  CONSTRAINT perf_task_dates_valid CHECK (
    recurrence_type = 'none' OR (recurrence_end_date IS NOT NULL AND recurrence_end_date >= start_date)
  )
);

CREATE INDEX IF NOT EXISTS perf_task_user_dates_idx ON perf_task(user_id, start_date, recurrence_end_date);
CREATE INDEX IF NOT EXISTS perf_task_user_active_idx ON perf_task(user_id, active);

CREATE TABLE IF NOT EXISTS perf_task_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES perf_task(id) ON DELETE CASCADE,
  occurrence_date date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS perf_task_log_user_date_idx ON perf_task_log(user_id, occurrence_date);
CREATE INDEX IF NOT EXISTS perf_task_log_task_date_idx ON perf_task_log(task_id, occurrence_date);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['perf_task', 'perf_task_log'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name);
    EXECUTE format('DROP POLICY IF EXISTS owner_all ON %I;', table_name);
    EXECUTE format('CREATE POLICY owner_all ON %I FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());', table_name);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE perf_task, perf_task_log TO authenticated;
NOTIFY pgrst, 'reload schema';
