-- Verificacao somente de leitura. Todas as colunas devem retornar true.

SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'championship_notice_deliveries'
      AND column_name = 'claimed_at'
  ) AS claimed_at_existe,
  to_regprocedure('public.claim_championship_notice_deliveries(uuid,integer)') IS NOT NULL
    AS funcao_claim_existe,
  NOT has_function_privilege('anon', 'public.claim_championship_notice_deliveries(uuid,integer)', 'EXECUTE')
    AS anon_sem_execute,
  NOT has_function_privilege('authenticated', 'public.claim_championship_notice_deliveries(uuid,integer)', 'EXECUTE')
    AS authenticated_sem_execute,
  has_function_privilege('service_role', 'public.claim_championship_notice_deliveries(uuid,integer)', 'EXECUTE')
    AS service_role_com_execute;
