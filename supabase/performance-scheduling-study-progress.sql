-- Agenda recorrente, historico de frequencia dos habitos e progresso verificavel dos estudos.
-- Migration aditiva/idempotente. Execute manualmente no Supabase SQL Editor.

BEGIN;

ALTER TABLE perf_event DROP CONSTRAINT IF EXISTS perf_event_recurrence_rule_valid;
ALTER TABLE perf_event ADD CONSTRAINT perf_event_recurrence_rule_valid CHECK (
  recurrence_rule IS NULL OR (
    jsonb_typeof(recurrence_rule) = 'object'
    AND recurrence_rule->>'frequency' IN ('daily','weekly','monthly','yearly')
    AND (recurrence_rule->>'interval')::integer BETWEEN 1 AND 365
    AND recurrence_rule->>'timezone' = 'America/Bahia'
  )
);
CREATE INDEX IF NOT EXISTS perf_event_recurrence_group_idx
  ON perf_event(user_id, recurrence_group_id) WHERE recurrence_group_id IS NOT NULL;

ALTER TABLE perf_habit DROP CONSTRAINT IF EXISTS perf_habit_frequency_valid;
ALTER TABLE perf_habit ADD CONSTRAINT perf_habit_frequency_valid CHECK (
  frequency_type IN ('daily','weekdays','weekends','custom_weekdays')
  AND (frequency_type <> 'custom_weekdays' OR coalesce(cardinality(weekdays), 0) > 0)
  AND (weekdays IS NULL OR weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[])
);

CREATE TABLE IF NOT EXISTS perf_habit_schedule_period (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES perf_habit(id) ON DELETE CASCADE,
  frequency_type text NOT NULL,
  weekdays smallint[] NOT NULL DEFAULT '{}'::smallint[],
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_habit_schedule_period_frequency_valid CHECK (
    frequency_type IN ('daily','weekdays','weekends','custom_weekdays')
    AND (frequency_type <> 'custom_weekdays' OR cardinality(weekdays) > 0)
    AND weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[]
  ),
  CONSTRAINT perf_habit_schedule_period_dates_valid CHECK (effective_to IS NULL OR effective_to >= effective_from),
  UNIQUE(habit_id, effective_from)
);
CREATE UNIQUE INDEX IF NOT EXISTS perf_habit_schedule_period_open_idx
  ON perf_habit_schedule_period(habit_id) WHERE effective_to IS NULL;
CREATE INDEX IF NOT EXISTS perf_habit_schedule_period_lookup_idx
  ON perf_habit_schedule_period(user_id, habit_id, effective_from, effective_to);

INSERT INTO perf_habit_schedule_period (user_id, habit_id, frequency_type, weekdays, effective_from, effective_to)
SELECT h.user_id, h.id, h.frequency_type, coalesce(h.weekdays, '{}'::smallint[]),
       coalesce(h.start_date, h.created_at::date), h.end_date
FROM perf_habit h
WHERE NOT EXISTS (SELECT 1 FROM perf_habit_schedule_period p WHERE p.habit_id = h.id);

CREATE OR REPLACE FUNCTION perf_capture_habit_schedule_period()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE effective_date date := (now() AT TIME ZONE 'America/Bahia')::date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO perf_habit_schedule_period(user_id, habit_id, frequency_type, weekdays, effective_from, effective_to)
    VALUES (NEW.user_id, NEW.id, NEW.frequency_type, coalesce(NEW.weekdays, '{}'::smallint[]), coalesce(NEW.start_date, effective_date), NEW.end_date)
    ON CONFLICT (habit_id, effective_from) DO UPDATE SET frequency_type = EXCLUDED.frequency_type, weekdays = EXCLUDED.weekdays, effective_to = EXCLUDED.effective_to;
    RETURN NEW;
  END IF;
  IF NEW.frequency_type IS DISTINCT FROM OLD.frequency_type OR NEW.weekdays IS DISTINCT FROM OLD.weekdays OR NEW.end_date IS DISTINCT FROM OLD.end_date OR NEW.ativo IS DISTINCT FROM OLD.ativo THEN
    UPDATE perf_habit_schedule_period SET effective_to = effective_date - 1
      WHERE habit_id = NEW.id AND effective_from < effective_date AND (effective_to IS NULL OR effective_to >= effective_date);
    DELETE FROM perf_habit_schedule_period WHERE habit_id = NEW.id AND effective_from >= effective_date;
    IF NEW.ativo THEN
      INSERT INTO perf_habit_schedule_period(user_id, habit_id, frequency_type, weekdays, effective_from, effective_to)
      VALUES (NEW.user_id, NEW.id, NEW.frequency_type, coalesce(NEW.weekdays, '{}'::smallint[]), effective_date, NEW.end_date);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS perf_habit_schedule_period_trigger ON perf_habit;
