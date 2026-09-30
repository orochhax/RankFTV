\set ON_ERROR_STOP on
\pset pager off

BEGIN READ ONLY;

SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

SELECT
  now() AS observed_at,
  current_database() AS database_name,
  current_setting('server_version') AS server_version,
  current_setting('statement_timeout') AS statement_timeout,
  current_setting('lock_timeout') AS lock_timeout,
  current_setting('idle_in_transaction_session_timeout') AS idle_in_transaction_timeout;

SELECT
  count(*) FILTER (WHERE pid <> pg_backend_pid()) AS connections,
  count(*) FILTER (WHERE pid <> pg_backend_pid() AND state = 'active') AS active_connections,
  count(*) FILTER (
    WHERE pid <> pg_backend_pid()
      AND state = 'active'
      AND wait_event_type IS NOT NULL
  ) AS waiting_connections,
  count(*) FILTER (
    WHERE pid <> pg_backend_pid()
      AND xact_start IS NOT NULL
      AND now() - xact_start > interval '1 minute'
  ) AS transactions_over_one_minute,
  coalesce(max(extract(epoch FROM now() - xact_start)) FILTER (
    WHERE pid <> pg_backend_pid() AND xact_start IS NOT NULL
  ), 0)::numeric(12,3) AS longest_transaction_seconds
FROM pg_stat_activity
WHERE datname = current_database();

SELECT
  count(*) FILTER (WHERE NOT granted) AS waiting_locks,
  count(DISTINCT pid) FILTER (WHERE NOT granted) AS blocked_sessions
FROM pg_locks;

SELECT
  numbackends,
  xact_commit,
  xact_rollback,
  deadlocks,
  conflicts,
  temp_files,
  temp_bytes,
  blk_read_time,
  blk_write_time,
  stats_reset
FROM pg_stat_database
WHERE datname = current_database();

SELECT (to_regclass('public.pg_stat_statements') IS NOT NULL
  OR to_regclass('extensions.pg_stat_statements') IS NOT NULL
  OR to_regclass('pg_stat_statements') IS NOT NULL) AS has_pg_stat_statements \gset

\if :has_pg_stat_statements
  SELECT
    queryid,
    calls,
    rows,
    round(total_exec_time::numeric, 3) AS total_exec_ms,
    round(mean_exec_time::numeric, 3) AS mean_exec_ms,
    round(max_exec_time::numeric, 3) AS max_exec_ms
  FROM pg_stat_statements
  WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
    AND calls > 0
  ORDER BY max_exec_time DESC
  LIMIT 20;
\else
  SELECT 'pg_stat_statements indisponivel; nenhuma consulta foi impressa' AS note;
\endif

COMMIT;
