-- Evolução incremental do Pulso.AI para pesquisas manuais assistidas pelo Codex.
-- Não remove dados nem depende de provedor de IA pago.

ALTER TABLE public.yt_research_runs
  DROP CONSTRAINT IF EXISTS yt_research_runs_trigger_check;
ALTER TABLE public.yt_research_runs
  ADD CONSTRAINT yt_research_runs_trigger_check
  CHECK (trigger IN ('manual', 'scheduled', 'reprocess', 'codex'));
ALTER TABLE public.yt_research_runs
  ADD COLUMN IF NOT EXISTS payload_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS yt_research_runs_codex_payload_hash_uidx
  ON public.yt_research_runs(payload_hash)
  WHERE trigger = 'codex' AND payload_hash IS NOT NULL;

ALTER TABLE public.yt_content_items
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS editorial_subject text,
  ADD COLUMN IF NOT EXISTS source_origin text NOT NULL DEFAULT 'market';
ALTER TABLE public.yt_content_items DROP CONSTRAINT IF EXISTS yt_content_items_source_origin_check;
ALTER TABLE public.yt_content_items ADD CONSTRAINT yt_content_items_source_origin_check CHECK (source_origin IN ('primary', 'market', 'mixed'));

CREATE TABLE IF NOT EXISTS public.yt_content_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.yt_research_runs(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.yt_content_items(id) ON DELETE CASCADE,
  observation text NOT NULL,
  source_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yt_content_observations_urls_check CHECK (jsonb_typeof(source_urls) = 'array'),
  CONSTRAINT yt_content_observations_run_item_uidx UNIQUE (run_id, item_id)
);
CREATE INDEX IF NOT EXISTS yt_content_observations_item_created_idx
  ON public.yt_content_observations(item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.yt_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_key text NOT NULL UNIQUE,
  topic text NOT NULL,
  state text NOT NULL DEFAULT 'emergente',
  current_score integer NOT NULL,
  confidence_score integer NOT NULL,
  first_identified_at timestamptz NOT NULL DEFAULT now(),
  last_evaluated_at timestamptz NOT NULL DEFAULT now(),
  current_position integer,
  best_position integer,
  latest_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_origin text NOT NULL DEFAULT 'market',
  CONSTRAINT yt_trends_state_check CHECK (state IN ('em_alta', 'emergente', 'estavel', 'perdendo_forca', 'atemporal', 'desatualizado', 'arquivado')),
  CONSTRAINT yt_trends_score_check CHECK (current_score BETWEEN 0 AND 100 AND confidence_score BETWEEN 0 AND 100),
  CONSTRAINT yt_trends_evidence_check CHECK (jsonb_typeof(latest_evidence) = 'array')
);
CREATE INDEX IF NOT EXISTS yt_trends_active_rank_idx
  ON public.yt_trends(current_score DESC, last_evaluated_at DESC)
  WHERE state NOT IN ('arquivado', 'desatualizado');
ALTER TABLE public.yt_trends DROP CONSTRAINT IF EXISTS yt_trends_source_origin_check;
ALTER TABLE public.yt_trends ADD CONSTRAINT yt_trends_source_origin_check CHECK (source_origin IN ('primary', 'market', 'mixed'));

CREATE TABLE IF NOT EXISTS public.yt_trend_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.yt_research_runs(id) ON DELETE CASCADE,
  trend_id uuid NOT NULL REFERENCES public.yt_trends(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  confidence_score integer NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  state text NOT NULL CHECK (state IN ('em_alta', 'emergente', 'estavel', 'perdendo_forca', 'atemporal', 'desatualizado', 'arquivado')),
  position integer,
  rationale text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yt_trend_evaluations_evidence_check CHECK (jsonb_typeof(evidence) = 'array'),
  CONSTRAINT yt_trend_evaluations_run_trend_uidx UNIQUE (run_id, trend_id)
);
CREATE INDEX IF NOT EXISTS yt_trend_evaluations_trend_created_idx
  ON public.yt_trend_evaluations(trend_id, created_at DESC);