CREATE TRIGGER perf_habit_schedule_period_trigger AFTER INSERT OR UPDATE OF frequency_type, weekdays, end_date, ativo
  ON perf_habit FOR EACH ROW EXECUTE FUNCTION perf_capture_habit_schedule_period();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='perf_study_roadmap_item' AND column_name='legacy_completion_preserved') THEN
    ALTER TABLE perf_study_roadmap_item ADD COLUMN legacy_completion_preserved boolean NOT NULL DEFAULT false;
    UPDATE perf_study_roadmap_item SET legacy_completion_preserved = true WHERE status = 'completed';
  END IF;
END $$;
ALTER TABLE perf_study_roadmap_item DROP CONSTRAINT IF EXISTS perf_study_item_kind_valid;
ALTER TABLE perf_study_roadmap_item ADD CONSTRAINT perf_study_item_kind_valid CHECK (item_kind IN (
  'core','reinforcement','challenge','check','criterion','general','reading','video','audiovisual','practice','quiz','project','checkpoint'
));

CREATE TABLE IF NOT EXISTS perf_study_check_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES perf_study_roadmap_item(id) ON DELETE CASCADE,
  check_group text NOT NULL CHECK (check_group IN ('preparation','completion')),
  item_index integer NOT NULL CHECK (item_index >= 0 AND item_index < 100),
  checked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id, check_group, item_index)
);
CREATE INDEX IF NOT EXISTS perf_study_check_progress_item_idx ON perf_study_check_progress(user_id, item_id);

-- Itens ja concluidos continuam concluidos e recebem um backfill explicito dos checks.
INSERT INTO perf_study_check_progress(user_id, item_id, check_group, item_index, checked)
SELECT i.user_id, i.id, 'preparation', value.ordinality - 1, true
FROM perf_study_roadmap_item i CROSS JOIN LATERAL jsonb_array_elements(i.preparation_steps) WITH ORDINALITY value
WHERE i.status = 'completed' AND i.legacy_completion_preserved
ON CONFLICT (user_id, item_id, check_group, item_index) DO NOTHING;
INSERT INTO perf_study_check_progress(user_id, item_id, check_group, item_index, checked)
SELECT i.user_id, i.id, 'completion', value.ordinality - 1, true
FROM perf_study_roadmap_item i CROSS JOIN LATERAL jsonb_array_elements(i.completion_checklist) WITH ORDINALITY value
WHERE i.status = 'completed' AND i.legacy_completion_preserved
ON CONFLICT (user_id, item_id, check_group, item_index) DO NOTHING;

CREATE OR REPLACE FUNCTION perf_recompute_study_item(p_item_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE required_checks integer; checked_checks integer; question_count integer; answered boolean; eligible boolean; legacy boolean;
BEGIN
  SELECT jsonb_array_length(preparation_steps) + jsonb_array_length(completion_checklist), legacy_completion_preserved
    INTO required_checks, legacy FROM perf_study_roadmap_item WHERE id = p_item_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aula nao encontrada'; END IF;
  SELECT count(*) INTO checked_checks FROM perf_study_check_progress
    WHERE item_id = p_item_id AND user_id = p_user_id AND checked;
  SELECT count(*) INTO question_count FROM perf_study_assessment_question WHERE item_id = p_item_id AND user_id = p_user_id;
  IF question_count = 0 THEN answered := true;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM perf_study_assessment_attempt a
      WHERE a.item_id = p_item_id AND a.user_id = p_user_id
        AND NOT EXISTS (SELECT 1 FROM perf_study_assessment_question q WHERE q.item_id = p_item_id AND q.user_id = p_user_id AND NOT (a.answers ? q.id::text))
    ) INTO answered;
  END IF;
  eligible := checked_checks = required_checks AND answered AND (required_checks > 0 OR question_count > 0);
  IF legacy AND NOT eligible THEN RETURN true; END IF;
  UPDATE perf_study_roadmap_item SET
    status = CASE WHEN eligible THEN 'completed' ELSE 'in_progress' END,
    completed_at = CASE WHEN eligible THEN coalesce(completed_at, now()) ELSE NULL END,
    updated_at = now()
  WHERE id = p_item_id AND user_id = p_user_id;
  RETURN eligible;
