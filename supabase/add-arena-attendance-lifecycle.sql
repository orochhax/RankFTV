-- Ciclo de vida da presença: reserva de crédito, confirmação do professor,
-- cobrança de aula avulsa e repasse.
-- RODAR NO SQL EDITOR DO SUPABASE (depois de add-arena-staff.sql).
--
-- Hoje uma linha em arena_attendance = "presença confirmada", ponto final —
-- não existe estado "reservado só aguardando o professor", nem "ausente",
-- nem cobrança de aula avulsa. Esta migração adiciona esse ciclo de vida sem
-- quebrar o que já existe: toda linha antiga é tratada como presença já
-- finalizada e sem cobrança (é exatamente o que ela sempre significou).

-- ── 1. Novas colunas ──────────────────────────────────────────────────────
ALTER TABLE arena_attendance
  ADD COLUMN IF NOT EXISTS status            text NOT NULL DEFAULT 'reservado',
  ADD COLUMN IF NOT EXISTS tipo_cobranca      text NOT NULL DEFAULT 'credito',
  ADD COLUMN IF NOT EXISTS valor_avulso       numeric(10,2),
  ADD COLUMN IF NOT EXISTS pagamento_status   text NOT NULL DEFAULT 'nao_aplicavel',
  ADD COLUMN IF NOT EXISTS pagamento_erro     text,
  ADD COLUMN IF NOT EXISTS asaas_payment_id   text,
  ADD COLUMN IF NOT EXISTS asaas_customer_id  text,
  ADD COLUMN IF NOT EXISTS charged_at         timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_at       timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS repasse_status     text NOT NULL DEFAULT 'nao_aplicavel',
  ADD COLUMN IF NOT EXISTS repasse_data_prevista timestamptz,
  ADD COLUMN IF NOT EXISTS repasse_transfer_id text,
  ADD COLUMN IF NOT EXISTS repasse_erro       text;

-- Backfill: linhas que já existiam representam presença já ocorrida, sem
-- cobrança avulsa (o modelo antigo só existia pra alunos com plano/crédito).
UPDATE arena_attendance
SET status = 'presente', finalized_at = created_at
WHERE finalized_at IS NULL AND status = 'reservado' AND data < CURRENT_DATE;

ALTER TABLE arena_attendance
  DROP CONSTRAINT IF EXISTS arena_attendance_status_check;
ALTER TABLE arena_attendance
  ADD CONSTRAINT arena_attendance_status_check
  CHECK (status IN ('reservado', 'presente', 'ausente', 'cancelada'));

ALTER TABLE arena_attendance
  DROP CONSTRAINT IF EXISTS arena_attendance_tipo_cobranca_check;
ALTER TABLE arena_attendance
  ADD CONSTRAINT arena_attendance_tipo_cobranca_check
  CHECK (tipo_cobranca IN ('credito', 'avulsa'));

ALTER TABLE arena_attendance
  DROP CONSTRAINT IF EXISTS arena_attendance_pagamento_status_check;
ALTER TABLE arena_attendance
  ADD CONSTRAINT arena_attendance_pagamento_status_check
  CHECK (pagamento_status IN ('nao_aplicavel', 'pendente', 'processando', 'pago', 'falhou', 'estornado'));

ALTER TABLE arena_attendance
  DROP CONSTRAINT IF EXISTS arena_attendance_repasse_status_check;
ALTER TABLE arena_attendance
  ADD CONSTRAINT arena_attendance_repasse_status_check
  CHECK (repasse_status IN ('nao_aplicavel', 'pendente', 'processando', 'aguardando_liquidacao', 'concluido', 'estornado'));

CREATE INDEX IF NOT EXISTS arena_attendance_status        ON arena_attendance (arena_id, status);
CREATE INDEX IF NOT EXISTS arena_attendance_pagamento     ON arena_attendance (arena_id, pagamento_status) WHERE tipo_cobranca = 'avulsa';
CREATE INDEX IF NOT EXISTS arena_attendance_finalized     ON arena_attendance (class_id, data) WHERE finalized_at IS NULL;
CREATE INDEX IF NOT EXISTS arena_attendance_user_status   ON arena_attendance (user_id, status, data);
CREATE UNIQUE INDEX IF NOT EXISTS arena_attendance_asaas_payment ON arena_attendance (asaas_payment_id) WHERE asaas_payment_id IS NOT NULL;

