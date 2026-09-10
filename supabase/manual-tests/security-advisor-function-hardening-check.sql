-- VERIFICACAO SOMENTE DE LEITURA.
-- Todas as seis colunas devem retornar true e a lista deve retornar [].

WITH expected_functions(signature, client_kind) AS (
  VALUES
    ('public.auto_update_championship_status()'::text, 'internal'::text),
    ('public.mb_remove_monthly_category(uuid)', 'authenticated'),
    ('public.mb_toggle_expense_paid(uuid,boolean,jsonb)', 'authenticated'),
    ('public.mb_write_expense_event(uuid[],jsonb,jsonb,jsonb)', 'authenticated'),
    ('public.mb_write_income_event(uuid[],jsonb,jsonb,jsonb)', 'authenticated')
), posture AS (
  SELECT
    e.signature,
    e.client_kind,
    to_regprocedure(e.signature) AS function_oid,
    COALESCE((
      SELECT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS setting
        WHERE setting = 'search_path=public, pg_temp'
      )
      FROM pg_proc p
      WHERE p.oid = to_regprocedure(e.signature)
    ), false) AS safe_search_path
  FROM expected_functions e
)
SELECT
  bool_and(function_oid IS NOT NULL) AS cinco_funcoes_existem,
  bool_and(safe_search_path) AS cinco_search_paths_fixos,
  bool_and(NOT has_function_privilege('anon', function_oid, 'EXECUTE'))
    AS anon_sem_execute,
  bool_and(
    CASE client_kind
      WHEN 'internal' THEN NOT has_function_privilege(
        'authenticated', function_oid, 'EXECUTE'
      )
      ELSE has_function_privilege('authenticated', function_oid, 'EXECUTE')
    END
  ) AS authenticated_com_acesso_correto,
  bool_and(has_function_privilege('service_role', function_oid, 'EXECUTE'))
    AS service_role_com_execute,
  bool_and(
    CASE client_kind
      WHEN 'internal' THEN NOT has_function_privilege('anon', function_oid, 'EXECUTE')
        AND NOT has_function_privilege('authenticated', function_oid, 'EXECUTE')
      ELSE true
    END
  ) AS funcao_interna_fora_da_api_cliente,
  COALESCE(
    jsonb_agg(signature ORDER BY signature)
      FILTER (WHERE function_oid IS NULL OR NOT safe_search_path),
    '[]'::jsonb
  ) AS revisar_funcoes
FROM posture;
