-- Hardening complementar identificado na auditoria dos 20 pontos de seguranca.
-- Idempotente. Homologue primeiro no Sandbox e valide com o check somente leitura.

BEGIN;

-- O cliente nunca precisa criar objetos, truncar tabelas ou instalar triggers.
-- TRUNCATE ignora RLS; por isso esse grant e especialmente perigoso.
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE TRUNCATE, TRIGGER ON ALL TABLES IN SCHEMA public
  FROM PUBLIC, anon, authenticated;

-- Uma credencial pertence a uma conta autenticada, organizador ou staff.
-- A policy existente ja impedia linhas para anon, mas o grant era desnecessario.
REVOKE SELECT ON TABLE public.credentials FROM anon;
GRANT SELECT ON TABLE public.credentials TO authenticated;
GRANT ALL ON TABLE public.credentials TO service_role;

-- Funcoes de reserva exigem login. Os GRANTs antigos para authenticated nao
-- retiravam o EXECUTE concedido por padrao a PUBLIC ao criar uma funcao.
DO $$
DECLARE
  v_signature regprocedure;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    to_regprocedure('public.arena_cancel_attendance(uuid)'),
    to_regprocedure('public.arena_confirm_attendance(uuid,date,boolean)'),
    to_regprocedure('public.arena_finalize_attendance(uuid,text)')
  ]
  LOOP
    IF v_signature IS NOT NULL THEN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon',
        v_signature
      );
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role',
        v_signature
      );
    END IF;
  END LOOP;
END;
$$;

-- Funcoes usadas exclusivamente por triggers nao devem aparecer como RPCs
-- executaveis por clientes. Revogar EXECUTE nao impede triggers ja instalados.
DO $$
DECLARE
  v_signature regprocedure;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    to_regprocedure('public.handle_new_user()'),
    to_regprocedure('public.prevent_role_change()'),
    to_regprocedure('public.protect_championship_financial_fields()'),
    to_regprocedure('public.protect_championship_staff_permissions()'),
    to_regprocedure('public.protect_credential_identity()'),
    to_regprocedure('public.protect_payout_account_fields()'),
    to_regprocedure('public.protect_profile_system_fields()'),
    to_regprocedure('public.rls_auto_enable()')
  ]
  LOOP
    IF v_signature IS NOT NULL THEN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
        v_signature
      );
    END IF;
  END LOOP;

  -- O trigger de criacao do perfil veio do schema remoto sem search_path fixo.
  -- public e seguro aqui porque CREATE foi revogado acima; pg_temp fica por ultimo.
  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp';
  END IF;
END;
$$;

COMMIT;
NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-security-20-point-hardening done';
