-- Carlos Life OS: Academia, Estudos e Investimentos.
-- Migration aditiva e idempotente. Execute depois de performance-life-os.sql.

CREATE TABLE IF NOT EXISTS perf_study_roadmap (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT current_date,
  target_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_study_roadmap_status_valid CHECK (status IN ('active','completed','archived'))
);
CREATE UNIQUE INDEX IF NOT EXISTS perf_study_active_roadmap_idx ON perf_study_roadmap(user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS perf_study_roadmap_item (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roadmap_id uuid NOT NULL REFERENCES perf_study_roadmap(id) ON DELETE CASCADE,
  section text,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_study_item_status_valid CHECK (status IN ('pending','in_progress','completed'))
);
CREATE INDEX IF NOT EXISTS perf_study_item_roadmap_order_idx ON perf_study_roadmap_item(roadmap_id, order_index);

ALTER TABLE perf_study_roadmap_item ADD COLUMN IF NOT EXISTS scheduled_date date;
ALTER TABLE perf_study_roadmap_item ADD COLUMN IF NOT EXISTS item_kind text NOT NULL DEFAULT 'general';
ALTER TABLE perf_study_roadmap_item DROP CONSTRAINT IF EXISTS perf_study_item_kind_valid;
ALTER TABLE perf_study_roadmap_item ADD CONSTRAINT perf_study_item_kind_valid CHECK (item_kind IN ('core','reinforcement','challenge','check','criterion','general'));
CREATE INDEX IF NOT EXISTS perf_study_item_scheduled_idx ON perf_study_roadmap_item(user_id, scheduled_date, order_index);

ALTER TABLE perf_activity ADD COLUMN IF NOT EXISTS study_item_id uuid REFERENCES perf_study_roadmap_item(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS perf_activity_study_item_idx ON perf_activity(study_item_id);

CREATE TABLE IF NOT EXISTS perf_investment_contribution (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  institution text,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  source_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_investment_source_valid CHECK (source IN ('manual','personal_finance'))
);
CREATE UNIQUE INDEX IF NOT EXISTS perf_investment_source_entry_idx ON perf_investment_contribution(user_id, source_entry_id) WHERE source_entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS perf_investment_contribution_date_idx ON perf_investment_contribution(user_id, date DESC);

-- Preserva os investimentos já cadastrados no controle financeiro sem duplicá-los.
INSERT INTO perf_investment_contribution (user_id, date, amount, institution, notes, source, source_entry_id)
SELECT user_id, entry_date, amount, bank, name, 'personal_finance', id
FROM personal_finance_entries
WHERE type = 'investimento'
  AND NOT EXISTS (
    SELECT 1 FROM perf_investment_contribution c
    WHERE c.user_id = personal_finance_entries.user_id
      AND c.source_entry_id = personal_finance_entries.id
  );

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['perf_study_roadmap','perf_study_roadmap_item','perf_investment_contribution'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name);
    EXECUTE format('DROP POLICY IF EXISTS owner_all ON %I;', table_name);
    EXECUTE format('CREATE POLICY owner_all ON %I FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());', table_name);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  perf_study_roadmap, perf_study_roadmap_item, perf_investment_contribution
TO authenticated;

NOTIFY pgrst, 'reload schema';
