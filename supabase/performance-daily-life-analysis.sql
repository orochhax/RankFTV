-- Life OS: leitura diaria gerada as 05:00 (America/Bahia).
-- A analise usa perf_ai_insight.source_data para preservar o retrato completo.
-- Migracao aditiva e idempotente.

ALTER TABLE perf_profile
  ALTER COLUMN insight_time SET DEFAULT '05:00:00';

UPDATE perf_profile
SET insight_time = '05:00:00'
WHERE insight_time IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS perf_ai_daily_life_review_idx
  ON perf_ai_insight(user_id, analysis_end)
  WHERE type = 'daily_life_review';

NOTIFY pgrst, 'reload schema';
