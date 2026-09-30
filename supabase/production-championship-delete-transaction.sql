-- Exclusao atomica e protegida de campeonato.
-- Campeonatos com qualquer checkout iniciado preservam o historico e devem
-- seguir os fluxos proprios de cancelamento e reembolso.

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_championship_transaction(
  p_championship_id uuid
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_championship_name text;
  v_championship_status text;
  v_affected integer;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  SELECT championship.nome, championship.status
  INTO v_championship_name, v_championship_status
  FROM public.championships AS championship
  WHERE championship.id = p_championship_id
    AND championship.organizador_id = v_actor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  -- Mesmo uma cobranca pendente pode ser confirmada posteriormente pelo
  -- provedor. Por isso, qualquer checkout iniciado bloqueia a exclusao fisica.
  IF EXISTS (
    SELECT 1 FROM public.registrations
    WHERE championship_id = p_championship_id
  ) OR EXISTS (
    SELECT 1 FROM public.athlete_tickets
    WHERE championship_id = p_championship_id
  ) OR EXISTS (
    SELECT 1 FROM public.spectator_tickets
    WHERE championship_id = p_championship_id
  ) THEN
    RAISE EXCEPTION 'CHAMPIONSHIP_HAS_PURCHASE_HISTORY'
      USING ERRCODE = '23503',
            CONSTRAINT = 'championships_purchase_history';
  END IF;

  -- Ordem deterministica: remove primeiro as referencias que o guard de
  -- categorias considera historico operacional. As demais dependencias usam
  -- ON DELETE CASCADE/SET NULL e sao resolvidas ao apagar o campeonato.
  DELETE FROM public.bracket_matches
  WHERE championship_id = p_championship_id;

  DELETE FROM public.bracket_participants
  WHERE championship_id = p_championship_id;

  DELETE FROM public.teams
  WHERE championship_id = p_championship_id;

  -- A lista de espera foi entregue em migration separada e pode ainda nao
  -- existir em ambientes antigos. O delete continua atomico nos dois estados;
  -- quando a tabela existir, suas linhas sao removidas na mesma transacao.
  IF to_regclass('public.championship_category_waitlist') IS NOT NULL THEN
    EXECUTE
      'DELETE FROM public.championship_category_waitlist WHERE championship_id = $1'
      USING p_championship_id;
  END IF;

  DELETE FROM public.championship_categories
  WHERE championship_id = p_championship_id;

  DELETE FROM public.championships
  WHERE id = p_championship_id
    AND organizador_id = v_actor_id;
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> 1 THEN
    RAISE EXCEPTION 'CHAMPIONSHIP_DELETE_FAILED' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.security_audit_log (
    actor_id, acao, alvo_tabela, alvo_id, detalhes
  ) VALUES (
    v_actor_id,
    'championship.deleted_transactionally',
    'championships',
    p_championship_id,
    jsonb_build_object(
      'name', v_championship_name,
      'status', v_championship_status
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_championship_transaction(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_championship_transaction(uuid)
  TO authenticated, service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-championship-delete-transaction done';
