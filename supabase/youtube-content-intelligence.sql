-- Pulso.AI / inteligência de conteúdo para YouTube.
-- Módulo privado do CEO em /admin/youtube.
-- Todas as tabelas usam o prefixo yt_ para permanecerem isoladas do domínio RankFTV.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.yt_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL,
  url text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  language text NOT NULL DEFAULT 'en',
  enabled boolean NOT NULL DEFAULT true,
  requires_key boolean NOT NULL DEFAULT false,
  last_success_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yt_sources_kind_check CHECK (kind IN ('rss', 'atom', 'api'))
);
CREATE UNIQUE INDEX IF NOT EXISTS yt_sources_url_uidx ON public.yt_sources(url);
CREATE INDEX IF NOT EXISTS yt_sources_enabled_kind_idx ON public.yt_sources(enabled, kind);

CREATE TABLE IF NOT EXISTS public.yt_research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger text NOT NULL,
  schedule_key text,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  found_count integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  analysed_count integer NOT NULL DEFAULT 0,
  failed_sources_count integer NOT NULL DEFAULT 0,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  error_message text,
  CONSTRAINT yt_research_runs_status_check CHECK (status IN ('running', 'completed', 'partial', 'failed', 'skipped')),
  CONSTRAINT yt_research_runs_trigger_check CHECK (trigger IN ('manual', 'scheduled', 'reprocess')),
  CONSTRAINT yt_research_runs_counts_check CHECK (
    found_count >= 0 AND inserted_count >= 0 AND analysed_count >= 0
    AND failed_sources_count >= 0 AND input_tokens >= 0 AND output_tokens >= 0
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS yt_research_runs_schedule_key_uidx
  ON public.yt_research_runs(schedule_key) WHERE schedule_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS yt_research_runs_single_running_uidx
  ON public.yt_research_runs((true)) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS yt_research_runs_started_at_idx ON public.yt_research_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS public.yt_source_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.yt_research_runs(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.yt_sources(id) ON DELETE CASCADE,
  attempt integer NOT NULL DEFAULT 1 CHECK (attempt > 0),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS yt_source_failures_run_id_idx ON public.yt_source_failures(run_id);
CREATE INDEX IF NOT EXISTS yt_source_failures_source_id_idx ON public.yt_source_failures(source_id);

CREATE TABLE IF NOT EXISTS public.yt_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.yt_sources(id) ON DELETE RESTRICT,
  run_id uuid REFERENCES public.yt_research_runs(id) ON DELETE SET NULL,
  title text NOT NULL,
  summary text,
  url text NOT NULL,
  canonical_url text NOT NULL,
  content_hash text NOT NULL,
  author text,
  language text NOT NULL DEFAULT 'en',
  category text NOT NULL DEFAULT 'geral',
  entity text,
  country text,
  published_at timestamptz,
  collected_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT yt_content_items_raw_object_check CHECK (jsonb_typeof(raw) = 'object')
);
CREATE UNIQUE INDEX IF NOT EXISTS yt_content_items_content_hash_uidx ON public.yt_content_items(content_hash);
CREATE INDEX IF NOT EXISTS yt_content_items_collected_at_idx ON public.yt_content_items(collected_at DESC);
CREATE INDEX IF NOT EXISTS yt_content_items_published_at_idx ON public.yt_content_items(published_at DESC);
CREATE INDEX IF NOT EXISTS yt_content_items_source_published_idx ON public.yt_content_items(source_id, published_at DESC);
CREATE INDEX IF NOT EXISTS yt_content_items_run_id_idx ON public.yt_content_items(run_id);

CREATE TABLE IF NOT EXISTS public.yt_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.yt_content_items(id) ON DELETE CASCADE,
  provider text NOT NULL,
  model text NOT NULL,
  summary_pt_br text NOT NULL,
  why_it_matters text NOT NULL,
  reliability text NOT NULL,
  relevance_score integer NOT NULL,
  novelty_score integer NOT NULL,
  urgency_score integer NOT NULL,
  opportunity_score integer NOT NULL,
  confidence_score integer NOT NULL,
  evidence_type text NOT NULL,
  factors jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yt_analyses_scores_check CHECK (
    relevance_score BETWEEN 0 AND 100 AND novelty_score BETWEEN 0 AND 100
    AND urgency_score BETWEEN 0 AND 100 AND opportunity_score BETWEEN 0 AND 100
    AND confidence_score BETWEEN 0 AND 100
  ),
  CONSTRAINT yt_analyses_reliability_check CHECK (reliability IN ('confirmed', 'rumor', 'interpretation', 'insufficient')),
  CONSTRAINT yt_analyses_evidence_check CHECK (evidence_type IN ('quantitative', 'qualitative', 'mixed')),
  CONSTRAINT yt_analyses_factors_array_check CHECK (jsonb_typeof(factors) = 'array')
);
CREATE UNIQUE INDEX IF NOT EXISTS yt_analyses_item_id_uidx ON public.yt_analyses(item_id);
CREATE INDEX IF NOT EXISTS yt_analyses_opportunity_created_idx ON public.yt_analyses(opportunity_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS yt_analyses_urgency_idx ON public.yt_analyses(urgency_score DESC);

CREATE TABLE IF NOT EXISTS public.yt_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  alternate_titles jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text NOT NULL,
  rationale text NOT NULL,
  angle text NOT NULL,
  format text NOT NULL,
  outline jsonb NOT NULL DEFAULT '[]'::jsonb,
  hook text NOT NULL,
  priority text NOT NULL,
  score integer NOT NULL,
  confidence_score integer NOT NULL,
  status text NOT NULL DEFAULT 'identified',
  notes text,
  source_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yt_ideas_status_check CHECK (status IN ('identified', 'saved', 'researching', 'scripting', 'ready', 'recording', 'editing', 'published', 'discarded')),
  CONSTRAINT yt_ideas_score_check CHECK (score BETWEEN 0 AND 100 AND confidence_score BETWEEN 0 AND 100),
  CONSTRAINT yt_ideas_alternate_titles_array_check CHECK (jsonb_typeof(alternate_titles) = 'array'),
  CONSTRAINT yt_ideas_outline_array_check CHECK (jsonb_typeof(outline) = 'array')
);
CREATE UNIQUE INDEX IF NOT EXISTS yt_ideas_source_fingerprint_uidx ON public.yt_ideas(source_fingerprint);
CREATE INDEX IF NOT EXISTS yt_ideas_status_updated_idx ON public.yt_ideas(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.yt_idea_sources (
  idea_id uuid NOT NULL REFERENCES public.yt_ideas(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.yt_content_items(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, item_id)
);
CREATE INDEX IF NOT EXISTS yt_idea_sources_item_id_idx ON public.yt_idea_sources(item_id);

CREATE TABLE IF NOT EXISTS public.yt_app_settings (
  id integer PRIMARY KEY DEFAULT 1,
  ai_provider text NOT NULL DEFAULT 'openai',
  ai_model text NOT NULL DEFAULT 'gpt-5-mini',
  timezone text NOT NULL DEFAULT 'America/Bahia',
  research_times jsonb NOT NULL DEFAULT '["08:00", "14:00", "20:00"]'::jsonb,
  languages jsonb NOT NULL DEFAULT '["pt", "en"]'::jsonb,
  keywords jsonb NOT NULL DEFAULT '["inteligência artificial", "AI", "LLM", "agentes de IA"]'::jsonb,
  max_items_per_source integer NOT NULL DEFAULT 20,
  max_ai_analyses_per_run integer NOT NULL DEFAULT 8,
  monthly_budget_usd_micros bigint NOT NULL DEFAULT 5000000,
  scoring_weights jsonb NOT NULL DEFAULT '{"novelty":20,"impact":20,"audience":15,"momentum":10,"lowCompetition":5,"brazilRelevance":15,"demonstrability":5,"urgency":10}'::jsonb,
  editorial_profile text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yt_app_settings_singleton_check CHECK (id = 1),
  CONSTRAINT yt_app_settings_provider_check CHECK (ai_provider IN ('none', 'openai')),
  CONSTRAINT yt_app_settings_limits_check CHECK (
    max_items_per_source BETWEEN 5 AND 100 AND max_ai_analyses_per_run BETWEEN 0 AND 50
    AND monthly_budget_usd_micros >= 0
  ),
  CONSTRAINT yt_app_settings_json_check CHECK (
    jsonb_typeof(research_times) = 'array' AND jsonb_typeof(languages) = 'array'
    AND jsonb_typeof(keywords) = 'array' AND jsonb_typeof(scoring_weights) = 'object'
  )
);

CREATE TABLE IF NOT EXISTS public.yt_channel_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  kind text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS yt_channel_references_url_uidx ON public.yt_channel_references(url);

ALTER TABLE public.yt_channel_references
  ADD COLUMN IF NOT EXISTS name text;

INSERT INTO public.yt_app_settings(id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.yt_sources(name, kind, url, category, language, enabled) VALUES
  ('OpenAI News', 'rss', 'https://openai.com/news/rss.xml', 'empresas', 'en', true),
  ('Anthropic News (pendente de feed oficial)', 'api', 'https://www.anthropic.com/news', 'empresas', 'en', false),
  ('Google DeepMind', 'rss', 'https://deepmind.google/blog/rss.xml', 'pesquisa', 'en', true),
  ('Hugging Face Blog', 'rss', 'https://huggingface.co/blog/feed.xml', 'open-source', 'en', true),
  ('GitHub AI & ML', 'rss', 'https://github.blog/ai-and-ml/feed/', 'desenvolvimento', 'en', true),
  ('Microsoft Research', 'rss', 'https://www.microsoft.com/en-us/research/feed/', 'pesquisa', 'en', true),
  ('NVIDIA AI', 'rss', 'https://blogs.nvidia.com/blog/category/deep-learning/feed/', 'infraestrutura', 'en', true),
  ('arXiv cs.AI', 'atom', 'https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=30', 'pesquisa', 'en', true),
  ('Hacker News', 'api', 'https://hacker-news.firebaseio.com/v0/newstories.json', 'comunidade', 'en', true)
ON CONFLICT (url) DO UPDATE SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  category = EXCLUDED.category,
  language = EXCLUDED.language,
  enabled = EXCLUDED.enabled,
  updated_at = now();

DELETE FROM public.yt_channel_references
WHERE url NOT IN (
  'https://www.youtube.com/@iamAImaster/videos',
  'https://www.youtube.com/@BenAI92/videos',
  'https://www.youtube.com/@BrockMesarich/videos',
  'https://www.youtube.com/@obrunookamoto/videos',
  'https://www.youtube.com/@deborahfolloni/videos',
  'https://www.youtube.com/@harry.the.marketer/videos',
  'https://www.youtube.com/@ImanGadzhi/videos',
  'https://www.youtube.com/@Orafavoss/videos',
  'https://www.youtube.com/@Sanji_Chien/videos',
  'https://www.youtube.com/@VictorBaggio-AI/videos',
  'https://www.youtube.com/@maestrosdaia/videos'
);

INSERT INTO public.yt_channel_references(name, url, kind, notes) VALUES
  ('AI Master', 'https://www.youtube.com/@iamAImaster/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Ben AI', 'https://www.youtube.com/@BenAI92/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Brock Mesarich | AI for Non Techies', 'https://www.youtube.com/@BrockMesarich/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Bruno Okamoto', 'https://www.youtube.com/@obrunookamoto/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Deborah Folloni', 'https://www.youtube.com/@deborahfolloni/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Harry Long', 'https://www.youtube.com/@harry.the.marketer/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Iman Gadzhi', 'https://www.youtube.com/@ImanGadzhi/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Rafa Voss | IA na Prática', 'https://www.youtube.com/@Orafavoss/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Sanji Nai-Chien', 'https://www.youtube.com/@Sanji_Chien/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Victor Baggio | IA para Vendas', 'https://www.youtube.com/@VictorBaggio-AI/videos', 'channel', 'Canal de referência definido pelo proprietário.'),
  ('Maestros da IA', 'https://www.youtube.com/@maestrosdaia/videos', 'channel', 'Canal de referência definido pelo proprietário.')
ON CONFLICT (url) DO UPDATE SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  notes = EXCLUDED.notes;

ALTER TABLE public.yt_channel_references
  ALTER COLUMN name SET NOT NULL;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'yt_sources', 'yt_research_runs', 'yt_source_failures', 'yt_content_items',
    'yt_analyses', 'yt_ideas', 'yt_idea_sources', 'yt_app_settings', 'yt_channel_references'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
