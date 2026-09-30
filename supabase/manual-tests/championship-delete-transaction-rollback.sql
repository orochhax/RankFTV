-- TESTE DE SANDBOX: cria um campeonato descartavel dentro desta transacao,
-- provoca uma falha no fim da exclusao e comprova o rollback da categoria.
-- O ROLLBACK externo garante que nenhum dado do teste seja preservado.

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.block_disposable_championship_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.nome = 'TESTE DESCARTAVEL - ROLLBACK' THEN
    RAISE EXCEPTION 'EXPECTED_DELETE_FAILURE' USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER block_disposable_championship_delete
  BEFORE DELETE ON public.championships
  FOR EACH ROW EXECUTE FUNCTION pg_temp.block_disposable_championship_delete();

DO $$
DECLARE
  v_organizer_id uuid;
  v_championship_id uuid := gen_random_uuid();
  v_category_id uuid := gen_random_uuid();
BEGIN
  SELECT organizador_id INTO v_organizer_id
  FROM public.championships
  ORDER BY created_at
  LIMIT 1;

  IF v_organizer_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum organizador disponivel para o teste descartavel.';
  END IF;

  INSERT INTO public.championships (
    id, organizador_id, nome, descricao, regulamento, data_inicio, data_fim,
    cidade, estado, local, status
  ) VALUES (
    v_championship_id, v_organizer_id, 'TESTE DESCARTAVEL - ROLLBACK', '', '',
    current_date + 30, current_date + 31, 'Salvador', 'BA', 'Sandbox', 'rascunho'
  );

  INSERT INTO public.championship_categories (
    id, championship_id, nome, genero, valor_inscricao,
    corte_rating_min, corte_rating_max
  ) VALUES (
    v_category_id, v_championship_id, 'Categoria descartavel', 'mista', 0, 0, 9999
  );

  PERFORM set_config('request.jwt.claim.sub', v_organizer_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_organizer_id::text, 'role', 'authenticated')::text,
    true
  );

  BEGIN
    PERFORM public.delete_championship_transaction(v_championship_id);
    RAISE EXCEPTION 'O teste esperava EXPECTED_DELETE_FAILURE, mas a chamada teve sucesso.';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'EXPECTED_DELETE_FAILURE' THEN
        RAISE;
      END IF;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM public.championships WHERE id = v_championship_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.championship_categories WHERE id = v_category_id
  ) THEN
    RAISE EXCEPTION 'FALHA: uma parte da exclusao nao sofreu rollback.';
  END IF;

  RAISE NOTICE 'OK: rollback integral da exclusao confirmado.';
END;
$$;

ROLLBACK;

SELECT true AS rollback_integral_confirmado;