END $$;

CREATE OR REPLACE FUNCTION perf_toggle_study_check(p_item_id uuid, p_group text, p_index integer, p_checked boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); authoritative jsonb; total integer;
BEGIN
  IF uid IS NULL OR p_group NOT IN ('preparation','completion') THEN RAISE EXCEPTION 'Entrada invalida'; END IF;
  SELECT CASE WHEN p_group = 'preparation' THEN preparation_steps ELSE completion_checklist END
    INTO authoritative FROM perf_study_roadmap_item WHERE id = p_item_id AND user_id = uid FOR UPDATE;
  IF authoritative IS NULL THEN RAISE EXCEPTION 'Aula nao encontrada'; END IF;
  total := jsonb_array_length(authoritative);
  IF p_index < 0 OR p_index >= total THEN RAISE EXCEPTION 'Checklist desatualizado'; END IF;
  INSERT INTO perf_study_check_progress(user_id,item_id,check_group,item_index,checked,updated_at)
  VALUES(uid,p_item_id,p_group,p_index,p_checked,now())
  ON CONFLICT(user_id,item_id,check_group,item_index) DO UPDATE SET checked=EXCLUDED.checked,updated_at=now();
  UPDATE perf_study_roadmap_item SET legacy_completion_preserved=false WHERE id=p_item_id AND user_id=uid;
  RETURN perf_recompute_study_item(p_item_id,uid);
END $$;

CREATE OR REPLACE FUNCTION perf_sync_attempt_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE perf_study_roadmap_item SET legacy_completion_preserved=false WHERE id=NEW.item_id AND user_id=NEW.user_id;
  PERFORM perf_recompute_study_item(NEW.item_id,NEW.user_id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS perf_study_attempt_completion_trigger ON perf_study_assessment_attempt;
CREATE TRIGGER perf_study_attempt_completion_trigger AFTER INSERT ON perf_study_assessment_attempt
  FOR EACH ROW EXECUTE FUNCTION perf_sync_attempt_completion();

CREATE OR REPLACE FUNCTION perf_submit_study_attempt(p_item_id uuid, p_answers jsonb)
RETURNS TABLE(correct_count integer,total_count integer,score numeric) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); q record; answer jsonb; v_correct integer := 0; v_total integer := 0; option_count integer; distinct_count integer;
BEGIN
  IF uid IS NULL OR jsonb_typeof(p_answers) <> 'object' OR NOT EXISTS (SELECT 1 FROM perf_study_roadmap_item WHERE id=p_item_id AND user_id=uid) THEN RAISE EXCEPTION 'Avaliacao invalida'; END IF;
  FOR q IN SELECT * FROM perf_study_assessment_question WHERE item_id=p_item_id AND user_id=uid ORDER BY order_index LOOP
    v_total := v_total + 1; answer := p_answers -> q.id::text; option_count := jsonb_array_length(q.options);
    IF answer IS NULL THEN RAISE EXCEPTION 'Responda todas as perguntas'; END IF;
    IF q.question_type='multiple_choice' THEN
      IF jsonb_typeof(answer)<>'number' OR (answer::text)::integer < 0 OR (answer::text)::integer >= option_count THEN RAISE EXCEPTION 'Resposta invalida'; END IF;
      IF (answer::text)::integer=q.correct_option THEN v_correct:=v_correct+1; END IF;
    ELSE
      IF jsonb_typeof(answer)<>'array' OR jsonb_array_length(answer)<>option_count THEN RAISE EXCEPTION 'Ordem invalida'; END IF;
      SELECT count(DISTINCT value::integer) INTO distinct_count FROM jsonb_array_elements_text(answer);
      IF distinct_count<>option_count OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(answer) x WHERE x.value::integer<0 OR x.value::integer>=option_count) THEN RAISE EXCEPTION 'Ordem invalida'; END IF;
      IF answer=q.correct_order THEN v_correct:=v_correct+1; END IF;
    END IF;
  END LOOP;
  IF v_total=0 THEN RAISE EXCEPTION 'Esta etapa nao possui perguntas'; END IF;
  INSERT INTO perf_study_assessment_attempt(user_id,item_id,answers,correct_count,total_count,score)
  VALUES(uid,p_item_id,p_answers,v_correct,v_total,round((v_correct::numeric/v_total::numeric)*100,2));
  RETURN QUERY SELECT v_correct,v_total,round((v_correct::numeric/v_total::numeric)*100,2);
