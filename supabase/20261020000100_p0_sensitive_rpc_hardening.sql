-- P0: regras de preço Elite, gravação de Pix e autorização de dados privados.
-- Aplicar primeiro no Sandbox e validar antes de promover para Production.
BEGIN;

CREATE OR REPLACE FUNCTION public.ativar_championship_elite(p_champ_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_status text;
  v_is_elite boolean;
  v_price constant numeric := 178;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  IF v_price <= 0 THEN RAISE EXCEPTION 'Preço Elite inválido.'; END IF;

  SELECT organizador_id, status, is_elite INTO v_owner, v_status, v_is_elite
  FROM public.championships WHERE id = p_champ_id FOR UPDATE;
  IF NOT FOUND OR v_owner IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
  IF v_is_elite THEN RETURN jsonb_build_object('ok', true); END IF;
  IF v_status NOT IN ('rascunho', 'inscricoes_abertas') THEN
    RAISE EXCEPTION 'Só é possível ativar o Elite enquanto as inscrições estão abertas.';
  END IF;

  UPDATE public.championships
  SET is_elite = true, premium_fee_pendente = v_price
  WHERE id = p_champ_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_championship_elite(p_champ_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_is_elite boolean;
  v_fee numeric;
  v_price constant numeric := 178;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  IF v_price <= 0 THEN RAISE EXCEPTION 'Preço Elite inválido.'; END IF;

  SELECT organizador_id, is_elite, premium_fee_pendente INTO v_owner, v_is_elite, v_fee
  FROM public.championships WHERE id = p_champ_id FOR UPDATE;
  IF NOT FOUND OR v_owner IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
  IF NOT v_is_elite THEN RETURN jsonb_build_object('ok', true); END IF;
  IF COALESCE(v_fee, 0) < v_price THEN
    RAISE EXCEPTION 'O Plano Elite já começou a ser cobrado e não pode mais ser cancelado.';
  END IF;

  UPDATE public.championships SET is_elite = false, premium_fee_pendente = 0 WHERE id = p_champ_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Remove todos os grants e overloads antigos que aceitavam preço do cliente.
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('ativar_championship_elite', 'cancelar_championship_elite')
  LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature); END LOOP;
END $$;
DROP FUNCTION IF EXISTS public.ativar_championship_elite(uuid, numeric);
DROP FUNCTION IF EXISTS public.cancelar_championship_elite(uuid, numeric);
REVOKE ALL ON FUNCTION public.ativar_championship_elite(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancelar_championship_elite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ativar_championship_elite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_championship_elite(uuid) TO authenticated;

-- As Server Actions gravam Pix com service_role após reautenticação,
-- consulta de titularidade e auditoria; JWT de usuário não executa estas RPCs.
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('atualizar_chave_pix_organizador', 'atualizar_chave_pix_arena')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
  END LOOP;
END $$;

-- IDs enviados pelo caller são apenas filtro. A autorização nasce dos
-- pagamentos ligados ao campeonato pertencente ao organizador autenticado.
CREATE OR REPLACE FUNCTION public.organizer_profile_contacts(
  p_championship_id uuid, p_user_ids uuid[]
)
RETURNS TABLE(id uuid, nome text, username text, telefone text, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.championships c
    WHERE c.id = p_championship_id AND c.organizador_id = auth.uid()
  ) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF COALESCE(cardinality(p_user_ids), 0) > 1000 THEN RAISE EXCEPTION 'TOO_MANY_CONTACTS'; END IF;

  RETURN QUERY
  WITH linked_users AS (
    SELECT DISTINCT unnest(ARRAY[t.atleta1_id, t.atleta2_id]) AS user_id
    FROM public.registrations r
    JOIN public.teams t ON t.id = r.team_id
    WHERE r.championship_id = p_championship_id AND r.status_pagamento = 'pago'
    UNION
    SELECT DISTINCT unnest(ARRAY[a.user_id, a.parceiro_user_id]) AS user_id
    FROM public.athlete_tickets a
    WHERE a.championship_id = p_championship_id AND a.status_pagamento = 'pago'
  )
  SELECT p.id, p.nome, p.username, pp.telefone, u.email::text
  FROM linked_users l
  JOIN public.profiles p ON p.id = l.user_id
  LEFT JOIN public.profiles_private pp ON pp.user_id = p.id
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE l.user_id = ANY(COALESCE(p_user_ids, '{}'::uuid[]));
END;
$$;
REVOKE ALL ON FUNCTION public.organizer_profile_contacts(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.organizer_profile_contacts(uuid, uuid[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
