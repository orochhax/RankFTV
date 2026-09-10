-- VERIFICACAO SOMENTE DE LEITURA. Todas as colunas devem retornar true.

WITH expected_constraints(name) AS (
  VALUES
    ('profiles_username_format_check'::text),
    ('profiles_name_length_check'),
    ('profiles_gender_value_check')
), function_posture AS (
  SELECT
    p.oid,
    p.prosecdef,
    'search_path=public, pg_temp' = ANY(COALESCE(p.proconfig, ARRAY[]::text[])) AS safe_path,
    pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.handle_new_user()')
)
SELECT
  (SELECT count(*) = 3
   FROM pg_constraint c
   JOIN expected_constraints e ON e.name = c.conname
   WHERE c.conrelid = 'public.profiles'::regclass
     AND c.convalidated) AS tres_constraints_validas,
  EXISTS (
    SELECT 1 FROM function_posture
    WHERE prosecdef AND safe_path
  ) AS trigger_definer_com_path_fixo,
  EXISTS (
    SELECT 1 FROM function_posture
    WHERE definition LIKE '%INVALID_SIGNUP_USERNAME%'
      AND definition LIKE '%INVALID_SIGNUP_NAME%'
      AND definition LIKE '%INVALID_SIGNUP_GENDER%'
  ) AS trigger_valida_metadados,
  NOT has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
    AS anon_sem_execute,
  NOT has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE')
    AS authenticated_sem_execute,
  has_function_privilege('service_role', 'public.handle_new_user()', 'EXECUTE')
    AS service_role_com_execute,
  NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username !~ '^[a-z0-9_.]{3,30}$'
      OR btrim(nome) = ''
      OR char_length(nome) > 160
      OR (genero IS NOT NULL AND genero NOT IN ('masculino', 'feminino', 'outro'))
  ) AS perfis_existentes_validos;
