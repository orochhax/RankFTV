-- Hotfix pequeno para o erro "Aula nao encontrada" ao excluir um roadmap.
-- Pode ser executado isoladamente depois de performance-scheduling-study-progress.sql.

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION perf_recompute_study_item(p_item_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE required_checks integer; checked_checks integer; question_count integer; answered boolean; eligible boolean; legacy boolean;
BEGIN
  SELECT jsonb_array_length(preparation_steps) + jsonb_array_length(completion_checklist), legacy_completion_preserved
    INTO required_checks, legacy FROM perf_study_roadmap_item WHERE id = p_item_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
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

CREATE OR REPLACE FUNCTION perf_sync_study_question_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_item uuid; target_user uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_item := OLD.item_id;
    target_user := OLD.user_id;
  ELSE
    target_item := NEW.item_id;
    target_user := NEW.user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM perf_study_roadmap_item WHERE id=target_item AND user_id=target_user) THEN
    PERFORM perf_recompute_study_item(target_item,target_user);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION perf_recompute_study_item(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION perf_sync_study_question_change() FROM PUBLIC;

COMMIT;
NOTIFY pgrst, 'reload schema';
