-- Verificacao somente de leitura da edicao atomica de campeonato.
-- Todas as colunas devem retornar true.

SELECT
  to_regprocedure(
    'public.update_championship_transaction(uuid,jsonb,jsonb,jsonb,jsonb,jsonb)'
  ) IS NOT NULL AS funcao_existe,
  NOT has_function_privilege(
    'anon',
    'public.update_championship_transaction(uuid,jsonb,jsonb,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ) AS anon_sem_execute,
  has_function_privilege(
    'authenticated',
    'public.update_championship_transaction(uuid,jsonb,jsonb,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ) AS authenticated_com_execute,
  has_function_privilege(
    'service_role',
    'public.update_championship_transaction(uuid,jsonb,jsonb,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ) AS service_role_com_execute,
  COALESCE(
    pg_get_functiondef(
      to_regprocedure(
        'public.update_championship_transaction(uuid,jsonb,jsonb,jsonb,jsonb,jsonb)'
      )
    ) ILIKE '%FOR UPDATE%'
    AND pg_get_functiondef(
      to_regprocedure(
        'public.update_championship_transaction(uuid,jsonb,jsonb,jsonb,jsonb,jsonb)'
      )
    ) ILIKE '%championship.updated_transactionally%'
    AND pg_get_functiondef(
      to_regprocedure(
        'public.update_championship_transaction(uuid,jsonb,jsonb,jsonb,jsonb,jsonb)'
      )
    ) ILIKE '%championship_notice_deliveries%',
    false
  ) AS transacao_completa;
