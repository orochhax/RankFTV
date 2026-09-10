-- Corrige os avisos acionaveis de Function Search Path Mutable do Advisor.
-- Idempotente. Aplicar primeiro no Sandbox e validar com o check correspondente.

BEGIN;

DO $$
DECLARE
  v_signature regprocedure;
BEGIN
  -- Funcao interna chamada pelo pg_cron/backend. Nao deve ser RPC de cliente.
  v_signature := to_regprocedure('public.auto_update_championship_status()');
  IF v_signature IS NOT NULL THEN
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', v_signature);
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      v_signature
    );
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_signature);
  END IF;

  -- RPCs do orcamento pessoal rodam como invoker, usam auth.uid() e RLS e
  -- continuam disponiveis somente para usuarios autenticados e service_role.
  FOREACH v_signature IN ARRAY ARRAY[
    to_regprocedure('public.mb_remove_monthly_category(uuid)'),
    to_regprocedure('public.mb_toggle_expense_paid(uuid,boolean,jsonb)'),
    to_regprocedure('public.mb_write_expense_event(uuid[],jsonb,jsonb,jsonb)'),
    to_regprocedure('public.mb_write_income_event(uuid[],jsonb,jsonb,jsonb)')
  ]
  LOOP
    IF v_signature IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', v_signature);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', v_signature);
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role',
        v_signature
      );
    END IF;
  END LOOP;
END;
$$;

COMMIT;
NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-security-advisor-function-hardening done';
