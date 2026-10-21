-- Validação somente leitura após aplicar youtube-content-intelligence.sql.
SELECT to_regclass('public.yt_sources') IS NOT NULL AS sources_exists,
       to_regclass('public.yt_content_items') IS NOT NULL AS content_exists,
       to_regclass('public.yt_ideas') IS NOT NULL AS ideas_exists,
       to_regclass('public.yt_trends') IS NOT NULL AS trends_exists,
       to_regclass('public.yt_idea_evaluations') IS NOT NULL AS idea_history_exists,
       to_regclass('public.yt_trend_evaluations') IS NOT NULL AS trend_history_exists,
       to_regclass('public.yt_idea_youtube_references') IS NOT NULL AS idea_youtube_references_exists;

SELECT count(*) AS seeded_sources,
       count(*) FILTER (WHERE enabled AND archived_at IS NULL) AS enabled_sources,
       count(*) FILTER (WHERE archived_at IS NOT NULL) AS archived_sources
FROM public.yt_sources;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'yt_sources'
  AND column_name = 'archived_at';

SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.yt_sources'::regclass
  AND conname = 'yt_sources_kind_check';

SELECT ai_provider, ai_model, timezone, research_times
FROM public.yt_app_settings
WHERE id = 1;

SELECT trigger, status, started_at, found_count, inserted_count, analysed_count
FROM public.yt_research_runs
ORDER BY started_at DESC
LIMIT 10;

SELECT current_rank, best_rank, title, score, editorial_state, source_origin, last_evaluated_at
FROM public.yt_ideas
WHERE current_rank IS NOT NULL
ORDER BY current_rank;

SELECT idea.title AS idea_title, reference.title AS youtube_title,
       reference.channel_name, reference.published_on, reference.view_count,
       reference.observed_at
FROM public.yt_idea_youtube_references AS reference
JOIN public.yt_ideas AS idea ON idea.id = reference.idea_id
ORDER BY idea.current_rank NULLS LAST, reference.published_on DESC, reference.view_count DESC;

SELECT topic, state, current_score, current_position, best_position, source_origin, last_evaluated_at
FROM public.yt_trends
ORDER BY current_score DESC;

SELECT source_origin, count(*)
FROM public.yt_content_items
GROUP BY source_origin
ORDER BY source_origin;

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'yt_%'
ORDER BY tablename;

SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name LIKE 'yt_%'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;
