-- Metadados para roadmaps deterministas de carreiras de TI.
-- Migration aditiva/idempotente. Execute depois de:
--   performance-roadmap-ai.sql
--   performance-roadmap-drafts.sql
--   performance-study-modules.sql
--   performance-scheduling-study-progress.sql
--
-- Os templates continuam versionados no codigo. O banco guarda somente o
-- snapshot entregue ao usuario, sua configuracao e identificadores estaveis.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Classificacao explicita. Valores antigos sem evidencia permanecem como
-- legacy_unknown; nunca inferimos o tipo pelo titulo ou pela descricao.
ALTER TABLE perf_study_roadmap
  ADD COLUMN IF NOT EXISTS roadmap_kind text;
ALTER TABLE perf_study_roadmap
  ADD COLUMN IF NOT EXISTS template_key text;
ALTER TABLE perf_study_roadmap
  ADD COLUMN IF NOT EXISTS template_version integer;
ALTER TABLE perf_study_roadmap
  ADD COLUMN IF NOT EXISTS target_level text;
ALTER TABLE perf_study_roadmap
  ADD COLUMN IF NOT EXISTS setup jsonb;
ALTER TABLE perf_study_roadmap
  ADD COLUMN IF NOT EXISTS recommended_target_date date;

ALTER TABLE perf_study_roadmap
  ALTER COLUMN roadmap_kind SET DEFAULT 'legacy_unknown';
UPDATE perf_study_roadmap
SET roadmap_kind = 'legacy_unknown'
WHERE roadmap_kind IS NULL;
ALTER TABLE perf_study_roadmap
  ALTER COLUMN roadmap_kind SET NOT NULL;

ALTER TABLE perf_study_roadmap
  ALTER COLUMN setup SET DEFAULT '{}'::jsonb;
UPDATE perf_study_roadmap
SET setup = '{}'::jsonb
WHERE setup IS NULL;
ALTER TABLE perf_study_roadmap
  ALTER COLUMN setup SET NOT NULL;

-- Backfill deliberadamente conservador: somente o campo roadmapType salvo em
-- generation.answers pode classificar um registro legado. Manual, importado e
-- qualquer registro sem essa evidencia continuam como legacy_unknown.
UPDATE perf_study_roadmap AS roadmap
SET roadmap_kind = CASE generation.answers ->> 'roadmapType'
  WHEN 'language' THEN 'language'
  WHEN 'skill' THEN 'legacy_skill'
  ELSE roadmap.roadmap_kind
END
FROM perf_study_roadmap_generation AS generation
WHERE roadmap.generation_id = generation.id
  AND roadmap.user_id = generation.user_id
  AND roadmap.roadmap_kind = 'legacy_unknown'
  AND jsonb_typeof(generation.answers) = 'object'
  AND generation.answers ->> 'roadmapType' IN ('language', 'skill');

ALTER TABLE perf_study_roadmap
  DROP CONSTRAINT IF EXISTS perf_study_roadmap_kind_valid;
ALTER TABLE perf_study_roadmap
  ADD CONSTRAINT perf_study_roadmap_kind_valid CHECK (
    roadmap_kind IN ('language', 'it_career', 'legacy_skill', 'legacy_unknown')
  );

ALTER TABLE perf_study_roadmap
  DROP CONSTRAINT IF EXISTS perf_study_roadmap_source_valid;
ALTER TABLE perf_study_roadmap
  ADD CONSTRAINT perf_study_roadmap_source_valid CHECK (
    source IN ('manual', 'import', 'ai', 'template')
  );

ALTER TABLE perf_study_roadmap
  DROP CONSTRAINT IF EXISTS perf_study_roadmap_template_version_valid;
ALTER TABLE perf_study_roadmap
  ADD CONSTRAINT perf_study_roadmap_template_version_valid CHECK (
    template_version IS NULL OR template_version > 0
  );

ALTER TABLE perf_study_roadmap
  DROP CONSTRAINT IF EXISTS perf_study_roadmap_target_level_valid;
ALTER TABLE perf_study_roadmap
  ADD CONSTRAINT perf_study_roadmap_target_level_valid CHECK (
    target_level IS NULL OR target_level IN (
      'foundation', 'junior', 'mid', 'senior', 'specialist'
    )
  );

ALTER TABLE perf_study_roadmap
  DROP CONSTRAINT IF EXISTS perf_study_roadmap_setup_valid;
ALTER TABLE perf_study_roadmap
  ADD CONSTRAINT perf_study_roadmap_setup_valid CHECK (
    jsonb_typeof(setup) = 'object'
  );

ALTER TABLE perf_study_roadmap
  DROP CONSTRAINT IF EXISTS perf_study_roadmap_recommended_date_valid;
ALTER TABLE perf_study_roadmap
  ADD CONSTRAINT perf_study_roadmap_recommended_date_valid CHECK (
    recommended_target_date IS NULL OR recommended_target_date >= start_date
  );

ALTER TABLE perf_study_roadmap
  DROP CONSTRAINT IF EXISTS perf_study_it_template_metadata_valid;
