-- The editorial analyses are already produced manually by Codex during the
-- research run. Copy them into the detail-page cache so no runtime AI API is
-- required for existing news items.
insert into public.yt_article_summaries (
  item_id, source_url, summary_pt_br, key_facts, important_details,
  fetched_at, status, model, updated_at
)
select
  item.id,
  item.url,
  analysis.summary_pt_br,
  coalesce((
    select jsonb_agg(factor->'reason')
    from jsonb_array_elements(analysis.factors) as factor
    where jsonb_typeof(factor->'reason') = 'string'
  ), '[]'::jsonb),
  jsonb_build_array(
    analysis.why_it_matters,
    'Confiabilidade: ' || analysis.reliability || '.',
    'Tipo de evidência: ' || analysis.evidence_type || '.'
  ),
  now(),
  'completed',
  'manual-web-research',
  now()
from public.yt_content_items as item
join public.yt_analyses as analysis on analysis.item_id = item.id
where analysis.provider = 'codex'
on conflict (item_id) do nothing;
