-- =============================================================
-- NOTÍCIAS — cards de notícia exibidos na home e em /noticias.
--
-- Só o admin (ADMIN_EMAIL) cria/exclui, via service_role (admin client),
-- que ignora o RLS. A leitura é pública (qualquer visitante vê).
--
-- Card mostra: imagem + título + resumo (2 linhas). Ao clicar abre a
-- página completa com o conteúdo.
--
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.
-- =============================================================

create table if not exists public.news (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  resumo      text not null,         -- texto curto do card (~2 linhas)
  conteudo    text not null,         -- conteúdo completo da página
  imagem_url  text,                  -- opcional
  created_at  timestamptz not null default now()
);

-- Ordenação por data (mais recente primeiro) é o acesso mais comum.
create index if not exists news_created_at_idx on public.news (created_at desc);

-- ---- RLS: leitura pública; escrita só via service_role (admin) ----
alter table public.news enable row level security;

drop policy if exists "news_public_read" on public.news;
create policy "news_public_read"
  on public.news for select
  to anon, authenticated
  using (true);

grant select on public.news to anon, authenticated;
grant all    on public.news to service_role;

-- ---- Storage: bucket público das imagens de notícia ----
insert into storage.buckets (id, name, public)
values ('noticias', 'noticias', true)
on conflict (id) do nothing;

drop policy if exists "noticias_public_read" on storage.objects;
create policy "noticias_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'noticias');

drop policy if exists "noticias_auth_write" on storage.objects;
create policy "noticias_auth_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'noticias');

notify pgrst, 'reload schema';