ALTER TABLE perf_study_roadmap
  ADD CONSTRAINT perf_study_it_template_metadata_valid CHECK (
    roadmap_kind <> 'it_career' OR (
      source = 'template'
      AND template_key IS NOT NULL
      AND length(btrim(template_key)) > 0
      AND template_version IS NOT NULL
      AND target_level IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS perf_study_roadmap_kind_idx
  ON perf_study_roadmap(user_id, roadmap_kind, created_at DESC);
CREATE INDEX IF NOT EXISTS perf_study_roadmap_template_idx
  ON perf_study_roadmap(template_key, template_version)
  WHERE roadmap_kind = 'it_career';

-- Metadados dos modulos copiados do template.
ALTER TABLE perf_study_roadmap_module
  ADD COLUMN IF NOT EXISTS module_kind text;
ALTER TABLE perf_study_roadmap_module
  ADD COLUMN IF NOT EXISTS module_code text;
ALTER TABLE perf_study_roadmap_module
  ADD COLUMN IF NOT EXISTS level_code text;
ALTER TABLE perf_study_roadmap_module
  ADD COLUMN IF NOT EXISTS template_node_id text;

ALTER TABLE perf_study_roadmap_module
  DROP CONSTRAINT IF EXISTS perf_study_module_kind_valid;
ALTER TABLE perf_study_roadmap_module
  ADD CONSTRAINT perf_study_module_kind_valid CHECK (
    module_kind IS NULL OR module_kind IN ('core', 'specialization', 'capstone')
  );

ALTER TABLE perf_study_roadmap_module
  DROP CONSTRAINT IF EXISTS perf_study_module_level_code_valid;
ALTER TABLE perf_study_roadmap_module
  ADD CONSTRAINT perf_study_module_level_code_valid CHECK (
    level_code IS NULL OR level_code IN (
      'foundation', 'junior', 'mid', 'senior', 'specialist'
    )
  );

ALTER TABLE perf_study_roadmap_module
  DROP CONSTRAINT IF EXISTS perf_study_module_template_node_valid;
ALTER TABLE perf_study_roadmap_module
  ADD CONSTRAINT perf_study_module_template_node_valid CHECK (
    template_node_id IS NULL OR length(btrim(template_node_id)) > 0
  );

CREATE UNIQUE INDEX IF NOT EXISTS perf_study_module_template_node_unique_idx
  ON perf_study_roadmap_module(roadmap_id, template_node_id)
  WHERE template_node_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS perf_study_module_level_idx
  ON perf_study_roadmap_module(roadmap_id, level_code, order_index);

-- Cada unidade acompanhavel continua sendo um roadmap_item. Assim os checks e
-- as barras atuais permanecem validos sem uma nova tabela de progresso.
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS content_role text;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS parent_item_id uuid;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS item_code text;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS level_code text;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS counts_for_progress boolean;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS template_node_id text;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS subtopics jsonb;
ALTER TABLE perf_study_roadmap_item
  ADD COLUMN IF NOT EXISTS project_spec jsonb;

ALTER TABLE perf_study_roadmap_item
  ALTER COLUMN counts_for_progress SET DEFAULT true;
UPDATE perf_study_roadmap_item
SET counts_for_progress = true
WHERE counts_for_progress IS NULL;
ALTER TABLE perf_study_roadmap_item
  ALTER COLUMN counts_for_progress SET NOT NULL;

ALTER TABLE perf_study_roadmap_item
  ALTER COLUMN subtopics SET DEFAULT '[]'::jsonb;
UPDATE perf_study_roadmap_item
SET subtopics = '[]'::jsonb
WHERE subtopics IS NULL;
ALTER TABLE perf_study_roadmap_item
  ALTER COLUMN subtopics SET NOT NULL;

-- Snapshot estruturado dos desafios e do TCC. O objeto vazio preserva os
-- roadmaps v3 ja materializados; toda criacao v4 persiste a especificacao
-- completa e versionada entregue pelo catalogo.
ALTER TABLE perf_study_roadmap_item
  ALTER COLUMN project_spec SET DEFAULT '{}'::jsonb;
UPDATE perf_study_roadmap_item
SET project_spec = '{}'::jsonb
WHERE project_spec IS NULL;
ALTER TABLE perf_study_roadmap_item
  ALTER COLUMN project_spec SET NOT NULL;

ALTER TABLE perf_study_roadmap_item
  DROP CONSTRAINT IF EXISTS perf_study_item_content_role_valid;
ALTER TABLE perf_study_roadmap_item
  ADD CONSTRAINT perf_study_item_content_role_valid CHECK (
    content_role IS NULL OR content_role IN (
      'topic', 'subtopic', 'activity', 'module_project',
      'assessment', 'capstone', 'review'
    )
  );

ALTER TABLE perf_study_roadmap_item
  DROP CONSTRAINT IF EXISTS perf_study_item_level_code_valid;
ALTER TABLE perf_study_roadmap_item
  ADD CONSTRAINT perf_study_item_level_code_valid CHECK (
    level_code IS NULL OR level_code IN (
      'foundation', 'junior', 'mid', 'senior', 'specialist'
    )
  );

ALTER TABLE perf_study_roadmap_item
  DROP CONSTRAINT IF EXISTS perf_study_item_subtopics_valid;
ALTER TABLE perf_study_roadmap_item
  ADD CONSTRAINT perf_study_item_subtopics_valid CHECK (
    jsonb_typeof(subtopics) = 'array'
  );

ALTER TABLE perf_study_roadmap_item
  DROP CONSTRAINT IF EXISTS perf_study_item_project_spec_valid;
ALTER TABLE perf_study_roadmap_item
  ADD CONSTRAINT perf_study_item_project_spec_valid CHECK (
    (
      jsonb_typeof(project_spec) = 'object'
      AND (
        project_spec = '{}'::jsonb
        OR (
          (
            (content_role = 'module_project' AND project_spec->>'projectKind' = 'module_challenge')
            OR (content_role = 'capstone' AND project_spec->>'projectKind' = 'capstone')
          )
          AND project_spec->>'schemaVersion' = '1'
          AND length(btrim(coalesce(project_spec->>'blueprintId', ''))) > 0
          AND length(btrim(coalesce(project_spec->>'projectTitle', ''))) > 0
          AND length(btrim(coalesce(project_spec->>'productDefinition', ''))) > 0
          AND length(btrim(coalesce(project_spec->>'problemStatement', ''))) > 0
          AND length(btrim(coalesce(project_spec->>'targetAudience', ''))) > 0
          AND length(btrim(coalesce(project_spec->>'implementationFreedom', ''))) > 0
          AND jsonb_typeof(project_spec->'interest') = 'object'
          AND jsonb_typeof(project_spec->'data') = 'object'
          AND jsonb_typeof(project_spec->'functionalities') = 'array'
          AND jsonb_typeof(project_spec->'technicalConcepts') = 'array'
          AND jsonb_typeof(project_spec->'mandatoryRequirements') = 'array'
          AND jsonb_typeof(project_spec->'deliverables') = 'array'
          AND jsonb_typeof(project_spec->'evaluationCriteria') = 'array'
          AND jsonb_typeof(project_spec->'submissionInstructions') = 'array'
          AND jsonb_typeof(project_spec->'outOfScope') = 'array'
        )
      )
    ) IS TRUE
  );

ALTER TABLE perf_study_roadmap_item
  DROP CONSTRAINT IF EXISTS perf_study_item_parent_not_self;
ALTER TABLE perf_study_roadmap_item
  ADD CONSTRAINT perf_study_item_parent_not_self CHECK (
    parent_item_id IS NULL OR parent_item_id <> id
  );

ALTER TABLE perf_study_roadmap_item
  DROP CONSTRAINT IF EXISTS perf_study_item_template_node_valid;
ALTER TABLE perf_study_roadmap_item
  ADD CONSTRAINT perf_study_item_template_node_valid CHECK (
    template_node_id IS NULL OR length(btrim(template_node_id)) > 0
  );

-- A chave composta impede que um item do usuario aponte para pai de outro
-- usuario ou de outro roadmap, mesmo em chamadas diretas autenticadas.
CREATE UNIQUE INDEX IF NOT EXISTS perf_study_item_parent_identity_idx
  ON perf_study_roadmap_item(id, user_id, roadmap_id);
ALTER TABLE perf_study_roadmap_item
  DROP CONSTRAINT IF EXISTS perf_study_item_parent_fk;
ALTER TABLE perf_study_roadmap_item
  ADD CONSTRAINT perf_study_item_parent_fk
  FOREIGN KEY (parent_item_id, user_id, roadmap_id)
  REFERENCES perf_study_roadmap_item(id, user_id, roadmap_id)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS perf_study_item_parent_idx
  ON perf_study_roadmap_item(parent_item_id)
  WHERE parent_item_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS perf_study_item_template_node_unique_idx
  ON perf_study_roadmap_item(roadmap_id, template_node_id)
  WHERE template_node_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS perf_study_item_progress_order_idx
  ON perf_study_roadmap_item(roadmap_id, module_id, counts_for_progress, order_index);

-- As policies RLS protegem cada linha, e estas chaves compostas tambem
-- garantem que as referencias novas pertencam ao mesmo usuario/roadmap. As
-- constraints sao NOT VALID para nao rejeitar uma instalacao por eventual
-- dado legado; ainda assim passam a validar toda escrita nova imediatamente.
CREATE UNIQUE INDEX IF NOT EXISTS perf_study_roadmap_owner_identity_idx
  ON perf_study_roadmap(id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS perf_study_module_owner_identity_idx
  ON perf_study_roadmap_module(id, user_id, roadmap_id);
CREATE UNIQUE INDEX IF NOT EXISTS perf_study_item_owner_identity_idx
  ON perf_study_roadmap_item(id, user_id);

ALTER TABLE perf_study_roadmap_module
  DROP CONSTRAINT IF EXISTS perf_study_module_roadmap_owner_fk;
ALTER TABLE perf_study_roadmap_module
  ADD CONSTRAINT perf_study_module_roadmap_owner_fk
  FOREIGN KEY (roadmap_id, user_id)
  REFERENCES perf_study_roadmap(id, user_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE perf_study_roadmap_item
  DROP CONSTRAINT IF EXISTS perf_study_item_roadmap_owner_fk;
ALTER TABLE perf_study_roadmap_item
  ADD CONSTRAINT perf_study_item_roadmap_owner_fk
  FOREIGN KEY (roadmap_id, user_id)
  REFERENCES perf_study_roadmap(id, user_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE perf_study_roadmap_item
  DROP CONSTRAINT IF EXISTS perf_study_item_module_owner_fk;
ALTER TABLE perf_study_roadmap_item
  ADD CONSTRAINT perf_study_item_module_owner_fk
  FOREIGN KEY (module_id, user_id, roadmap_id)
  REFERENCES perf_study_roadmap_module(id, user_id, roadmap_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE perf_study_assessment_question
  DROP CONSTRAINT IF EXISTS perf_study_question_item_owner_fk;
ALTER TABLE perf_study_assessment_question
  ADD CONSTRAINT perf_study_question_item_owner_fk
  FOREIGN KEY (item_id, user_id)
  REFERENCES perf_study_roadmap_item(id, user_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE perf_study_assessment_attempt
  DROP CONSTRAINT IF EXISTS perf_study_attempt_item_owner_fk;
ALTER TABLE perf_study_assessment_attempt
  ADD CONSTRAINT perf_study_attempt_item_owner_fk
  FOREIGN KEY (item_id, user_id)
  REFERENCES perf_study_roadmap_item(id, user_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE perf_study_check_progress
  DROP CONSTRAINT IF EXISTS perf_study_check_progress_item_owner_fk;
ALTER TABLE perf_study_check_progress
  ADD CONSTRAINT perf_study_check_progress_item_owner_fk
  FOREIGN KEY (item_id, user_id)
  REFERENCES perf_study_roadmap_item(id, user_id)
  ON DELETE CASCADE
  NOT VALID;

-- A troca do roadmap ativo precisa ser atomica: se a ativacao falhar, o
-- roadmap anterior nao pode ficar arquivado pela metade da operacao.
CREATE OR REPLACE FUNCTION perf_activate_study_roadmap(p_roadmap_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  affected integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  PERFORM 1
  FROM perf_study_roadmap
  WHERE id = p_roadmap_id
    AND user_id = uid
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Roadmap nao encontrado';
  END IF;

  UPDATE perf_study_roadmap
  SET status = 'archived', updated_at = now()
  WHERE user_id = uid
    AND status = 'active'
    AND id <> p_roadmap_id;

  UPDATE perf_study_roadmap
  SET status = 'active', updated_at = now()
  WHERE id = p_roadmap_id
    AND user_id = uid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Nao foi possivel ativar o roadmap';
  END IF;
END $$;

REVOKE ALL ON FUNCTION perf_activate_study_roadmap(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION perf_activate_study_roadmap(uuid) TO authenticated;

-- A criacao das perguntas dispara o recompute por trigger. Para roadmaps de
-- TI, a mera definicao do snapshot nao deve transformar itens futuros em
-- in_progress: somente tentativa ou interacao com checklist inicia o item.
-- Idiomas e roadmaps legados preservam a semantica anterior.
CREATE OR REPLACE FUNCTION perf_recompute_study_item(
  p_item_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  required_checks integer;
  checked_checks integer;
  question_count integer;
  answered boolean;
  eligible boolean;
  legacy boolean;
  target_roadmap_kind text;
  has_interaction boolean;
BEGIN
  SELECT
    jsonb_array_length(item.preparation_steps)
      + jsonb_array_length(item.completion_checklist),
    item.legacy_completion_preserved,
    roadmap.roadmap_kind
  INTO required_checks, legacy, target_roadmap_kind
  FROM perf_study_roadmap_item AS item
  JOIN perf_study_roadmap AS roadmap
    ON roadmap.id = item.roadmap_id
   AND roadmap.user_id = item.user_id
  WHERE item.id = p_item_id
    AND item.user_id = p_user_id
  FOR UPDATE OF item;

  -- O item pode ter sido removido por ON DELETE CASCADE.
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT count(*)
  INTO checked_checks
  FROM perf_study_check_progress AS progress
  WHERE progress.item_id = p_item_id
    AND progress.user_id = p_user_id
    AND progress.checked;

  SELECT count(*)
  INTO question_count
  FROM perf_study_assessment_question AS question
  WHERE question.item_id = p_item_id
    AND question.user_id = p_user_id;

  IF question_count = 0 THEN
    answered := true;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM perf_study_assessment_attempt AS attempt
      WHERE attempt.item_id = p_item_id
        AND attempt.user_id = p_user_id
        AND NOT EXISTS (
          SELECT 1
          FROM perf_study_assessment_question AS question
          WHERE question.item_id = p_item_id
            AND question.user_id = p_user_id
            AND NOT (attempt.answers ? question.id::text)
        )
    )
    INTO answered;
  END IF;

  SELECT
    EXISTS (
      SELECT 1
      FROM perf_study_assessment_attempt AS attempt
      WHERE attempt.item_id = p_item_id
        AND attempt.user_id = p_user_id
    ) OR EXISTS (
      SELECT 1
      FROM perf_study_check_progress AS progress
      WHERE progress.item_id = p_item_id
        AND progress.user_id = p_user_id
    )
  INTO has_interaction;

  eligible := checked_checks = required_checks
    AND answered
    AND (required_checks > 0 OR question_count > 0);

  IF legacy AND NOT eligible THEN
    RETURN true;
  END IF;

  UPDATE perf_study_roadmap_item
  SET
    status = CASE
      WHEN eligible THEN 'completed'
      WHEN target_roadmap_kind = 'it_career' AND NOT has_interaction THEN 'pending'
      ELSE 'in_progress'
    END,
    completed_at = CASE
      WHEN eligible THEN coalesce(completed_at, now())
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = p_item_id
    AND user_id = p_user_id;

  RETURN eligible;
END $$;

-- O cliente autenticado nao pode confiar apenas no bloqueio visual do wizard.
-- As duas funcoes abaixo substituem as versoes da migration de progresso e
-- serializam toda mudanca de progresso do mesmo usuario. As regras adicionais
-- so valem para roadmaps it_career; idiomas e registros legados preservam o
-- comportamento anterior.
CREATE OR REPLACE FUNCTION perf_submit_study_attempt(p_item_id uuid, p_answers jsonb)
RETURNS TABLE(correct_count integer, total_count integer, score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  target_item record;
  q record;
  answer jsonb;
  v_correct integer := 0;
  v_total integer := 0;
  submitted_count integer := 0;
  option_count integer;
  distinct_count integer;
  blocker_module_title text;
BEGIN
  IF uid IS NULL OR p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
    RAISE EXCEPTION 'Avaliacao invalida';
  END IF;

  SELECT count(*)
  INTO submitted_count
  FROM jsonb_object_keys(p_answers);
  IF submitted_count > 20 THEN
    RAISE EXCEPTION 'Respostas invalidas';
  END IF;

  -- Usa a mesma chave da ativacao de roadmap. Assim uma tentativa nao corre em
  -- paralelo com a conclusao do desafio anterior ou com a troca da trilha ativa.
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  SELECT
    item.roadmap_id,
    item.scheduled_date,
    item.order_index,
    item.module_id,
    module.order_index AS module_order_index,
    item.content_role,
    roadmap.roadmap_kind
  INTO target_item
  FROM perf_study_roadmap_item AS item
  JOIN perf_study_roadmap AS roadmap
    ON roadmap.id = item.roadmap_id
   AND roadmap.user_id = item.user_id
  LEFT JOIN perf_study_roadmap_module AS module
    ON module.id = item.module_id
   AND module.roadmap_id = item.roadmap_id
   AND module.user_id = item.user_id
  WHERE item.id = p_item_id
    AND item.user_id = uid
  FOR UPDATE OF item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Avaliacao invalida';
  END IF;

  IF target_item.roadmap_kind = 'it_career' THEN
    IF target_item.content_role IS DISTINCT FROM 'assessment' THEN
      RAISE EXCEPTION 'Avaliacao de TI invalida';
    END IF;
    IF target_item.module_id IS NULL OR target_item.module_order_index IS NULL THEN
      RAISE EXCEPTION 'Avaliacao de TI sem modulo';
    END IF;

    SELECT previous_module.title
    INTO blocker_module_title
    FROM perf_study_roadmap_module AS previous_module
    WHERE previous_module.user_id = uid
      AND previous_module.roadmap_id = target_item.roadmap_id
      AND previous_module.order_index < target_item.module_order_index
      AND EXISTS (
        SELECT 1
        FROM perf_study_roadmap_item AS pending_item
        WHERE pending_item.user_id = uid
          AND pending_item.roadmap_id = target_item.roadmap_id
          AND pending_item.module_id = previous_module.id
          AND pending_item.counts_for_progress
          AND pending_item.status IS DISTINCT FROM 'completed'
      )
    ORDER BY previous_module.order_index
    LIMIT 1;
    IF blocker_module_title IS NOT NULL THEN
      RAISE EXCEPTION 'Você precisa finalizar o módulo "%" primeiro', blocker_module_title;
    END IF;

    IF target_item.scheduled_date IS NULL THEN
      RAISE EXCEPTION 'Avaliacao de TI sem data';
    END IF;
    IF target_item.scheduled_date > (now() AT TIME ZONE 'America/Bahia')::date THEN
      RAISE EXCEPTION 'Este bloco de perguntas ainda nao esta disponivel';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM perf_study_roadmap_item AS previous_item
      WHERE previous_item.user_id = uid
        AND previous_item.roadmap_id = target_item.roadmap_id
        AND previous_item.module_id = target_item.module_id
        AND previous_item.content_role IN ('assessment', 'module_project', 'capstone')
        AND previous_item.order_index < target_item.order_index
        AND previous_item.status IS DISTINCT FROM 'completed'
    ) THEN
      RAISE EXCEPTION 'Conclua primeiro as questoes e o desafio anterior deste roadmap';
    END IF;
  END IF;

  FOR q IN
    SELECT
      question.id,
      question.question_type,
      question.options,
      question.correct_option,
      question.correct_order
    FROM perf_study_assessment_question AS question
    WHERE question.item_id = p_item_id
      AND question.user_id = uid
    ORDER BY question.order_index
  LOOP
    v_total := v_total + 1;
    answer := p_answers -> q.id::text;
    option_count := jsonb_array_length(q.options);
    IF answer IS NULL THEN
      RAISE EXCEPTION 'Responda todas as perguntas';
    END IF;
    IF q.question_type = 'multiple_choice' THEN
      IF jsonb_typeof(answer) <> 'number'
        OR (answer::text)::integer < 0
        OR (answer::text)::integer >= option_count THEN
        RAISE EXCEPTION 'Resposta invalida';
      END IF;
      IF (answer::text)::integer = q.correct_option THEN
        v_correct := v_correct + 1;
      END IF;
    ELSE
      IF jsonb_typeof(answer) <> 'array' OR jsonb_array_length(answer) <> option_count THEN
        RAISE EXCEPTION 'Ordem invalida';
      END IF;
      SELECT count(DISTINCT value::integer)
      INTO distinct_count
      FROM jsonb_array_elements_text(answer);
      IF distinct_count <> option_count OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(answer) AS submitted(value)
        WHERE submitted.value::integer < 0 OR submitted.value::integer >= option_count
      ) THEN
        RAISE EXCEPTION 'Ordem invalida';
      END IF;
      IF answer = q.correct_order THEN
        v_correct := v_correct + 1;
      END IF;
    END IF;
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Esta etapa nao possui perguntas';
  END IF;
  IF submitted_count <> v_total THEN
    RAISE EXCEPTION 'Envie somente as respostas desta avaliacao';
  END IF;

  INSERT INTO perf_study_assessment_attempt(
    user_id, item_id, answers, correct_count, total_count, score
  )
  VALUES (
    uid,
    p_item_id,
    p_answers,
    v_correct,
    v_total,
    round((v_correct::numeric / v_total::numeric) * 100, 2)
  );

  RETURN QUERY
  SELECT v_correct, v_total, round((v_correct::numeric / v_total::numeric) * 100, 2);
END $$;

CREATE OR REPLACE FUNCTION perf_toggle_study_check(
  p_item_id uuid,
  p_group text,
  p_index integer,
  p_checked boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  target_item record;
  authoritative jsonb;
  total integer;
  blocker_module_title text;
BEGIN
  IF uid IS NULL
    OR p_group IS NULL
    OR p_group NOT IN ('preparation', 'completion')
    OR p_index IS NULL
    OR p_checked IS NULL THEN
    RAISE EXCEPTION 'Entrada invalida';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  SELECT
    item.roadmap_id,
    item.order_index,
    item.module_id,
    module.order_index AS module_order_index,
    item.content_role,
    roadmap.roadmap_kind,
    CASE
      WHEN p_group = 'preparation' THEN item.preparation_steps
      ELSE item.completion_checklist
    END AS authoritative
  INTO target_item
  FROM perf_study_roadmap_item AS item
  JOIN perf_study_roadmap AS roadmap
    ON roadmap.id = item.roadmap_id
   AND roadmap.user_id = item.user_id
  LEFT JOIN perf_study_roadmap_module AS module
    ON module.id = item.module_id
   AND module.roadmap_id = item.roadmap_id
   AND module.user_id = item.user_id
  WHERE item.id = p_item_id
    AND item.user_id = uid
  FOR UPDATE OF item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aula nao encontrada';
  END IF;

  authoritative := target_item.authoritative;
  IF authoritative IS NULL OR jsonb_typeof(authoritative) <> 'array' THEN
    RAISE EXCEPTION 'Checklist desatualizado';
  END IF;
  total := jsonb_array_length(authoritative);
  IF p_index < 0 OR p_index >= total THEN
    RAISE EXCEPTION 'Checklist desatualizado';
  END IF;

  IF p_checked
    AND target_item.roadmap_kind = 'it_career'
    AND target_item.content_role IN ('module_project', 'capstone') THEN
    IF target_item.module_id IS NULL OR target_item.module_order_index IS NULL THEN
      RAISE EXCEPTION 'Projeto de TI sem modulo';
    END IF;

    SELECT previous_module.title
    INTO blocker_module_title
    FROM perf_study_roadmap_module AS previous_module
    WHERE previous_module.user_id = uid
      AND previous_module.roadmap_id = target_item.roadmap_id
      AND previous_module.order_index < target_item.module_order_index
      AND EXISTS (
        SELECT 1
        FROM perf_study_roadmap_item AS pending_item
        WHERE pending_item.user_id = uid
          AND pending_item.roadmap_id = target_item.roadmap_id
          AND pending_item.module_id = previous_module.id
          AND pending_item.counts_for_progress
          AND pending_item.status IS DISTINCT FROM 'completed'
      )
    ORDER BY previous_module.order_index
    LIMIT 1;
    IF blocker_module_title IS NOT NULL THEN
      RAISE EXCEPTION 'Você precisa finalizar o módulo "%" primeiro', blocker_module_title;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM perf_study_roadmap_item AS previous_item
      WHERE previous_item.user_id = uid
        AND previous_item.roadmap_id = target_item.roadmap_id
        AND previous_item.module_id = target_item.module_id
        AND previous_item.content_role IN ('assessment', 'module_project', 'capstone')
        AND previous_item.order_index < target_item.order_index
        AND previous_item.status IS DISTINCT FROM 'completed'
    ) THEN
      RAISE EXCEPTION 'Conclua primeiro as questoes e o desafio anterior deste modulo';
    END IF;
  END IF;

  INSERT INTO perf_study_check_progress(
    user_id, item_id, check_group, item_index, checked, updated_at
  )
  VALUES (uid, p_item_id, p_group, p_index, p_checked, now())
  ON CONFLICT(user_id, item_id, check_group, item_index)
  DO UPDATE SET checked = EXCLUDED.checked, updated_at = now();

  UPDATE perf_study_roadmap_item
  SET legacy_completion_preserved = false
  WHERE id = p_item_id
    AND user_id = uid;

  RETURN perf_recompute_study_item(p_item_id, uid);
END $$;

-- Defesa em profundidade contra UPDATE direto do status. A validacao e
-- deliberadamente restrita ao snapshot de TI v4 para nao reinterpretar o
-- progresso historico dos roadmaps de idioma ou legados.
CREATE OR REPLACE FUNCTION perf_guard_it_study_item_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  old_roadmap_kind text;
  new_roadmap_kind text;
  target_roadmap_kind text;
  target_template_version integer;
  gate_item_id uuid;
  gate_user_id uuid;
  gate_roadmap_id uuid;
  gate_module_id uuid;
  gate_module_order_index integer;
  gate_content_role text;
  gate_order_index integer;
  gate_scheduled_date date;
  gate_preparation_steps jsonb;
  gate_completion_checklist jsonb;
  required_checks integer;
  checked_checks integer;
  question_count integer;
  answered boolean;
  blocker_module_title text;
  is_gate boolean;
  advances_item boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT roadmap.roadmap_kind
    INTO old_roadmap_kind
    FROM perf_study_roadmap AS roadmap
    WHERE roadmap.id = OLD.roadmap_id
      AND roadmap.user_id = OLD.user_id;

    IF NEW.roadmap_id IS NOT DISTINCT FROM OLD.roadmap_id
      AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN
      new_roadmap_kind := old_roadmap_kind;
    ELSE
      SELECT roadmap.roadmap_kind
      INTO new_roadmap_kind
      FROM perf_study_roadmap AS roadmap
      WHERE roadmap.id = NEW.roadmap_id
        AND roadmap.user_id = NEW.user_id;
    END IF;

    -- A identidade e a ordem dos itens contabilizados fazem parte do snapshot.
    -- Sem esta protecao, um UPDATE conjunto poderia mover o item para o primeiro
    -- modulo ou retirar sua participacao no progresso antes de conclui-lo.
    IF (
      old_roadmap_kind = 'it_career' AND OLD.counts_for_progress
    ) OR (
      new_roadmap_kind = 'it_career' AND NEW.counts_for_progress
    ) THEN
      IF NEW.id IS DISTINCT FROM OLD.id
        OR NEW.user_id IS DISTINCT FROM OLD.user_id
        OR NEW.roadmap_id IS DISTINCT FROM OLD.roadmap_id
        OR NEW.module_id IS DISTINCT FROM OLD.module_id
        OR NEW.content_role IS DISTINCT FROM OLD.content_role
        OR NEW.order_index IS DISTINCT FROM OLD.order_index
        OR NEW.counts_for_progress IS DISTINCT FROM OLD.counts_for_progress THEN
        RAISE EXCEPTION 'A definicao de um item contabilizado de TI nao pode ser alterada';
      END IF;
    END IF;

    -- Um gate de TI e um snapshot entregue pelo catalogo. Rejeitar a troca da
    -- identidade e dos requisitos fecha tanto o bypass content_role = NULL
    -- quanto a reducao direta de checklist, projeto, ordem ou data de abertura.
    IF (
      old_roadmap_kind = 'it_career'
      AND OLD.content_role IN ('assessment', 'module_project', 'capstone')
    ) OR (
      new_roadmap_kind = 'it_career'
      AND NEW.content_role IN ('assessment', 'module_project', 'capstone')
    ) THEN
      IF NEW.id IS DISTINCT FROM OLD.id
        OR NEW.user_id IS DISTINCT FROM OLD.user_id
        OR NEW.roadmap_id IS DISTINCT FROM OLD.roadmap_id
        OR NEW.module_id IS DISTINCT FROM OLD.module_id
        OR NEW.content_role IS DISTINCT FROM OLD.content_role
        OR NEW.order_index IS DISTINCT FROM OLD.order_index
        OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
        OR NEW.estimated_minutes IS DISTINCT FROM OLD.estimated_minutes
        OR NEW.preparation_steps IS DISTINCT FROM OLD.preparation_steps
        OR NEW.completion_checklist IS DISTINCT FROM OLD.completion_checklist
        OR NEW.project_spec IS DISTINCT FROM OLD.project_spec THEN
        RAISE EXCEPTION 'A definicao de um gate de TI nao pode ser alterada';
      END IF;
    END IF;

    IF old_roadmap_kind IS DISTINCT FROM 'it_career'
      OR NOT OLD.counts_for_progress THEN
      RETURN NEW;
    END IF;

    -- Para UPDATE, toda validacao usa a identidade original. Os campos acima
    -- ja foram comparados, mas OLD evita que um UPDATE conjunto burle o gate.
    target_roadmap_kind := old_roadmap_kind;
    gate_item_id := OLD.id;
    gate_user_id := OLD.user_id;
    gate_roadmap_id := OLD.roadmap_id;
    gate_module_id := OLD.module_id;
    gate_content_role := OLD.content_role;
    gate_order_index := OLD.order_index;
    gate_scheduled_date := OLD.scheduled_date;
    gate_preparation_steps := OLD.preparation_steps;
    gate_completion_checklist := OLD.completion_checklist;

    SELECT module.order_index
    INTO gate_module_order_index
    FROM perf_study_roadmap_module AS module
    WHERE module.id = gate_module_id
      AND module.user_id = gate_user_id
      AND module.roadmap_id = gate_roadmap_id;
  ELSE
    SELECT roadmap.roadmap_kind, roadmap.template_version
    INTO target_roadmap_kind, target_template_version
    FROM perf_study_roadmap AS roadmap
    WHERE roadmap.id = NEW.roadmap_id
      AND roadmap.user_id = NEW.user_id;

    IF target_roadmap_kind = 'it_career'
      AND coalesce(target_template_version, 0) >= 4
      AND NEW.content_role IN ('module_project', 'capstone')
      AND NEW.project_spec = '{}'::jsonb THEN
      RAISE EXCEPTION 'O desafio de TI exige uma especificacao estruturada';
    END IF;

    -- A materializacao grava todos os modulos em lote. Estados iniciais como
    -- pending/in_progress descrevem o snapshot e nao representam uma acao do
    -- aluno; a sequencia passa a valer somente nos RPCs e UPDATEs posteriores.
    RETURN NEW;
  END IF;

  is_gate := coalesce(
    gate_content_role IN ('assessment', 'module_project', 'capstone'),
    false
  );
  advances_item := NEW.status IS DISTINCT FROM OLD.status
    AND NEW.status IN ('in_progress', 'completed');

  -- Um gate ja concluido continua sendo revalidado em qualquer UPDATE de
  -- status. Para os demais itens, a sequencia e consultada ao iniciar/concluir.
  IF NOT advances_item
    AND (NOT is_gate OR NEW.status IS DISTINCT FROM 'completed') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(gate_user_id::text, 0));

  IF gate_module_id IS NULL OR gate_module_order_index IS NULL THEN
    RAISE EXCEPTION 'Etapa de TI sem modulo';
  END IF;

  SELECT previous_module.title
  INTO blocker_module_title
  FROM perf_study_roadmap_module AS previous_module
  WHERE previous_module.user_id = gate_user_id
    AND previous_module.roadmap_id = gate_roadmap_id
    AND previous_module.order_index < gate_module_order_index
    AND EXISTS (
      SELECT 1
      FROM perf_study_roadmap_item AS pending_item
      WHERE pending_item.user_id = gate_user_id
        AND pending_item.roadmap_id = gate_roadmap_id
        AND pending_item.module_id = previous_module.id
        AND pending_item.counts_for_progress
        AND pending_item.status IS DISTINCT FROM 'completed'
    )
  ORDER BY previous_module.order_index
  LIMIT 1;
  IF blocker_module_title IS NOT NULL THEN
    RAISE EXCEPTION 'Você precisa finalizar o módulo "%" primeiro', blocker_module_title;
  END IF;

  IF NEW.status IS DISTINCT FROM 'completed' OR NOT is_gate THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM perf_study_roadmap_item AS previous_item
    WHERE previous_item.user_id = gate_user_id
      AND previous_item.roadmap_id = gate_roadmap_id
      AND previous_item.module_id = gate_module_id
      AND previous_item.content_role IN ('assessment', 'module_project', 'capstone')
      AND previous_item.order_index < gate_order_index
      AND previous_item.status IS DISTINCT FROM 'completed'
  ) THEN
    RAISE EXCEPTION 'Nao e possivel concluir uma etapa antes do gate anterior';
  END IF;

  IF gate_content_role = 'assessment' THEN
    IF gate_scheduled_date IS NULL
      OR gate_scheduled_date > (now() AT TIME ZONE 'America/Bahia')::date THEN
      RAISE EXCEPTION 'A avaliacao ainda nao esta disponivel';
    END IF;

    SELECT count(*)
    INTO question_count
    FROM perf_study_assessment_question AS question
    WHERE question.item_id = gate_item_id
      AND question.user_id = gate_user_id;

    SELECT EXISTS (
      SELECT 1
      FROM perf_study_assessment_attempt AS attempt
      WHERE attempt.item_id = gate_item_id
        AND attempt.user_id = gate_user_id
        AND (
          SELECT count(*)
          FROM jsonb_object_keys(attempt.answers)
        ) = question_count
        AND NOT EXISTS (
          SELECT 1
          FROM perf_study_assessment_question AS question
          WHERE question.item_id = gate_item_id
            AND question.user_id = gate_user_id
            AND NOT (attempt.answers ? question.id::text)
        )
    )
    INTO answered;

    IF question_count = 0 OR NOT answered THEN
      RAISE EXCEPTION 'A avaliacao exige uma tentativa completa';
    END IF;
  ELSE
    required_checks :=
      jsonb_array_length(coalesce(gate_preparation_steps, '[]'::jsonb))
      + jsonb_array_length(coalesce(gate_completion_checklist, '[]'::jsonb));

    SELECT count(*)
    INTO checked_checks
    FROM perf_study_check_progress AS progress
    WHERE progress.item_id = gate_item_id
      AND progress.user_id = gate_user_id
      AND progress.checked
      AND (
        (
          progress.check_group = 'preparation'
          AND progress.item_index < jsonb_array_length(coalesce(gate_preparation_steps, '[]'::jsonb))
        )
        OR
        (
          progress.check_group = 'completion'
          AND progress.item_index < jsonb_array_length(coalesce(gate_completion_checklist, '[]'::jsonb))
        )
      );

    IF required_checks = 0 OR checked_checks <> required_checks THEN
      RAISE EXCEPTION 'O projeto exige a confirmacao de todas as entregas';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS perf_guard_it_study_item_completion_trigger
  ON perf_study_roadmap_item;
DROP TRIGGER IF EXISTS perf_guard_it_study_item_completion_insert_trigger
  ON perf_study_roadmap_item;
DROP TRIGGER IF EXISTS perf_guard_it_study_item_completion_update_trigger
  ON perf_study_roadmap_item;
CREATE TRIGGER perf_guard_it_study_item_completion_insert_trigger
BEFORE INSERT ON perf_study_roadmap_item
FOR EACH ROW
EXECUTE FUNCTION perf_guard_it_study_item_completion();
CREATE TRIGGER perf_guard_it_study_item_completion_update_trigger
BEFORE UPDATE OF id, status, content_role, roadmap_id, user_id, module_id, order_index,
  scheduled_date, estimated_minutes, counts_for_progress, preparation_steps,
  completion_checklist, project_spec
ON perf_study_roadmap_item
FOR EACH ROW
EXECUTE FUNCTION perf_guard_it_study_item_completion();

-- A classificacao controla todos os gates acima e, por isso, nao pode ser
-- rebaixada para legacy depois que o snapshot de TI foi criado.
CREATE OR REPLACE FUNCTION perf_guard_it_study_roadmap_kind()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.roadmap_kind IS DISTINCT FROM OLD.roadmap_kind
    AND (OLD.roadmap_kind = 'it_career' OR NEW.roadmap_kind = 'it_career') THEN
    RAISE EXCEPTION 'A classificacao de um roadmap de TI nao pode ser alterada';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS perf_guard_it_study_roadmap_kind_trigger
  ON perf_study_roadmap;
CREATE TRIGGER perf_guard_it_study_roadmap_kind_trigger
BEFORE UPDATE OF roadmap_kind ON perf_study_roadmap
FOR EACH ROW
EXECUTE FUNCTION perf_guard_it_study_roadmap_kind();

-- Excluir um gate (ou o modulo que o contem) nao pode ser um atalho para
-- liberar o proximo. Quando a exclusao parte do roadmap-pai, o registro-pai ja
-- nao existe no momento dos cascades e a limpeza completa continua permitida.
-- Idiomas e roadmaps legados tambem continuam editaveis como antes.
CREATE OR REPLACE FUNCTION perf_guard_it_study_structure_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_roadmap_kind text;
BEGIN
  SELECT roadmap.roadmap_kind
  INTO target_roadmap_kind
  FROM perf_study_roadmap AS roadmap
  WHERE roadmap.id = OLD.roadmap_id
    AND roadmap.user_id = OLD.user_id;

  IF target_roadmap_kind = 'it_career' THEN
    RAISE EXCEPTION 'A estrutura de um roadmap de TI nao pode ser excluida parcialmente';
  END IF;

  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS perf_guard_it_study_item_delete_trigger
  ON perf_study_roadmap_item;
CREATE TRIGGER perf_guard_it_study_item_delete_trigger
BEFORE DELETE ON perf_study_roadmap_item
FOR EACH ROW
EXECUTE FUNCTION perf_guard_it_study_structure_delete();

DROP TRIGGER IF EXISTS perf_guard_it_study_module_delete_trigger
  ON perf_study_roadmap_module;
CREATE TRIGGER perf_guard_it_study_module_delete_trigger
BEFORE DELETE ON perf_study_roadmap_module
FOR EACH ROW
EXECUTE FUNCTION perf_guard_it_study_structure_delete();

-- Toda mutacao do progresso e toda leitura/correcao do gabarito passam pelas
-- funcoes SECURITY DEFINER. A RLS continua habilitada como segunda barreira.
REVOKE ALL ON TABLE perf_study_assessment_question FROM PUBLIC, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE perf_study_check_progress FROM PUBLIC, authenticated;
GRANT SELECT ON TABLE perf_study_check_progress TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE perf_study_assessment_attempt FROM PUBLIC, authenticated;

REVOKE ALL ON FUNCTION perf_submit_study_attempt(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION perf_submit_study_attempt(uuid, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION perf_toggle_study_check(uuid, text, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION perf_toggle_study_check(uuid, text, integer, boolean) TO authenticated;
REVOKE ALL ON FUNCTION perf_recompute_study_item(uuid, uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION perf_guard_it_study_item_completion() FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION perf_guard_it_study_roadmap_kind() FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION perf_guard_it_study_structure_delete() FROM PUBLIC, authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
