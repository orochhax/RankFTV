-- Verificacao estrutural e somente de leitura da carteira do organizador.
-- Todas as colunas devem retornar true depois da migration.
SELECT
  to_regclass('public.organizer_receivables') IS NOT NULL AS recebiveis_existem,
  to_regclass('public.organizer_withdrawals') IS NOT NULL AS saques_existem,
  to_regclass('public.organizer_withdrawal_allocations') IS NOT NULL AS reservas_existem,
  to_regclass('public.organizer_anticipations') IS NOT NULL AS antecipacoes_existem,
  to_regprocedure('public.organizer_wallet_snapshot(uuid)') IS NOT NULL AS snapshot_existe,
  to_regprocedure('public.reserve_organizer_withdrawal(uuid,numeric,uuid)') IS NOT NULL AS reserva_atomica_existe,
  to_regprocedure('public.reserve_organizer_anticipation(uuid)') IS NOT NULL AS reserva_antecipacao_existe,
  COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.organizer_receivables')),false) AS rls_recebiveis,
  COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.organizer_withdrawals')),false) AS rls_saques,
  NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema='public'
      AND table_name IN ('organizer_receivables','organizer_withdrawals','organizer_withdrawal_allocations','organizer_anticipations')
      AND grantee IN ('anon','authenticated')
      AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')
  ) AS navegador_sem_escrita_financeira,
  EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public'
      AND indexname='organizer_anticipations_active_receivable_uidx'
  ) AS antecipacao_unica_ativa;
