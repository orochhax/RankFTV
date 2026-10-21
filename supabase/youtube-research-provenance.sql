-- Proveniência editorial da pesquisa manual do Codex.
-- primary = fonte cadastrada pelo usuário; market = pesquisa de mercado; mixed = combinação.

BEGIN;

ALTER TABLE public.yt_content_items
  ADD COLUMN IF NOT EXISTS source_origin text NOT NULL DEFAULT 'market';
ALTER TABLE public.yt_trends
  ADD COLUMN IF NOT EXISTS source_origin text NOT NULL DEFAULT 'market';
ALTER TABLE public.yt_ideas
  ADD COLUMN IF NOT EXISTS source_origin text NOT NULL DEFAULT 'market';

ALTER TABLE public.yt_content_items
  DROP CONSTRAINT IF EXISTS yt_content_items_source_origin_check;
ALTER TABLE public.yt_content_items
  ADD CONSTRAINT yt_content_items_source_origin_check
  CHECK (source_origin IN ('primary', 'market', 'mixed'));

ALTER TABLE public.yt_trends
  DROP CONSTRAINT IF EXISTS yt_trends_source_origin_check;
ALTER TABLE public.yt_trends
  ADD CONSTRAINT yt_trends_source_origin_check
  CHECK (source_origin IN ('primary', 'market', 'mixed'));

ALTER TABLE public.yt_ideas
  DROP CONSTRAINT IF EXISTS yt_ideas_source_origin_check;
ALTER TABLE public.yt_ideas
  ADD CONSTRAINT yt_ideas_source_origin_check
  CHECK (source_origin IN ('primary', 'market', 'mixed'));

ALTER TABLE public.yt_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yt_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yt_ideas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.yt_content_items, public.yt_trends, public.yt_ideas FROM anon, authenticated;
GRANT ALL ON TABLE public.yt_content_items, public.yt_trends, public.yt_ideas TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
