-- Recalcula o ranking de ideias após uma importação manual completa.
-- A função original reutiliza o contador do ranking de tendências; esta correção
-- incremental zera o ranking de ideias e repara o histórico da execução atual.

CREATE OR REPLACE FUNCTION public.yt_recalculate_codex_idea_ranks(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea_id uuid;
  v_rank integer := 0;
  v_previous_position integer;
  v_previous_score integer;
  v_change_kind text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.yt_research_runs
    WHERE id = p_run_id AND trigger = 'codex' AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'YOUTUBE_CODEX_RANKING_INVALID_RUN';
  END IF;

  FOR v_idea_id IN
    SELECT id
    FROM public.yt_ideas
    WHERE status NOT IN ('published', 'discarded')
      AND editorial_state NOT IN ('arquivado', 'desatualizado')
    ORDER BY score DESC, last_evaluated_at DESC NULLS LAST, created_at ASC
  LOOP
    v_rank := v_rank + 1;

    SELECT previous_position
    INTO v_previous_position
    FROM public.yt_research_run_changes
    WHERE run_id = p_run_id AND entity_type = 'idea' AND entity_id = v_idea_id
    ORDER BY created_at DESC
    LIMIT 1;

    SELECT score
    INTO v_previous_score
    FROM public.yt_idea_evaluations
    WHERE idea_id = v_idea_id AND run_id <> p_run_id
    ORDER BY created_at DESC
    LIMIT 1;

    v_change_kind := CASE
      WHEN v_previous_position IS NULL THEN 'nova'
      WHEN v_rank < v_previous_position THEN 'subiu'
      WHEN v_rank > v_previous_position THEN 'caiu'
      ELSE 'estavel'
    END;

    UPDATE public.yt_ideas
    SET current_rank = v_rank,
        best_rank = CASE WHEN best_rank IS NULL OR v_rank < best_rank THEN v_rank ELSE best_rank END,
        updated_at = now()
    WHERE id = v_idea_id;

    UPDATE public.yt_idea_evaluations
    SET rank_position = v_rank,
        rank_delta = CASE WHEN v_previous_position IS NULL THEN NULL ELSE v_previous_position - v_rank END,
        change_kind = v_change_kind
    WHERE run_id = p_run_id AND idea_id = v_idea_id;

    UPDATE public.yt_research_run_changes
    SET current_position = v_rank,
        change_kind = v_change_kind,
        previous_score = v_previous_score
    WHERE run_id = p_run_id AND entity_type = 'idea' AND entity_id = v_idea_id;
  END LOOP;

  RETURN jsonb_build_object('rankedIdeas', v_rank);
END;
$$;

REVOKE ALL ON FUNCTION public.yt_recalculate_codex_idea_ranks(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.yt_recalculate_codex_idea_ranks(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