ALTER TABLE public.yt_ideas
  ADD COLUMN IF NOT EXISTS editorial_state text NOT NULL DEFAULT 'emergente',
  ADD COLUMN IF NOT EXISTS current_rank integer,
  ADD COLUMN IF NOT EXISTS best_rank integer,
  ADD COLUMN IF NOT EXISTS last_evaluated_at timestamptz,
  ADD COLUMN IF NOT EXISTS title_locked_by_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_origin text NOT NULL DEFAULT 'market';
ALTER TABLE public.yt_ideas DROP CONSTRAINT IF EXISTS yt_ideas_source_origin_check;
ALTER TABLE public.yt_ideas ADD CONSTRAINT yt_ideas_source_origin_check CHECK (source_origin IN ('primary', 'market', 'mixed'));
ALTER TABLE public.yt_ideas
  DROP CONSTRAINT IF EXISTS yt_ideas_editorial_state_check;
ALTER TABLE public.yt_ideas
  ADD CONSTRAINT yt_ideas_editorial_state_check
  CHECK (editorial_state IN ('em_alta', 'emergente', 'estavel', 'perdendo_forca', 'atemporal', 'desatualizado', 'arquivado'));
CREATE INDEX IF NOT EXISTS yt_ideas_active_rank_idx
  ON public.yt_ideas(score DESC, updated_at DESC)
  WHERE status NOT IN ('published', 'discarded') AND editorial_state NOT IN ('arquivado', 'desatualizado');

CREATE TABLE IF NOT EXISTS public.yt_idea_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.yt_research_runs(id) ON DELETE CASCADE,
  idea_id uuid NOT NULL REFERENCES public.yt_ideas(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  confidence_score integer NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  rank_position integer,
  rank_delta integer,
  change_kind text NOT NULL CHECK (change_kind IN ('nova', 'subiu', 'caiu', 'estavel', 'reavaliar')),
  rationale text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yt_idea_evaluations_evidence_check CHECK (jsonb_typeof(evidence) = 'array'),
  CONSTRAINT yt_idea_evaluations_run_idea_uidx UNIQUE (run_id, idea_id)
);
CREATE INDEX IF NOT EXISTS yt_idea_evaluations_idea_created_idx
  ON public.yt_idea_evaluations(idea_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.yt_research_run_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.yt_research_runs(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('content', 'trend', 'idea')),
  entity_id uuid NOT NULL,
  change_kind text NOT NULL,
  previous_score integer,
  current_score integer,
  previous_position integer,
  current_position integer,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yt_research_run_changes_details_check CHECK (jsonb_typeof(details) = 'object')
);
CREATE INDEX IF NOT EXISTS yt_research_run_changes_run_idx
  ON public.yt_research_run_changes(run_id, entity_type);

INSERT INTO public.yt_sources(name, kind, url, category, language, enabled)
VALUES ('Pesquisa manual do Codex', 'api', 'https://www.rankftv.com/admin/youtube/codex-manual', 'pesquisa-manual', 'pt-BR', false)
ON CONFLICT (url) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

