-- Quatro enquadramentos editoriais obrigatórios para cada ideia do Pulso.AI.

CREATE TABLE IF NOT EXISTS public.yt_idea_approaches (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idea_id uuid NOT NULL REFERENCES public.yt_ideas(id) ON DELETE CASCADE,
  research_run_id uuid NOT NULL REFERENCES public.yt_research_runs(id) ON DELETE RESTRICT,
  approach_key text NOT NULL,
  position smallint NOT NULL,
  title text NOT NULL,
  explanation text NOT NULL,
  promise text NOT NULL,
  demonstration text NOT NULL,
  why_it_works text NOT NULL,
  timeliness text NOT NULL,
  longevity text NOT NULL,
  requirements_summary text NOT NULL,
  score smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yt_idea_approaches_key_check CHECK (
    approach_key IN ('noticia_explicacao', 'tutorial_aplicacao', 'transformacao_beneficio', 'experimento_historia')
  ),
  CONSTRAINT yt_idea_approaches_position_check CHECK (position BETWEEN 1 AND 4),
  CONSTRAINT yt_idea_approaches_score_check CHECK (score BETWEEN 0 AND 100),
  CONSTRAINT yt_idea_approaches_idea_key_uidx UNIQUE (idea_id, approach_key),
  CONSTRAINT yt_idea_approaches_idea_position_uidx UNIQUE (idea_id, position)
);

CREATE INDEX IF NOT EXISTS yt_idea_approaches_idea_score_idx
  ON public.yt_idea_approaches(idea_id, score DESC);

CREATE OR REPLACE FUNCTION public.yt_apply_codex_idea_approaches(
  p_approaches jsonb,
  p_run_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approach jsonb;
  v_idea_id uuid;
  v_position smallint;
  v_upserted integer := 0;
BEGIN
  IF jsonb_typeof(p_approaches) <> 'array' THEN
    RAISE EXCEPTION 'YOUTUBE_CODEX_APPROACHES_INVALID_PAYLOAD';
  END IF;

  PERFORM 1
  FROM public.yt_research_runs
  WHERE id = p_run_id AND trigger = 'codex' AND status = 'completed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'YOUTUBE_CODEX_APPROACHES_INVALID_RUN';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT value->>'sourceFingerprint' AS fingerprint,
        count(*) AS total,
        count(DISTINCT value->>'approachKey') AS distinct_keys
      FROM jsonb_array_elements(p_approaches)
      GROUP BY value->>'sourceFingerprint'
    ) grouped
    WHERE fingerprint IS NULL OR total <> 4 OR distinct_keys <> 4
  ) THEN
    RAISE EXCEPTION 'YOUTUBE_CODEX_APPROACHES_INCOMPLETE_SET';
  END IF;

  FOR v_approach IN SELECT value FROM jsonb_array_elements(p_approaches) LOOP
    IF nullif(trim(v_approach->>'sourceFingerprint'), '') IS NULL
      OR nullif(trim(v_approach->>'approachKey'), '') IS NULL
      OR nullif(trim(v_approach->>'title'), '') IS NULL
      OR nullif(trim(v_approach->>'explanation'), '') IS NULL
      OR nullif(trim(v_approach->>'promise'), '') IS NULL
      OR nullif(trim(v_approach->>'demonstration'), '') IS NULL
      OR nullif(trim(v_approach->>'whyItWorks'), '') IS NULL
      OR nullif(trim(v_approach->>'timeliness'), '') IS NULL
      OR nullif(trim(v_approach->>'longevity'), '') IS NULL
      OR nullif(trim(v_approach->>'requirementsSummary'), '') IS NULL
      OR (v_approach->>'score') !~ '^\d+$' THEN
      RAISE EXCEPTION 'YOUTUBE_CODEX_APPROACHES_INVALID_ENTRY';
    END IF;

    v_position := CASE v_approach->>'approachKey'
      WHEN 'noticia_explicacao' THEN 1
      WHEN 'tutorial_aplicacao' THEN 2
      WHEN 'transformacao_beneficio' THEN 3
      WHEN 'experimento_historia' THEN 4
      ELSE NULL
    END;
    IF v_position IS NULL THEN
      RAISE EXCEPTION 'YOUTUBE_CODEX_APPROACHES_INVALID_KEY';
    END IF;

    SELECT id INTO v_idea_id
    FROM public.yt_ideas
    WHERE source_fingerprint = v_approach->>'sourceFingerprint';
    IF v_idea_id IS NULL THEN
      RAISE EXCEPTION 'YOUTUBE_CODEX_APPROACHES_IDEA_NOT_FOUND';
    END IF;

    INSERT INTO public.yt_idea_approaches(
      idea_id, research_run_id, approach_key, position, title, explanation,
      promise, demonstration, why_it_works, timeliness, longevity,
      requirements_summary, score
    ) VALUES (
      v_idea_id, p_run_id, v_approach->>'approachKey', v_position,
      v_approach->>'title', v_approach->>'explanation', v_approach->>'promise',
      v_approach->>'demonstration', v_approach->>'whyItWorks',
      v_approach->>'timeliness', v_approach->>'longevity',
      v_approach->>'requirementsSummary', (v_approach->>'score')::smallint
    ) ON CONFLICT (idea_id, approach_key) DO UPDATE SET
      research_run_id = EXCLUDED.research_run_id,
      position = EXCLUDED.position,
      title = EXCLUDED.title,
      explanation = EXCLUDED.explanation,
      promise = EXCLUDED.promise,
      demonstration = EXCLUDED.demonstration,
      why_it_works = EXCLUDED.why_it_works,
      timeliness = EXCLUDED.timeliness,
      longevity = EXCLUDED.longevity,
      requirements_summary = EXCLUDED.requirements_summary,
      score = EXCLUDED.score,
      updated_at = now();
    v_upserted := v_upserted + 1;
  END LOOP;

  RETURN jsonb_build_object('upserted', v_upserted);
END;
$$;

ALTER TABLE public.yt_idea_approaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yt_idea_approaches FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.yt_idea_approaches FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.yt_idea_approaches TO service_role;
REVOKE ALL ON FUNCTION public.yt_apply_codex_idea_approaches(jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.yt_apply_codex_idea_approaches(jsonb, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
