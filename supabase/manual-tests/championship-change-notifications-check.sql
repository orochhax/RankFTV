-- Verificacao consolidada e somente de leitura.
-- O resultado deve mostrar todas as nove colunas como true.

SELECT
  to_regclass('public.championship_notices') IS NOT NULL AS championship_notices_existe,
  to_regclass('public.notifications') IS NOT NULL AS notifications_existe,
  to_regclass('public.championship_notice_deliveries') IS NOT NULL AS fila_entregas_existe,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'championship_notices'
      AND column_name = 'dedupe_key'
  ) AS dedupe_key_existe,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'source_notice_id'
  ) AS source_notice_id_existe,
  (
    SELECT count(*) = 3
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'championship_notices_dedupe_uidx',
        'notifications_championship_notice_uidx',
        'championship_notice_deliveries_retry_idx'
      )
  ) AS tres_indices_existem,
  NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'championship_notice_deliveries'
      AND grantee IN ('anon', 'authenticated')
  ) AS clientes_sem_acesso,
  EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'championship_notice_deliveries'
      AND grantee = 'service_role'
      AND privilege_type = 'SELECT'
  ) AS service_role_tem_acesso,
  COALESCE((
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid = to_regclass('public.championship_notice_deliveries')
  ), false) AS rls_ativo;
