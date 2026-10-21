-- Auditoria somente leitura da Central de Evolução.
-- Esperado: todos os booleanos verdadeiros e listas de revisão vazias.

WITH expected(name) AS (
  VALUES
    ('evo_settings'), ('evo_study_sessions'), ('evo_roadmap_progress'),
    ('evo_training_logs'), ('evo_weight_logs'), ('evo_follower_snapshots'),
    ('evo_equipment'), ('evo_weekly_videos'), ('evo_project_progress'),
    ('evo_source_snapshots'), ('evo_ai_reviews')
), observed AS (
  SELECT c.relname AS name, c.relrowsecurity, c.relforcerowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'evo\_%' ESCAPE '\'
)
SELECT
  (SELECT count(*) FROM expected) = 11 AS expected_table_count_is_11,
  (SELECT count(*) FROM observed) = 11 AS observed_table_count_is_11,
  NOT EXISTS (
    SELECT 1 FROM expected e LEFT JOIN observed o USING (name)
    WHERE o.name IS NULL OR NOT o.relrowsecurity OR NOT o.relforcerowsecurity
  ) AS every_table_has_rls_and_force_rls;

SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name LIKE 'evo\_%' ESCAPE '\'
  AND grantee IN ('anon', 'PUBLIC')
ORDER BY table_name, grantee, privilege_type;

WITH expected(name) AS (
  VALUES
    ('evo_settings'), ('evo_study_sessions'), ('evo_roadmap_progress'),
    ('evo_training_logs'), ('evo_weight_logs'), ('evo_follower_snapshots'),
    ('evo_equipment'), ('evo_weekly_videos'), ('evo_project_progress'),
    ('evo_source_snapshots'), ('evo_ai_reviews')
)
SELECT e.name
FROM expected e
LEFT JOIN pg_policies p
  ON p.schemaname = 'public'
 AND p.tablename = e.name
 AND p.roles = ARRAY['authenticated']::name[]
 AND p.cmd = 'ALL'
 AND p.qual LIKE '%auth.uid()%'
 AND p.with_check LIKE '%auth.uid()%'
WHERE p.policyname IS NULL;

SELECT routine_schema, routine_name, grantee, privilege_type
FROM information_schema.role_routine_grants
WHERE routine_schema = 'public'
  AND routine_name = 'evo_touch_updated_at'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated');

SELECT
  to_regclass('public.evo_study_sessions_user_date_idx') IS NOT NULL AS study_index_exists,
  to_regclass('public.evo_weight_logs_user_date_idx') IS NOT NULL AS weight_index_exists,
  to_regclass('public.evo_follower_snapshots_user_date_idx') IS NOT NULL AS follower_index_exists,
  to_regclass('public.evo_weekly_videos_idea_idx') IS NOT NULL AS video_fk_index_exists,
  to_regclass('public.evo_ai_reviews_user_week_idx') IS NOT NULL AS review_index_exists;
