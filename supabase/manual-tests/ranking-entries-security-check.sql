-- AUDITORIA SOMENTE DE LEITURA: identifica se a view de ranking pode passar a
-- usar as permissoes/RLS do chamador sem quebrar a consulta publica.

WITH source_tables(table_name) AS (
  VALUES
    ('external_results'::text),
    ('external_athletes'::text),
    ('external_tournaments'::text)
),
source_posture AS (
  SELECT
    s.table_name,
    c.oid IS NOT NULL AS existe,
    COALESCE(c.relrowsecurity, false) AS rls_ativo,
    CASE WHEN c.oid IS NULL THEN false
      ELSE has_table_privilege('anon', c.oid, 'SELECT')
    END AS anon_tem_select,
    CASE WHEN c.oid IS NULL THEN false
      ELSE has_table_privilege('authenticated', c.oid, 'SELECT')
    END AS authenticated_tem_select,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'policy', p.policyname,
        'roles', p.roles,
        'command', p.cmd,
        'using', p.qual
      ) ORDER BY p.policyname)
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = s.table_name
    ), '[]'::jsonb) AS policies
  FROM source_tables s
  LEFT JOIN pg_class c
    ON c.oid = to_regclass(format('public.%I', s.table_name))
)
SELECT
  to_regclass('public.ranking_entries') IS NOT NULL AS view_existe,
  COALESCE((
    SELECT 'security_invoker=true' = ANY(COALESCE(c.reloptions, ARRAY[]::text[]))
    FROM pg_class c
    WHERE c.oid = to_regclass('public.ranking_entries')
  ), false) AS security_invoker_ativo,
  CASE WHEN to_regclass('public.ranking_entries') IS NULL THEN false
    ELSE has_table_privilege('anon', 'public.ranking_entries', 'SELECT')
  END AS anon_consulta_view,
  CASE WHEN to_regclass('public.ranking_entries') IS NULL THEN false
    ELSE has_table_privilege('authenticated', 'public.ranking_entries', 'SELECT')
  END AS authenticated_consulta_view,
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'tabela', table_name,
      'existe', existe,
      'rls_ativo', rls_ativo,
      'anon_tem_select', anon_tem_select,
      'authenticated_tem_select', authenticated_tem_select,
      'policies', policies
    ) ORDER BY table_name)
    FROM source_posture
  ), '[]'::jsonb) AS postura_das_tabelas_origem;
