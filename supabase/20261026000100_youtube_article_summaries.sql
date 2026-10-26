create table if not exists public.yt_article_summaries (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.yt_content_items(id) on delete cascade,
  source_url text not null,
  summary_pt_br text not null,
  key_facts jsonb not null default '[]'::jsonb,
  important_details jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now(),
  status text not null default 'completed',
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yt_article_summaries_status_check check (status in ('completed', 'unavailable', 'not_configured', 'failed')),
  constraint yt_article_summaries_key_facts_array_check check (jsonb_typeof(key_facts) = 'array'),
  constraint yt_article_summaries_important_details_array_check check (jsonb_typeof(important_details) = 'array')
);

create unique index if not exists yt_article_summaries_item_id_uidx on public.yt_article_summaries(item_id);
create index if not exists yt_article_summaries_fetched_at_idx on public.yt_article_summaries(fetched_at desc);

alter table public.yt_article_summaries enable row level security;
revoke all on public.yt_article_summaries from anon, authenticated;
grant all on public.yt_article_summaries to service_role;

notify pgrst, 'reload schema';
