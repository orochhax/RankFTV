-- =============================================================
-- RANKFTV — Controle de produção de camisas por campeonato
-- Execute no Supabase SQL Editor.
-- =============================================================

CREATE TABLE IF NOT EXISTS shirt_production (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  championship_id uuid NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  athlete_id      uuid NOT NULL,
  produced        boolean NOT NULL DEFAULT false,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (championship_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_shirt_prod_champ ON shirt_production(championship_id);

ALTER TABLE shirt_production ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shirt_prod_organizer ON shirt_production;
CREATE POLICY shirt_prod_organizer ON shirt_production
  USING (
    EXISTS (
      SELECT 1 FROM championships c
      WHERE c.id = championship_id AND c.organizador_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM championships c
      WHERE c.id = championship_id AND c.organizador_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON shirt_production TO authenticated;
