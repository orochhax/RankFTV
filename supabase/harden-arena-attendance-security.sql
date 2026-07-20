-- HARDENING: presença de aula — fecha o caminho de escrita direta e faz as
-- RPCs de reserva/cancelamento derivarem TUDO do banco, nunca do cliente.
-- RODAR NO SQL EDITOR DO SUPABASE, depois de todas as migrations de arena
-- já existentes (add-arena-attendance.sql, add-arena-attendance-lifecycle.sql,
-- add-arena-staff.sql, add-arena-student-cards.sql, add-arena-plan-lifecycle.sql).
-- Idempotente — seguro rodar de novo.
--
-- VULNERABILIDADE CORRIGIDA AQUI (crítica): a policy "arena_attendance_own"
-- é FOR ALL restrita só por user_id = auth.uid() — qualquer usuário
-- autenticado podia (via supabase-js direto, sem passar pelo Next.js)
-- inserir a PRÓPRIA linha em arena_attendance já com status='presente' e
-- pagamento_status='pago', sem checar vaga, crédito, gênero, cartão ou
-- preço. A função arena_confirm_attendance também recebia arena_id, vagas,
-- limite semanal, tipo de cobrança e valor do CLIENTE — nada disso era
-- confrontado com o banco. As duas coisas são corrigidas nesta migração.

-- ── 1. Nenhuma escrita direta em arena_attendance, nem pelo próprio dono ──
-- Todas as transições de estado passam pelas funções abaixo, todas
-- SECURITY DEFINER com autorização própria. REVOKE cobre INSERT desta vez
-- (a migração anterior só tinha revogado UPDATE/DELETE).
DROP POLICY IF EXISTS "arena_attendance_own" ON arena_attendance;
CREATE POLICY "arena_attendance_own_select" ON arena_attendance
  FOR SELECT USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON arena_attendance FROM authenticated, anon;
GRANT SELECT ON arena_attendance TO authenticated;

-- ── 2. Professor só lê presença das aulas em que está designado ──────────
-- A policy anterior ("arena_attendance_staff_read") dava SELECT de TODA
-- presença da arena pra qualquer staff (professor ou gerente) — errado:
-- professor só pode ver as próprias aulas; gerente segue com acesso total,
-- igual ao dono.
DROP POLICY IF EXISTS "arena_attendance_staff_read" ON arena_attendance;

CREATE POLICY "arena_attendance_gerente_read" ON arena_attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM arena_staff s
      WHERE s.arena_id = arena_attendance.arena_id
        AND s.user_id = auth.uid()
        AND s.papel = 'gerente'
        AND s.status = 'aceito'
    )
  );

CREATE POLICY "arena_attendance_professor_read" ON arena_attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM arena_classes c
      WHERE c.id = arena_attendance.class_id
        AND c.professor_id = auth.uid()
    )
  );

-- ── 3. Reserva atômica — agora recebe só o mínimo e confere tudo no banco ──
-- Assinatura antiga (9 parâmetros vindos do cliente) é substituída — o
-- DROP evita ficar com as duas versões coexistindo por engano.
DROP FUNCTION IF EXISTS arena_confirm_attendance(uuid, uuid, date, int, int, date, date, text, numeric);