END $$;

CREATE OR REPLACE FUNCTION perf_sync_study_definition_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_item uuid := coalesce(NEW.id, OLD.id); target_user uuid := coalesce(NEW.user_id, OLD.user_id);
BEGIN
  DELETE FROM perf_study_check_progress p WHERE p.item_id=target_item AND p.user_id=target_user AND (
    (p.check_group='preparation' AND p.item_index >= jsonb_array_length(coalesce(NEW.preparation_steps,'[]'::jsonb))) OR
    (p.check_group='completion' AND p.item_index >= jsonb_array_length(coalesce(NEW.completion_checklist,'[]'::jsonb)))
  );
  PERFORM perf_recompute_study_item(target_item,target_user); RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS perf_study_definition_completion_trigger ON perf_study_roadmap_item;
CREATE TRIGGER perf_study_definition_completion_trigger AFTER UPDATE OF preparation_steps, completion_checklist ON perf_study_roadmap_item
  FOR EACH ROW EXECUTE FUNCTION perf_sync_study_definition_change();

CREATE OR REPLACE FUNCTION perf_sync_study_question_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_item uuid := coalesce(NEW.item_id,OLD.item_id); target_user uuid := coalesce(NEW.user_id,OLD.user_id);
BEGIN PERFORM perf_recompute_study_item(target_item,target_user); RETURN coalesce(NEW,OLD); END $$;
DROP TRIGGER IF EXISTS perf_study_question_completion_trigger ON perf_study_assessment_question;
CREATE TRIGGER perf_study_question_completion_trigger AFTER INSERT OR UPDATE OR DELETE ON perf_study_assessment_question
  FOR EACH ROW EXECUTE FUNCTION perf_sync_study_question_change();

ALTER TABLE perf_habit_schedule_period ENABLE ROW LEVEL SECURITY;
ALTER TABLE perf_study_check_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS perf_habit_schedule_period_owner ON perf_habit_schedule_period;
CREATE POLICY perf_habit_schedule_period_owner ON perf_habit_schedule_period FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS perf_study_check_progress_owner ON perf_study_check_progress;
CREATE POLICY perf_study_check_progress_owner ON perf_study_check_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON perf_habit_schedule_period, perf_study_check_progress TO authenticated;
REVOKE ALL ON FUNCTION perf_toggle_study_check(uuid,text,integer,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION perf_toggle_study_check(uuid,text,integer,boolean) TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON perf_study_assessment_attempt FROM authenticated;
REVOKE ALL ON FUNCTION perf_submit_study_attempt(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION perf_submit_study_attempt(uuid,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION perf_recompute_study_item(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION perf_capture_habit_schedule_period() FROM PUBLIC;
REVOKE ALL ON FUNCTION perf_sync_attempt_completion() FROM PUBLIC;
REVOKE ALL ON FUNCTION perf_sync_study_definition_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION perf_sync_study_question_change() FROM PUBLIC;

COMMIT;
NOTIFY pgrst, 'reload schema';
