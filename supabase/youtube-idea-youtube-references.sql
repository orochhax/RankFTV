-- Referências comparáveis do YouTube por ideia editorial.
-- Aplicar depois de supabase/youtube-codex-manual-research.sql.

CREATE TABLE IF NOT EXISTS public.yt_idea_youtube_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.yt_ideas(id) ON DELETE CASCADE,
  research_run_id uuid NOT NULL REFERENCES public.yt_research_runs(id) ON DELETE RESTRICT,
  youtube_video_id text NOT NULL,
  title text NOT NULL,
  channel_name text NOT NULL,
  video_url text NOT NULL,
  published_on date NOT NULL,
  view_count bigint NOT NULL CHECK (view_count >= 0),
  selection_reason text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yt_idea_youtube_references_video_id_check
    CHECK (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  CONSTRAINT yt_idea_youtube_references_url_check
    CHECK (video_url ~ '^https://(www\.)?(youtube\.com|youtu\.be)/'),
  CONSTRAINT yt_idea_youtube_references_idea_video_uidx UNIQUE (idea_id, youtube_video_id)
);

CREATE INDEX IF NOT EXISTS yt_idea_youtube_references_idea_rank_idx
  ON public.yt_idea_youtube_references(idea_id, published_on DESC, view_count DESC);

CREATE OR REPLACE FUNCTION public.yt_apply_codex_youtube_references(
  p_references jsonb,
  p_run_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reference jsonb;
  v_idea_id uuid;
  v_upserted integer := 0;
BEGIN
  IF jsonb_typeof(p_references) <> 'array' THEN
    RAISE EXCEPTION 'YOUTUBE_CODEX_REFERENCES_INVALID_PAYLOAD';
  END IF;

  PERFORM 1
  FROM public.yt_research_runs
  WHERE id = p_run_id AND trigger = 'codex' AND status = 'completed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'YOUTUBE_CODEX_REFERENCES_INVALID_RUN';
  END IF;

  FOR v_reference IN SELECT value FROM jsonb_array_elements(p_references) LOOP
    IF nullif(trim(v_reference->>'sourceFingerprint'), '') IS NULL
      OR nullif(trim(v_reference->>'videoId'), '') IS NULL
      OR nullif(trim(v_reference->>'title'), '') IS NULL
      OR nullif(trim(v_reference->>'channel'), '') IS NULL
      OR nullif(trim(v_reference->>'url'), '') IS NULL
      OR nullif(trim(v_reference->>'publishedOn'), '') IS NULL
      OR nullif(trim(v_reference->>'selectionReason'), '') IS NULL
      OR (v_reference->>'viewCount') !~ '^\d+$' THEN
      RAISE EXCEPTION 'YOUTUBE_CODEX_REFERENCES_INVALID_ENTRY';
    END IF;

    SELECT id INTO v_idea_id
    FROM public.yt_ideas
    WHERE source_fingerprint = v_reference->>'sourceFingerprint';
    IF v_idea_id IS NULL THEN
      RAISE EXCEPTION 'YOUTUBE_CODEX_REFERENCES_IDEA_NOT_FOUND';
    END IF;

    INSERT INTO public.yt_idea_youtube_references(
      idea_id, research_run_id, youtube_video_id, title, channel_name,
      video_url, published_on, view_count, selection_reason, observed_at
    ) VALUES (
      v_idea_id, p_run_id, v_reference->>'videoId', v_reference->>'title', v_reference->>'channel',
      v_reference->>'url', (v_reference->>'publishedOn')::date, (v_reference->>'viewCount')::bigint,
      v_reference->>'selectionReason', now()
    ) ON CONFLICT (idea_id, youtube_video_id) DO UPDATE SET
      research_run_id = EXCLUDED.research_run_id,
      title = EXCLUDED.title,
      channel_name = EXCLUDED.channel_name,
      video_url = EXCLUDED.video_url,
      published_on = EXCLUDED.published_on,
      view_count = EXCLUDED.view_count,
      selection_reason = EXCLUDED.selection_reason,
      observed_at = EXCLUDED.observed_at,
      updated_at = now();
    v_upserted := v_upserted + 1;
  END LOOP;

  RETURN jsonb_build_object('upserted', v_upserted);
END;
$$;

ALTER TABLE public.yt_idea_youtube_references ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.yt_idea_youtube_references FROM anon, authenticated;
GRANT ALL ON TABLE public.yt_idea_youtube_references TO service_role;
REVOKE ALL ON FUNCTION public.yt_apply_codex_youtube_references(jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.yt_apply_codex_youtube_references(jsonb, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