CREATE OR REPLACE FUNCTION public.yt_apply_codex_research(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_source_id uuid;
  v_item jsonb;
  v_trend jsonb;
  v_idea jsonb;
  v_item_id uuid;
  v_trend_id uuid;
  v_idea_id uuid;
  v_previous_score integer;
  v_previous_rank integer;
  v_rank integer := 0;
  v_new_content integer := 0;
  v_updated_content integer := 0;
  v_new_trends integer := 0;
  v_new_ideas integer := 0;
  v_payload_hash text;
  v_url text;
  v_hash text;
  v_now timestamptz := now();
BEGIN
  IF jsonb_typeof(payload) <> 'object'
    OR jsonb_typeof(coalesce(payload->'items', '[]'::jsonb)) <> 'array'
    OR jsonb_typeof(coalesce(payload->'trends', '[]'::jsonb)) <> 'array'
    OR jsonb_typeof(coalesce(payload->'ideas', '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'YOUTUBE_CODEX_IMPORT_INVALID_PAYLOAD';
  END IF;

  SELECT id INTO v_source_id
  FROM public.yt_sources
  WHERE url = 'https://www.rankftv.com/admin/youtube/codex-manual';
  IF v_source_id IS NULL THEN RAISE EXCEPTION 'YOUTUBE_CODEX_SOURCE_NOT_FOUND'; END IF;

  v_payload_hash := nullif(payload->>'idempotencyKey', '');
  IF v_payload_hash IS NULL THEN RAISE EXCEPTION 'YOUTUBE_CODEX_IMPORT_MISSING_IDEMPOTENCY_KEY'; END IF;
  SELECT id INTO v_run_id FROM public.yt_research_runs
  WHERE trigger = 'codex' AND payload_hash = v_payload_hash AND status = 'completed'
  ORDER BY started_at DESC LIMIT 1;
  IF v_run_id IS NOT NULL THEN
    RETURN jsonb_build_object('runId', v_run_id, 'idempotent', true, 'newContent', 0, 'updatedContent', 0, 'newTrends', 0, 'newIdeas', 0);
  END IF;

  INSERT INTO public.yt_research_runs(trigger, status, started_at, payload_hash)
  VALUES ('codex', 'running', v_now, v_payload_hash)
  RETURNING id INTO v_run_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(payload->'items', '[]'::jsonb)) LOOP
    v_url := nullif(trim(v_item->>'url'), '');
    v_hash := nullif(trim(v_item->>'contentHash'), '');
    IF v_url IS NULL OR v_hash IS NULL OR nullif(trim(v_item->>'title'), '') IS NULL THEN
      RAISE EXCEPTION 'YOUTUBE_CODEX_IMPORT_INVALID_ITEM';
    END IF;

    SELECT id INTO v_item_id FROM public.yt_content_items WHERE content_hash = v_hash;
    IF v_item_id IS NULL THEN
      INSERT INTO public.yt_content_items(
        source_id, run_id, title, summary, url, canonical_url, content_hash, language,
        category, entity, published_at, collected_at, last_verified_at, editorial_subject, source_origin, raw
      ) VALUES (
        v_source_id, v_run_id, v_item->>'title', nullif(v_item->>'summary', ''), v_url, v_url, v_hash,
        coalesce(nullif(v_item->>'language', ''), 'en'), coalesce(nullif(v_item->>'category', ''), 'geral'),
        nullif(v_item->>'entity', ''), nullif(v_item->>'publishedAt', '')::timestamptz, v_now, v_now,
        nullif(v_item->>'subject', ''), coalesce(nullif(v_item->>'sourceOrigin', ''), 'market'), coalesce(v_item->'raw', '{}'::jsonb)
      ) RETURNING id INTO v_item_id;
      v_new_content := v_new_content + 1;
    ELSE
      UPDATE public.yt_content_items
      SET last_verified_at = v_now,
          editorial_subject = coalesce(nullif(v_item->>'subject', ''), editorial_subject),
          source_origin = coalesce(nullif(v_item->>'sourceOrigin', ''), source_origin),
          raw = raw || coalesce(v_item->'raw', '{}'::jsonb)
      WHERE id = v_item_id;
      v_updated_content := v_updated_content + 1;
    END IF;

    INSERT INTO public.yt_content_observations(run_id, item_id, observation, source_urls)
    VALUES (v_run_id, v_item_id, coalesce(nullif(v_item->>'observation', ''), 'Confirmado na pesquisa manual do Codex.'), coalesce(v_item->'sourceUrls', '[]'::jsonb))
    ON CONFLICT (run_id, item_id) DO NOTHING;

    INSERT INTO public.yt_analyses(
      item_id, provider, model, summary_pt_br, why_it_matters, reliability,
      relevance_score, novelty_score, urgency_score, opportunity_score, confidence_score,
      evidence_type, factors
    ) VALUES (
      v_item_id, 'codex', 'manual-web-research',
      coalesce(nullif(v_item->>'summaryPtBr', ''), coalesce(nullif(v_item->>'summary', ''), v_item->>'title')),
      coalesce(nullif(v_item->>'whyItMatters', ''), 'Acompanhar a fonte original antes de gravar.'),
      coalesce(nullif(v_item->>'reliability', ''), 'confirmed'),
      coalesce((v_item->>'relevanceScore')::integer, 50), coalesce((v_item->>'noveltyScore')::integer, 50),
      coalesce((v_item->>'urgencyScore')::integer, 50), coalesce((v_item->>'opportunityScore')::integer, 50),
      coalesce((v_item->>'confidenceScore')::integer, 50), coalesce(nullif(v_item->>'evidenceType', ''), 'qualitative'),
      coalesce(v_item->'factors', '[]'::jsonb)
    ) ON CONFLICT (item_id) DO UPDATE SET
      summary_pt_br = EXCLUDED.summary_pt_br, why_it_matters = EXCLUDED.why_it_matters,
      reliability = EXCLUDED.reliability, relevance_score = EXCLUDED.relevance_score,
      novelty_score = EXCLUDED.novelty_score, urgency_score = EXCLUDED.urgency_score,
      opportunity_score = EXCLUDED.opportunity_score, confidence_score = EXCLUDED.confidence_score,
      evidence_type = EXCLUDED.evidence_type, factors = EXCLUDED.factors;
  END LOOP;

  FOR v_trend IN SELECT value FROM jsonb_array_elements(coalesce(payload->'trends', '[]'::jsonb)) LOOP
    IF nullif(trim(v_trend->>'topicKey'), '') IS NULL OR nullif(trim(v_trend->>'topic'), '') IS NULL THEN
      RAISE EXCEPTION 'YOUTUBE_CODEX_IMPORT_INVALID_TREND';
    END IF;
    SELECT id, current_score, current_position INTO v_trend_id, v_previous_score, v_previous_rank
    FROM public.yt_trends WHERE topic_key = v_trend->>'topicKey';
    IF v_trend_id IS NULL THEN
      INSERT INTO public.yt_trends(topic_key, topic, state, current_score, confidence_score, latest_evidence, source_origin)
      VALUES (v_trend->>'topicKey', v_trend->>'topic', coalesce(v_trend->>'state', 'emergente'),
        (v_trend->>'score')::integer, (v_trend->>'confidenceScore')::integer, coalesce(v_trend->'evidence', '[]'::jsonb),
        coalesce(nullif(v_trend->>'sourceOrigin', ''), 'market'))
      RETURNING id INTO v_trend_id;
      v_new_trends := v_new_trends + 1;
    ELSE
      UPDATE public.yt_trends SET topic = v_trend->>'topic', state = coalesce(v_trend->>'state', state),
        current_score = (v_trend->>'score')::integer, confidence_score = (v_trend->>'confidenceScore')::integer,
        latest_evidence = coalesce(v_trend->'evidence', latest_evidence),
        source_origin = coalesce(nullif(v_trend->>'sourceOrigin', ''), source_origin), last_evaluated_at = v_now
      WHERE id = v_trend_id;
    END IF;
    INSERT INTO public.yt_trend_evaluations(run_id, trend_id, score, confidence_score, state, rationale, evidence)
    VALUES (v_run_id, v_trend_id, (v_trend->>'score')::integer, (v_trend->>'confidenceScore')::integer,
      coalesce(v_trend->>'state', 'emergente'), coalesce(v_trend->>'rationale', 'Reavaliação editorial.'), coalesce(v_trend->'evidence', '[]'::jsonb));
    INSERT INTO public.yt_research_run_changes(run_id, entity_type, entity_id, change_kind, previous_score, current_score, previous_position, current_position)
    VALUES (v_run_id, 'trend', v_trend_id, CASE WHEN v_previous_score IS NULL THEN 'nova' WHEN (v_trend->>'score')::integer > v_previous_score THEN 'subiu' WHEN (v_trend->>'score')::integer < v_previous_score THEN 'caiu' ELSE 'estavel' END, v_previous_score, (v_trend->>'score')::integer, v_previous_rank, NULL);
  END LOOP;

  v_rank := 0;
  FOR v_trend_id IN
    SELECT id FROM public.yt_trends
    WHERE state NOT IN ('arquivado', 'desatualizado')
    ORDER BY current_score DESC, last_evaluated_at DESC, first_identified_at ASC
  LOOP
    v_rank := v_rank + 1;
    UPDATE public.yt_trends SET current_position = v_rank,
      best_position = CASE WHEN best_position IS NULL OR v_rank < best_position THEN v_rank ELSE best_position END
    WHERE id = v_trend_id;
    UPDATE public.yt_trend_evaluations SET position = v_rank
    WHERE run_id = v_run_id AND trend_id = v_trend_id;
    UPDATE public.yt_research_run_changes SET current_position = v_rank
    WHERE run_id = v_run_id AND entity_type = 'trend' AND entity_id = v_trend_id;
  END LOOP;

  FOR v_idea IN SELECT value FROM jsonb_array_elements(coalesce(payload->'ideas', '[]'::jsonb)) LOOP
    IF nullif(trim(v_idea->>'sourceFingerprint'), '') IS NULL OR nullif(trim(v_idea->>'title'), '') IS NULL THEN
      RAISE EXCEPTION 'YOUTUBE_CODEX_IMPORT_INVALID_IDEA';
    END IF;
    SELECT id, score, current_rank INTO v_idea_id, v_previous_score, v_previous_rank
    FROM public.yt_ideas WHERE source_fingerprint = v_idea->>'sourceFingerprint';
    IF v_idea_id IS NULL THEN
      INSERT INTO public.yt_ideas(title, alternate_titles, summary, rationale, angle, format, outline, hook, priority, score, confidence_score, source_fingerprint, editorial_state, source_origin, last_evaluated_at)
      VALUES (v_idea->>'title', coalesce(v_idea->'alternateTitles', '[]'::jsonb), v_idea->>'summary', v_idea->>'rationale',
        v_idea->>'angle', v_idea->>'format', coalesce(v_idea->'outline', '[]'::jsonb), v_idea->>'hook', v_idea->>'priority',
        (v_idea->>'score')::integer, (v_idea->>'confidenceScore')::integer, v_idea->>'sourceFingerprint',
        coalesce(v_idea->>'state', 'emergente'), coalesce(nullif(v_idea->>'sourceOrigin', ''), 'market'), v_now)
      RETURNING id INTO v_idea_id;
      v_new_ideas := v_new_ideas + 1;
    ELSE
      UPDATE public.yt_ideas SET
        title = CASE WHEN title_locked_by_user THEN title ELSE v_idea->>'title' END,
        alternate_titles = coalesce(v_idea->'alternateTitles', alternate_titles), summary = v_idea->>'summary',
        rationale = v_idea->>'rationale', angle = v_idea->>'angle', format = v_idea->>'format',
        outline = coalesce(v_idea->'outline', outline), hook = v_idea->>'hook', priority = v_idea->>'priority',
        score = (v_idea->>'score')::integer, confidence_score = (v_idea->>'confidenceScore')::integer,
        editorial_state = coalesce(v_idea->>'state', editorial_state),
        source_origin = coalesce(nullif(v_idea->>'sourceOrigin', ''), source_origin), last_evaluated_at = v_now, updated_at = v_now
      WHERE id = v_idea_id;
    END IF;
    FOR v_url IN SELECT value FROM jsonb_array_elements_text(coalesce(v_idea->'sourceUrls', '[]'::jsonb)) LOOP
      SELECT id INTO v_item_id FROM public.yt_content_items WHERE canonical_url = v_url ORDER BY collected_at DESC LIMIT 1;
      IF v_item_id IS NOT NULL THEN
        INSERT INTO public.yt_idea_sources(idea_id, item_id) VALUES (v_idea_id, v_item_id)
        ON CONFLICT (idea_id, item_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;

  FOR v_idea_id IN
    SELECT id FROM public.yt_ideas
    WHERE status NOT IN ('published', 'discarded') AND editorial_state NOT IN ('arquivado', 'desatualizado')
    ORDER BY score DESC, last_evaluated_at DESC NULLS LAST, created_at ASC
  LOOP
    v_rank := v_rank + 1;
    SELECT current_rank, score INTO v_previous_rank, v_previous_score FROM public.yt_ideas WHERE id = v_idea_id;
    UPDATE public.yt_ideas SET current_rank = v_rank, best_rank = CASE WHEN best_rank IS NULL OR v_rank < best_rank THEN v_rank ELSE best_rank END, updated_at = v_now WHERE id = v_idea_id;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(payload->'ideas', '[]'::jsonb)) value WHERE value->>'sourceFingerprint' = (SELECT source_fingerprint FROM public.yt_ideas WHERE id = v_idea_id)) THEN
      INSERT INTO public.yt_idea_evaluations(run_id, idea_id, score, confidence_score, rank_position, rank_delta, change_kind, rationale, evidence)
      SELECT v_run_id, i.id, i.score, i.confidence_score, v_rank,
        CASE WHEN v_previous_rank IS NULL THEN NULL ELSE v_previous_rank - v_rank END,
        CASE WHEN v_previous_rank IS NULL THEN 'nova' WHEN v_rank < v_previous_rank THEN 'subiu' WHEN v_rank > v_previous_rank THEN 'caiu' ELSE 'estavel' END,
        coalesce(value->>'rationale', i.rationale), coalesce(value->'evidence', '[]'::jsonb)
      FROM public.yt_ideas i, jsonb_array_elements(payload->'ideas') value
      WHERE i.id = v_idea_id AND value->>'sourceFingerprint' = i.source_fingerprint;
      INSERT INTO public.yt_research_run_changes(run_id, entity_type, entity_id, change_kind, previous_score, current_score, previous_position, current_position)
      VALUES (v_run_id, 'idea', v_idea_id, CASE WHEN v_previous_rank IS NULL THEN 'nova' WHEN v_rank < v_previous_rank THEN 'subiu' WHEN v_rank > v_previous_rank THEN 'caiu' ELSE 'estavel' END, v_previous_score, (SELECT score FROM public.yt_ideas WHERE id = v_idea_id), v_previous_rank, v_rank);
    END IF;
  END LOOP;

  UPDATE public.yt_research_runs SET status = 'completed', finished_at = now(),
    found_count = jsonb_array_length(coalesce(payload->'items', '[]'::jsonb)), inserted_count = v_new_content,
    analysed_count = jsonb_array_length(coalesce(payload->'items', '[]'::jsonb)), failed_sources_count = 0,
    error_message = coalesce(nullif(payload->>'summary', ''), null)
  WHERE id = v_run_id;

  RETURN jsonb_build_object('runId', v_run_id, 'idempotent', false, 'newContent', v_new_content, 'updatedContent', v_updated_content, 'newTrends', v_new_trends, 'newIdeas', v_new_ideas);
EXCEPTION WHEN OTHERS THEN
  IF v_run_id IS NOT NULL THEN
    UPDATE public.yt_research_runs SET status = 'failed', finished_at = now(), error_message = left(SQLERRM, 1000) WHERE id = v_run_id;
  END IF;
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.yt_apply_codex_research(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.yt_apply_codex_research(jsonb) TO service_role;

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY current_score DESC, last_evaluated_at DESC, first_identified_at ASC)::integer AS position
  FROM public.yt_trends
  WHERE state NOT IN ('arquivado', 'desatualizado')
)
UPDATE public.yt_trends trend
SET current_position = ranked.position,
    best_position = CASE WHEN trend.best_position IS NULL OR ranked.position < trend.best_position THEN ranked.position ELSE trend.best_position END
FROM ranked
WHERE trend.id = ranked.id;

UPDATE public.yt_trend_evaluations evaluation
SET position = trend.current_position
FROM public.yt_trends trend
WHERE evaluation.trend_id = trend.id AND evaluation.position IS NULL;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'yt_content_observations', 'yt_trends', 'yt_trend_evaluations',
    'yt_idea_evaluations', 'yt_research_run_changes'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
