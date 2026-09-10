-- AUDITORIA SOMENTE DE LEITURA: controles estruturais de seguranca do banco.
-- Execute primeiro no Sandbox. As listas JSON devem estar vazias; qualquer
-- item retornado exige revisao antes de repetir a verificacao em producao.

WITH
tables_without_rls AS (
  SELECT DISTINCT c.relname AS object_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN information_schema.role_table_grants g
    ON g.table_schema = n.nspname AND g.table_name = c.relname
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND g.grantee IN ('anon', 'authenticated')
    AND NOT c.relrowsecurity
),
unsafe_definers AS (
  SELECT p.oid::regprocedure::text AS object_name
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS setting
      WHERE setting LIKE 'search_path=%'
    )
),
views_without_security_invoker AS (
  SELECT DISTINCT c.relname AS object_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN information_schema.role_table_grants g
    ON g.table_schema = n.nspname AND g.table_name = c.relname
  WHERE n.nspname = 'public'
    AND c.relkind = 'v'
    AND g.grantee IN ('anon', 'authenticated')
    AND g.privilege_type = 'SELECT'
    AND NOT ('security_invoker=true' = ANY(COALESCE(c.reloptions, ARRAY[]::text[])))
),
unexpected_public_definers AS (
  SELECT DISTINCT p.oid::regprocedure::text AS object_name
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND has_function_privilege('anon', p.oid, 'EXECUTE')
    -- RPC publica de leitura, com retorno limitado e parametros validados.
    AND p.oid <> to_regprocedure(
      'public.list_public_arena_cards(text,text,uuid[],integer,integer)'
    )
),
anon_writes AS (
  SELECT DISTINCT format('%I.%I:%s', table_schema, table_name, privilege_type) AS object_name
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND grantee = 'anon'
    AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER')
),
credential_anon AS (
  SELECT CASE
    WHEN to_regclass('public.credentials') IS NULL THEN false
    ELSE has_table_privilege('anon', 'public.credentials', 'SELECT')
  END AS has_access
)
SELECT
  NOT EXISTS (SELECT 1 FROM tables_without_rls) AS tabelas_expostas_com_rls,
  NOT EXISTS (SELECT 1 FROM unsafe_definers) AS definers_com_search_path,
  NOT EXISTS (SELECT 1 FROM views_without_security_invoker) AS views_com_security_invoker,
  NOT EXISTS (SELECT 1 FROM unexpected_public_definers) AS nenhum_definer_indevido_por_anon,
  NOT EXISTS (SELECT 1 FROM anon_writes) AS anon_sem_escrita,
  NOT (SELECT has_access FROM credential_anon) AS anon_sem_select_em_credentials,
  NOT has_schema_privilege('anon', 'public', 'CREATE') AS anon_sem_create_no_schema,
  COALESCE((SELECT jsonb_agg(object_name ORDER BY object_name) FROM tables_without_rls), '[]'::jsonb) AS revisar_sem_rls,
  COALESCE((SELECT jsonb_agg(object_name ORDER BY object_name) FROM unsafe_definers), '[]'::jsonb) AS revisar_definers_sem_search_path,
  COALESCE((SELECT jsonb_agg(object_name ORDER BY object_name) FROM views_without_security_invoker), '[]'::jsonb) AS revisar_views_sem_security_invoker,
  COALESCE((SELECT jsonb_agg(object_name ORDER BY object_name) FROM unexpected_public_definers), '[]'::jsonb) AS revisar_definers_executaveis,
  COALESCE((SELECT jsonb_agg(object_name ORDER BY object_name) FROM anon_writes), '[]'::jsonb) AS revisar_escrita_anon;