-- ── 2. Trava as transições de estado atrás de funções auditadas ──────────
-- Ninguém (nem o próprio aluno) faz UPDATE direto em arena_attendance a
-- partir daqui — só INSERT (reserva, via RLS normal) e as funções abaixo,
-- que reautorizam e são a única forma de: cancelar, finalizar presença,
-- reivindicar e resolver uma cobrança. Isso fecha o caminho de um cliente
-- malicioso tentar marcar a própria presença como "presente"/"pago"
-- diretamente, sem passar pelo professor ou pelo Asaas.
REVOKE UPDATE ON arena_attendance FROM authenticated;
REVOKE DELETE ON arena_attendance FROM authenticated;

-- ── 3. Reserva atômica de presença ────────────────────────────────────────
-- Todas as validações de regra de negócio (aluno ativo, aula do dia certo,
-- horário ainda não passou, gênero da aula x gênero do perfil) continuam em
-- TypeScript, já testadas — aqui só o trecho realmente sujeito a corrida:
-- checar vaga/crédito e inserir, atomicamente, usando advisory lock
-- transacional (liberado sozinho no fim da função) pra serializar tentativas
-- concorrentes na MESMA aula/data (vagas) e no MESMO aluno/arena (crédito
-- semanal). Duas abas ou duplo-clique nunca conseguem reservar 2 vagas da
-- última posição nem consumir 2 créditos da mesma semana.
CREATE OR REPLACE FUNCTION arena_confirm_attendance(
  p_class_id      uuid,
  p_arena_id      uuid,
  p_data          date,
  p_max_alunos    int,
  p_limite_semana int,
  p_semana_ini    date,
  p_semana_fim    date,
  p_tipo_cobranca text,
  p_valor_avulso  numeric
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_count int;
  v_id    uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_tipo_cobranca NOT IN ('credito', 'avulsa') THEN
    RAISE EXCEPTION 'invalid tipo_cobranca';
  END IF;

  -- Lock 1: vagas da aula nessa data (protege contra corrida entre alunos diferentes).
  PERFORM pg_advisory_xact_lock(hashtextextended('arena_attendance:class:' || p_class_id::text || ':' || p_data::text, 0));

  IF p_max_alunos IS NOT NULL THEN
    SELECT count(*) INTO v_count
    FROM arena_attendance
    WHERE class_id = p_class_id AND data = p_data AND status IN ('reservado', 'presente');
    IF v_count >= p_max_alunos THEN
      RAISE EXCEPTION 'aula lotada' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Lock 2: crédito semanal do próprio aluno (protege contra o mesmo aluno
  -- reservando 2 aulas ao mesmo tempo em abas/dispositivos diferentes).
  PERFORM pg_advisory_xact_lock(hashtextextended('arena_attendance:user:' || v_uid::text || ':' || p_arena_id::text, 0));

  IF p_tipo_cobranca = 'credito' AND p_limite_semana IS NOT NULL THEN
    SELECT count(*) INTO v_count
    FROM arena_attendance
    WHERE arena_id = p_arena_id AND user_id = v_uid AND status IN ('reservado', 'presente')
      AND data BETWEEN p_semana_ini AND p_semana_fim;
    IF v_count >= p_limite_semana THEN
      RAISE EXCEPTION 'limite semanal atingido' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  INSERT INTO arena_attendance (
    class_id, arena_id, user_id, data, status, tipo_cobranca, valor_avulso, pagamento_status
  ) VALUES (
    p_class_id, p_arena_id, v_uid, p_data, 'reservado', p_tipo_cobranca, p_valor_avulso,
    CASE WHEN p_tipo_cobranca = 'avulsa' THEN 'pendente' ELSE 'nao_aplicavel' END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION arena_confirm_attendance(uuid, uuid, date, int, int, date, date, text, numeric) TO authenticated;

-- ── 4. Cancelamento pelo próprio aluno ────────────────────────────────────
-- A checagem de antecedência (cancel_horas_antes) continua em TypeScript; a
-- função só faz a transição de estado, atômica e restrita à própria reserva.
CREATE OR REPLACE FUNCTION arena_cancel_attendance(p_attendance_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_updated int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE arena_attendance
  SET status = 'cancelada'
  WHERE id = p_attendance_id AND user_id = v_uid AND status = 'reservado';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION arena_cancel_attendance(uuid) TO authenticated;

-- ── 5. Finalização pelo professor/gerente/dono ────────────────────────────
-- Idempotente: só a PRIMEIRA chamada com sucesso (finalized_at ainda NULL)
-- muda o estado; cliques repetidos, F5 ou requisições concorrentes batem
-- nessa mesma trava e recebem de volta o estado já gravado, sem repetir
-- nenhum efeito (nem re-liberar/re-consumir crédito, nem reabrir cobrança).
CREATE OR REPLACE FUNCTION arena_finalize_attendance(p_attendance_id uuid, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_row        arena_attendance%ROWTYPE;
  v_autorizado boolean := false;
  v_updated    int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_status NOT IN ('presente', 'ausente') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  SELECT * INTO v_row FROM arena_attendance WHERE id = p_attendance_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'attendance not found';
  END IF;

  IF EXISTS (SELECT 1 FROM arenas ar WHERE ar.id = v_row.arena_id AND ar.dono_id = v_uid) THEN
    v_autorizado := true;
  END IF;
  IF EXISTS (SELECT 1 FROM arena_classes c WHERE c.id = v_row.class_id AND c.professor_id = v_uid) THEN
    v_autorizado := true;
  END IF;
  IF EXISTS (
    SELECT 1 FROM arena_staff s
    WHERE s.arena_id = v_row.arena_id AND s.user_id = v_uid AND s.papel = 'gerente' AND s.status = 'aceito'
  ) THEN
    v_autorizado := true;
  END IF;
  IF NOT v_autorizado THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE arena_attendance
  SET status = p_status, finalized_at = now(), finalized_by = v_uid
  WHERE id = p_attendance_id AND finalized_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  SELECT * INTO v_row FROM arena_attendance WHERE id = p_attendance_id;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'tipo_cobranca', v_row.tipo_cobranca,
    'pagamento_status', v_row.pagamento_status,
    'valor_avulso', v_row.valor_avulso,
    'arena_id', v_row.arena_id,
    'user_id', v_row.user_id,
    'ja_estava_finalizada', v_updated = 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION arena_finalize_attendance(uuid, text) TO authenticated;

-- ── 6. Cobrança de aula avulsa: reivindicar → chamar o Asaas → resolver ───
-- O Asaas só pode ser chamado do servidor (fetch em lib/asaas.ts), então a
-- cobrança em si nunca pode virar uma função SQL. O que precisa ser atômico
-- é a RESERVA da tentativa: "reivindicar" muda pendente/falhou → processando
-- numa única instrução condicional — só quem reivindicar de fato tenta a
-- chamada ao Asaas. Duas tentativas concorrentes (clique duplo, retry
-- automático, requisição repetida) nunca chamam o Asaas duas vezes pra a
-- mesma presença.
CREATE OR REPLACE FUNCTION arena_claim_attendance_charge(p_attendance_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_row     arena_attendance%ROWTYPE;
  v_updated int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE arena_attendance a
  SET pagamento_status = 'processando'
  WHERE a.id = p_attendance_id
    AND a.tipo_cobranca = 'avulsa'
    AND a.pagamento_status IN ('pendente', 'falhou')
    AND (
      a.user_id = v_uid
      OR EXISTS (SELECT 1 FROM arenas ar WHERE ar.id = a.arena_id AND ar.dono_id = v_uid)
      OR EXISTS (SELECT 1 FROM arena_classes c WHERE c.id = a.class_id AND c.professor_id = v_uid)
      OR EXISTS (
        SELECT 1 FROM arena_staff s
        WHERE s.arena_id = a.arena_id AND s.user_id = v_uid AND s.papel = 'gerente' AND s.status = 'aceito'
      )
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  SELECT * INTO v_row FROM arena_attendance WHERE id = p_attendance_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'attendance not found';
  END IF;

  RETURN jsonb_build_object(
    'claimed', v_updated > 0,
    'id', v_row.id,
    'user_id', v_row.user_id,
    'arena_id', v_row.arena_id,
    'valor_avulso', v_row.valor_avulso,
    'pagamento_status', v_row.pagamento_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION arena_claim_attendance_charge(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION arena_resolve_attendance_charge(
  p_attendance_id   uuid,
  p_sucesso         boolean,
  p_asaas_payment_id text,
  p_asaas_customer_id text,
  p_erro            text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE arena_attendance
  SET pagamento_status  = CASE WHEN p_sucesso THEN 'pago' ELSE 'falhou' END,
      asaas_payment_id  = COALESCE(p_asaas_payment_id, asaas_payment_id),
      asaas_customer_id = COALESCE(p_asaas_customer_id, asaas_customer_id),
      pagamento_erro    = p_erro,
      charged_at        = CASE WHEN p_sucesso THEN now() ELSE charged_at END,
      repasse_status    = CASE WHEN p_sucesso THEN 'pendente' ELSE repasse_status END
  WHERE id = p_attendance_id AND pagamento_status = 'processando';
END;
$$;

GRANT EXECUTE ON FUNCTION arena_resolve_attendance_charge(uuid, boolean, text, text, text) TO authenticated;

-- Recarrega o cache de schema do PostgREST.
NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'add-arena-attendance-lifecycle done';
