-- TESTE DE SANDBOX: comprova o rollback integral quando uma categoria falha.
-- O bloco externo sempre termina em ROLLBACK e nao preserva nenhuma alteracao.

BEGIN;

DO $$
DECLARE
  v_championship public.championships%ROWTYPE;
  v_original_description text;
  v_notice_count_before bigint;
  v_notice_count_after bigint;
BEGIN
  SELECT * INTO v_championship
  FROM public.championships
  WHERE id = '2b3bb52c-2043-4167-aa7f-9e4359bd6dd9'::uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campeonato de homologacao do Sandbox nao encontrado.';
  END IF;

  v_original_description := v_championship.descricao;
  SELECT count(*) INTO v_notice_count_before
  FROM public.championship_notices
  WHERE championship_id = v_championship.id;

  PERFORM set_config('request.jwt.claim.sub', v_championship.organizador_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_championship.organizador_id::text, 'role', 'authenticated')::text,
    true
  );

  BEGIN
    PERFORM public.update_championship_transaction(
      v_championship.id,
      to_jsonb(v_championship) || jsonb_build_object(
        'descricao', v_original_description || ' [NAO DEVE SER SALVO]'
      ),
      jsonb_build_array(jsonb_build_object(
        'operation', 'update',
        'id', gen_random_uuid(),
        'nome', 'Categoria inexistente',
        'genero', 'mista',
        'valor_inscricao', 0,
        'max_duplas', NULL,
        'corte_rating_min', 0,
        'corte_rating_max', 9999
      )),
      jsonb_build_object(
        'kind', 'important',
        'title', 'Aviso que nao deve ser salvo',
        'message', 'Este aviso existe apenas para validar o rollback.',
        'dedupe_key', gen_random_uuid()::text
      ),
      '[]'::jsonb,
      '[]'::jsonb
    );
    RAISE EXCEPTION 'O teste esperava CATEGORY_WRITE_FAILED, mas a chamada teve sucesso.';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'CATEGORY_WRITE_FAILED' THEN
        RAISE;
      END IF;
  END;

  IF (SELECT descricao FROM public.championships WHERE id = v_championship.id)
    IS DISTINCT FROM v_original_description
  THEN
    RAISE EXCEPTION 'FALHA: os dados do campeonato nao sofreram rollback.';
  END IF;

  SELECT count(*) INTO v_notice_count_after
  FROM public.championship_notices
  WHERE championship_id = v_championship.id;

  IF v_notice_count_after <> v_notice_count_before THEN
    RAISE EXCEPTION 'FALHA: o aviso nao sofreu rollback.';
  END IF;

  RAISE NOTICE 'OK: rollback integral confirmado; nenhum dado foi persistido.';
END;
$$;

ROLLBACK;

SELECT true AS rollback_integral_confirmado;
