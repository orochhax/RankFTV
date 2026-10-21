-- Cadastro administrável de fontes do Pulso.AI.
-- A remoção é lógica para preservar o histórico de notícias e execuções.

BEGIN;

ALTER TABLE public.yt_sources
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.yt_sources
  DROP CONSTRAINT IF EXISTS yt_sources_kind_check;

ALTER TABLE public.yt_sources
  ADD CONSTRAINT yt_sources_kind_check CHECK (
    kind IN ('site', 'blog', 'youtube', 'x', 'newsletter', 'reddit', 'rss', 'atom', 'api', 'other')
  );

CREATE INDEX IF NOT EXISTS yt_sources_active_name_idx
  ON public.yt_sources(enabled DESC, name)
  WHERE archived_at IS NULL;

-- Os canais fornecidos pelo proprietário já eram referências editoriais.
-- Eles passam a participar do mesmo controle de ativação das demais fontes.
INSERT INTO public.yt_sources(name, kind, url, category, language, enabled)
VALUES
  ('Maestros da IA', 'youtube', 'https://www.youtube.com/@maestrosdaia/videos', 'youtube', 'pt-BR', true),
  ('O Custa João', 'youtube', 'https://www.youtube.com/@ocostajoao/videos', 'youtube', 'pt-BR', true)
ON CONFLICT (url) DO NOTHING;

ALTER TABLE public.yt_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.yt_sources FROM anon, authenticated;
GRANT ALL ON TABLE public.yt_sources TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

