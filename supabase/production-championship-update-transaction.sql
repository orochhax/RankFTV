-- Edicao atomica do campeonato, categorias e aviso operacional.
-- Se qualquer etapa falhar, o PostgreSQL reverte toda a chamada.

BEGIN;

CREATE OR REPLACE FUNCTION public.update_championship_transaction(
  p_championship_id uuid,
  p_championship jsonb,
  p_category_operations jsonb DEFAULT '[]'::jsonb,
  p_notice jsonb DEFAULT NULL,
  p_deliveries jsonb DEFAULT '[]'::jsonb,
  p_notification_user_ids jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_operation jsonb;
  v_delivery jsonb;
  v_user_id_text text;
  v_notice_id uuid;
  v_affected integer;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_championship) IS DISTINCT FROM 'object'
    OR jsonb_typeof(COALESCE(p_category_operations, '[]'::jsonb)) IS DISTINCT FROM 'array'
    OR jsonb_typeof(COALESCE(p_deliveries, '[]'::jsonb)) IS DISTINCT FROM 'array'
    OR jsonb_typeof(COALESCE(p_notification_user_ids, '[]'::jsonb)) IS DISTINCT FROM 'array'
  THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(COALESCE(p_category_operations, '[]'::jsonb)) > 100
    OR jsonb_array_length(COALESCE(p_deliveries, '[]'::jsonb)) > 5000
    OR jsonb_array_length(COALESCE(p_notification_user_ids, '[]'::jsonb)) > 2000
  THEN
    RAISE EXCEPTION 'PAYLOAD_LIMIT_EXCEEDED' USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.championships AS championship
  WHERE championship.id = p_championship_id
    AND championship.organizador_id = v_actor_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  UPDATE public.championships
  SET
    nome = btrim(p_championship->>'nome'),
    descricao = COALESCE(btrim(p_championship->>'descricao'), ''),
    regulamento = COALESCE(btrim(p_championship->>'regulamento'), ''),
    regulamento_pdf_url = NULLIF(p_championship->>'regulamento_pdf_url', ''),
    data_inicio = (p_championship->>'data_inicio')::date,
    data_fim = (p_championship->>'data_fim')::date,
    inscricoes_inicio = NULLIF(p_championship->>'inscricoes_inicio', '')::date,
    inscricoes_fim = NULLIF(p_championship->>'inscricoes_fim', '')::date,
    prevenda_inicio = NULLIF(p_championship->>'prevenda_inicio', '')::date,
    prevenda_fim = NULLIF(p_championship->>'prevenda_fim', '')::date,
    cidade = btrim(p_championship->>'cidade'),
    estado = upper(left(btrim(p_championship->>'estado'), 2)),
    local = COALESCE(btrim(p_championship->>'local'), ''),
    live_url = NULLIF(btrim(p_championship->>'live_url'), ''),
    status = p_championship->>'status',
    usa_motor_categoria = COALESCE((p_championship->>'usa_motor_categoria')::boolean, false)
  WHERE id = p_championship_id;

  FOR v_operation IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_category_operations, '[]'::jsonb))
    WHERE value->>'operation' = 'delete'
  LOOP
    DELETE FROM public.championship_categories
    WHERE id = (v_operation->>'id')::uuid
      AND championship_id = p_championship_id;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
    IF v_affected <> 1 THEN
      RAISE EXCEPTION 'CATEGORY_WRITE_FAILED' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  FOR v_operation IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_category_operations, '[]'::jsonb))
    WHERE value->>'operation' = 'update'
  LOOP
    UPDATE public.championship_categories
    SET
      nome = btrim(v_operation->>'nome'),
      genero = v_operation->>'genero',
      valor_inscricao = (v_operation->>'valor_inscricao')::integer,
      max_duplas = NULLIF(v_operation->>'max_duplas', '')::integer,
      corte_rating_min = (v_operation->>'corte_rating_min')::integer,
      corte_rating_max = (v_operation->>'corte_rating_max')::integer
    WHERE id = (v_operation->>'id')::uuid
      AND championship_id = p_championship_id;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
    IF v_affected <> 1 THEN
      RAISE EXCEPTION 'CATEGORY_WRITE_FAILED' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  FOR v_operation IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_category_operations, '[]'::jsonb))
    WHERE value->>'operation' = 'insert'
  LOOP
    INSERT INTO public.championship_categories (
      championship_id, nome, genero, valor_inscricao, max_duplas,
      corte_rating_min, corte_rating_max
    ) VALUES (
      p_championship_id,
      btrim(v_operation->>'nome'),
      v_operation->>'genero',
      (v_operation->>'valor_inscricao')::integer,
      NULLIF(v_operation->>'max_duplas', '')::integer,
      (v_operation->>'corte_rating_min')::integer,
      (v_operation->>'corte_rating_max')::integer
    );
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM public.championship_categories
    WHERE championship_id = p_championship_id
  ) THEN
    RAISE EXCEPTION 'AT_LEAST_ONE_CATEGORY_REQUIRED' USING ERRCODE = '23514';
  END IF;

  IF p_notice IS NOT NULL THEN
    IF jsonb_typeof(p_notice) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'INVALID_NOTICE' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.championship_notices (
      championship_id, kind, title, message, created_by, dedupe_key
    ) VALUES (
      p_championship_id,
      p_notice->>'kind',
      p_notice->>'title',
      p_notice->>'message',
      v_actor_id,
      p_notice->>'dedupe_key'
    )
    ON CONFLICT (championship_id, dedupe_key)
    DO UPDATE SET dedupe_key = EXCLUDED.dedupe_key
    RETURNING id INTO v_notice_id;

    FOR v_delivery IN
      SELECT value FROM jsonb_array_elements(COALESCE(p_deliveries, '[]'::jsonb))
    LOOP
      IF v_delivery->>'recipient_source' = 'authenticated' THEN
        IF v_delivery->>'recipient_slot' <> 'user' OR NOT EXISTS (
          SELECT 1
          FROM public.registrations AS registration
          JOIN public.teams AS team ON team.id = registration.team_id
          WHERE registration.championship_id = p_championship_id
            AND registration.status_pagamento = 'pago'
            AND (team.atleta1_id = (v_delivery->>'recipient_ref')::uuid
              OR team.atleta2_id = (v_delivery->>'recipient_ref')::uuid)
        ) THEN
          RAISE EXCEPTION 'INVALID_DELIVERY_RECIPIENT' USING ERRCODE = '42501';
        END IF;
      ELSIF v_delivery->>'recipient_source' = 'athlete_ticket' THEN
        IF v_delivery->>'recipient_slot' NOT IN ('buyer', 'partner') OR NOT EXISTS (
          SELECT 1
          FROM public.athlete_tickets AS ticket
          WHERE ticket.id = (v_delivery->>'recipient_ref')::uuid
            AND ticket.championship_id = p_championship_id
            AND ticket.status_pagamento = 'pago'
            AND ((v_delivery->>'recipient_slot' = 'buyer' AND ticket.comprador_email IS NOT NULL)
              OR (v_delivery->>'recipient_slot' = 'partner' AND ticket.parceiro_email IS NOT NULL))
        ) THEN
          RAISE EXCEPTION 'INVALID_DELIVERY_RECIPIENT' USING ERRCODE = '42501';
        END IF;
      ELSE
        RAISE EXCEPTION 'INVALID_DELIVERY_SOURCE' USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.championship_notice_deliveries (
        notice_id, championship_id, recipient_source, recipient_ref,
        recipient_slot, recipient_hash
      ) VALUES (
        v_notice_id,
        p_championship_id,
        v_delivery->>'recipient_source',
        (v_delivery->>'recipient_ref')::uuid,
        v_delivery->>'recipient_slot',
        v_delivery->>'recipient_hash'
      ) ON CONFLICT (notice_id, recipient_hash) DO NOTHING;
    END LOOP;

    FOR v_user_id_text IN
      SELECT value #>> '{}'
      FROM jsonb_array_elements(COALESCE(p_notification_user_ids, '[]'::jsonb))
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM public.registrations AS registration
        JOIN public.teams AS team ON team.id = registration.team_id
        WHERE registration.championship_id = p_championship_id
          AND registration.status_pagamento = 'pago'
          AND (team.atleta1_id = v_user_id_text::uuid OR team.atleta2_id = v_user_id_text::uuid)
      ) THEN
        RAISE EXCEPTION 'INVALID_NOTIFICATION_RECIPIENT' USING ERRCODE = '42501';
      END IF;

      INSERT INTO public.notifications (
        user_id, championship_id, tipo, titulo, mensagem, source_notice_id
      ) VALUES (
        v_user_id_text::uuid,
        p_championship_id,
        'championship_change',
        p_notice->>'title',
        p_notice->>'message',
        v_notice_id
      ) ON CONFLICT (user_id, source_notice_id)
        WHERE source_notice_id IS NOT NULL DO NOTHING;
    END LOOP;
  ELSIF jsonb_array_length(COALESCE(p_deliveries, '[]'::jsonb)) > 0
    OR jsonb_array_length(COALESCE(p_notification_user_ids, '[]'::jsonb)) > 0
  THEN
    RAISE EXCEPTION 'NOTICE_REQUIRED' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.security_audit_log (
    actor_id, acao, alvo_tabela, alvo_id, detalhes
  ) VALUES (
    v_actor_id,
    'championship.updated_transactionally',
    'championships',
    p_championship_id,
    jsonb_build_object(
      'noticeId', v_notice_id,
      'categoryOperationCount', jsonb_array_length(COALESCE(p_category_operations, '[]'::jsonb)),
      'deliveryCount', jsonb_array_length(COALESCE(p_deliveries, '[]'::jsonb))
    )
  );

  RETURN v_notice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_championship_transaction(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_championship_transaction(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb
) TO authenticated, service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-championship-update-transaction done';
