-- Verificacao somente de leitura. Todas as colunas devem retornar true.

SELECT
  to_regprocedure('public.delete_championship_transaction(uuid)') IS NOT NULL
    AS funcao_existe,
  NOT has_function_privilege(
    'anon',
    'public.delete_championship_transaction(uuid)',
    'EXECUTE'
  ) AS anon_sem_execute,
  has_function_privilege(
    'authenticated',
    'public.delete_championship_transaction(uuid)',
    'EXECUTE'
  ) AS authenticated_com_execute,
  has_function_privilege(
    'service_role',
    'public.delete_championship_transaction(uuid)',
    'EXECUTE'
  ) AS service_role_com_execute,
  COALESCE(
    pg_get_functiondef(
      to_regprocedure('public.delete_championship_transaction(uuid)')
    ) ILIKE '%FOR UPDATE%'
    AND pg_get_functiondef(
      to_regprocedure('public.delete_championship_transaction(uuid)')
    ) ILIKE '%CHAMPIONSHIP_HAS_PURCHASE_HISTORY%'
    AND pg_get_functiondef(
      to_regprocedure('public.delete_championship_transaction(uuid)')
    ) ILIKE '%championship.deleted_transactionally%'
    AND pg_get_functiondef(
      to_regprocedure('public.delete_championship_transaction(uuid)')
    ) ILIKE '%to_regclass(''public.championship_category_waitlist'')%',
    false
  ) AS transacao_protegida;