CREATE OR REPLACE FUNCTION arena_confirm_attendance(
  p_class_id         uuid,
  p_data             date,
  p_avulsa_confirmada boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid            uuid := auth.uid();
  v_aula           arena_classes%ROWTYPE;
  v_vinculo        RECORD;
  v_genero         text;
  v_limite_semana  int;
  v_semana_ini     date;
  v_semana_fim     date;
  v_tem_acesso     boolean;
  v_tem_credito    boolean;
  v_tipo_cobranca  text;
  v_valor_avulso   numeric;
  v_count          int;
  v_id             uuid;
  v_dow            int;
  v_hoje           date;
  v_agora          timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_agora := now() AT TIME ZONE 'America/Sao_Paulo';
  v_hoje  := v_agora::date;

  IF p_data < v_hoje OR p_data > v_hoje + 6 THEN
    RAISE EXCEPTION 'Só é possível confirmar presença até 6 dias à frente.';
  END IF;

  -- Aula: SEMPRE lida do banco — arena_id, vagas, público, preço avulso e
  -- horário nunca vêm do cliente.
  SELECT * INTO v_aula FROM arena_classes WHERE id = p_class_id AND ativo = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aula não encontrada.';
  END IF;

  v_dow := EXTRACT(DOW FROM p_data)::int;
  IF NOT (v_dow = ANY(COALESCE(v_aula.dias_semana, '{}'))) THEN
    RAISE EXCEPTION 'Essa aula não acontece nesse dia.';
  END IF;

  IF p_data = v_hoje AND v_aula.hora_inicio IS NOT NULL
     AND v_agora::time >= v_aula.hora_inicio THEN
    RAISE EXCEPTION 'Essa aula já começou.';
  END IF;

  -- Vínculo do aluno com a ARENA DA AULA (não a arena que o cliente diria) —
  -- access_until é a fonte de verdade do acesso pago, não plan_id sozinho
  -- (plano pode ter sido arquivado/reprecificado sem tirar acesso já pago).
  SELECT id, plan_id, access_until
    INTO v_vinculo
    FROM arena_students
    WHERE arena_id = v_aula.arena_id AND user_id = v_uid AND status = 'ativo';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Você não é aluno ativo desta arena.';
  END IF;

  -- Restrição por gênero — profiles.genero é a única fonte aceita.
  IF v_aula.publico IS NOT NULL AND v_aula.publico <> 'misto' THEN
    SELECT genero INTO v_genero FROM profiles WHERE id = v_uid;
    IF v_genero IS NULL THEN
      RAISE EXCEPTION 'PERFIL_SEM_GENERO';
    END IF;
    IF v_genero <> v_aula.publico THEN
      RAISE EXCEPTION 'GENERO_INCOMPATIVEL:%', v_aula.publico;
    END IF;
  END IF;

  v_semana_ini := p_data - ((EXTRACT(ISODOW FROM p_data)::int - 1));
  v_semana_fim := v_semana_ini + 6;

  v_tem_acesso := v_vinculo.plan_id IS NOT NULL
    AND (v_vinculo.access_until IS NULL OR v_vinculo.access_until >= v_hoje);

  v_tem_credito := false;
  IF v_tem_acesso THEN
    SELECT aulas_por_semana INTO v_limite_semana FROM arena_plans WHERE id = v_vinculo.plan_id;
    IF v_limite_semana IS NULL THEN
      v_tem_credito := true; -- plano sem limite = ilimitado
    ELSE
      -- Lock por aluno/arena ANTES de contar — serializa duas reservas
      -- concorrentes do mesmo aluno pro mesmo crédito semanal.
      PERFORM pg_advisory_xact_lock(hashtextextended('arena_attendance:user:' || v_uid::text || ':' || v_aula.arena_id::text, 0));
      SELECT count(*) INTO v_count
      FROM arena_attendance
      WHERE arena_id = v_aula.arena_id AND user_id = v_uid AND status IN ('reservado', 'presente')
        AND data BETWEEN v_semana_ini AND v_semana_fim;
      v_tem_credito := v_count < v_limite_semana;
    END IF;
  END IF;

  IF v_tem_credito THEN
    v_tipo_cobranca := 'credito';
    v_valor_avulso  := NULL;
  ELSIF v_aula.valor_avulso IS NOT NULL THEN
    v_tipo_cobranca := 'avulsa';
    v_valor_avulso  := v_aula.valor_avulso;
  ELSE
    RAISE EXCEPTION 'SEM_CREDITO_SEM_AVULSA';
  END IF;

  IF v_tipo_cobranca = 'avulsa' THEN
    IF NOT EXISTS (
      SELECT 1 FROM arena_student_cards
      WHERE arena_id = v_aula.arena_id AND user_id = v_uid
    ) THEN
      RAISE EXCEPTION 'CARTAO_NECESSARIO';
    END IF;
    -- Nunca reserva avulsa sem o aluno ter visto o valor e confirmado
    -- explicitamente — reforçado aqui, não só na tela.
    IF NOT p_avulsa_confirmada THEN
      RAISE EXCEPTION 'AVULSA_PREVIEW:%', v_valor_avulso;
    END IF;
  END IF;

  -- Lock por aula/data ANTES de contar vaga — serializa alunos diferentes
  -- disputando a última posição da mesma aula/data.
  PERFORM pg_advisory_xact_lock(hashtextextended('arena_attendance:class:' || p_class_id::text || ':' || p_data::text, 0));
  IF v_aula.max_alunos IS NOT NULL THEN
    SELECT count(*) INTO v_count
    FROM arena_attendance
    WHERE class_id = p_class_id AND data = p_data AND status IN ('reservado', 'presente');
    IF v_count >= v_aula.max_alunos THEN
      RAISE EXCEPTION 'AULA_LOTADA';
    END IF;
  END IF;

  INSERT INTO arena_attendance (
    class_id, arena_id, user_id, data, status, tipo_cobranca, valor_avulso, pagamento_status
  ) VALUES (
    p_class_id, v_aula.arena_id, v_uid, p_data, 'reservado', v_tipo_cobranca, v_valor_avulso,
    CASE WHEN v_tipo_cobranca = 'avulsa' THEN 'pendente' ELSE 'nao_aplicavel' END
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'tipo_cobranca', v_tipo_cobranca, 'valor_avulso', v_valor_avulso);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Você já confirmou presença nessa aula.';
END;
$$;

GRANT EXECUTE ON FUNCTION arena_confirm_attendance(uuid, date, boolean) TO authenticated;

-- ── 4. Cancelamento — prazo também é conferido no banco, não só na tela ──
DROP FUNCTION IF EXISTS arena_cancel_attendance(uuid);

CREATE OR REPLACE FUNCTION arena_cancel_attendance(p_attendance_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_row         arena_attendance%ROWTYPE;
  v_aula        arena_classes%ROWTYPE;
  v_cancel_horas int;
  v_agora       timestamptz;
  v_prazo       timestamptz;
  v_updated     int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_row FROM arena_attendance
    WHERE id = p_attendance_id AND user_id = v_uid AND status = 'reservado';
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT * INTO v_aula FROM arena_classes WHERE id = v_row.class_id;

  SELECT cancel_horas_antes INTO v_cancel_horas FROM arenas WHERE id = v_row.arena_id;
  v_cancel_horas := COALESCE(v_cancel_horas, 2);

  v_agora := now() AT TIME ZONE 'America/Sao_Paulo';
  IF v_aula.hora_inicio IS NOT NULL THEN
    v_prazo := (v_row.data + v_aula.hora_inicio) - (v_cancel_horas || ' hours')::interval;
    IF v_agora > v_prazo THEN
      RAISE EXCEPTION 'PRAZO_EXPIRADO:%', v_cancel_horas;
    END IF;
  ELSIF v_row.data < v_agora::date THEN
    RAISE EXCEPTION 'Essa aula já passou.';
  END IF;

  UPDATE arena_attendance SET status = 'cancelada' WHERE id = p_attendance_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION arena_cancel_attendance(uuid) TO authenticated;

-- ── 5. Finalização — impede confirmar presença de aula que ainda não ─────
-- aconteceu (status "presente"/"ausente" artificial antes da hora).
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

  IF v_row.data > (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'Essa aula ainda não aconteceu.';
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

-- ── 6. Cobrança de aula avulsa: SOMENTE service_role a partir de agora ────
-- Antes, um aluno podia reivindicar (e, em tese, resolver) a própria
-- cobrança via RPC direta — mesmo que a Server Action sempre chamasse com
-- o client do próprio usuário. Isso deixava de existir uma trava de banco
-- contra alguém chamando arena_resolve_attendance_charge diretamente pra
-- marcar a própria presença avulsa como paga sem o Asaas confirmar nada.
-- Agora as duas funções só podem ser executadas pelo service_role — a
-- Server Action correspondente (app/arena/actions.ts) precisa autenticar e
-- autorizar o usuário em TypeScript ANTES de chamar, e usa o client admin.
REVOKE EXECUTE ON FUNCTION arena_claim_attendance_charge(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION arena_resolve_attendance_charge(uuid, boolean, text, text, text) FROM authenticated, anon, public;

CREATE OR REPLACE FUNCTION arena_claim_attendance_charge(p_attendance_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row     arena_attendance%ROWTYPE;
  v_updated int;
BEGIN
  UPDATE arena_attendance a
  SET pagamento_status = 'processando'
  WHERE a.id = p_attendance_id
    AND a.tipo_cobranca = 'avulsa'
    AND a.pagamento_status IN ('pendente', 'falhou');

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

CREATE OR REPLACE FUNCTION arena_resolve_attendance_charge(
  p_attendance_id    uuid,
  p_sucesso          boolean,
  p_asaas_payment_id text,
  p_asaas_customer_id text,
  p_erro             text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

GRANT EXECUTE ON FUNCTION arena_claim_attendance_charge(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION arena_resolve_attendance_charge(uuid, boolean, text, text, text) TO service_role;

-- Recarrega o cache de schema do PostgREST.
NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'harden-arena-attendance-security done';
