-- A home (e os editores de destaque) precisam ler quais campeonatos/notícias
-- estão em destaque. Esses IDs ficam em platform_config, mas a tabela inteira
-- está bloqueada pro público porque guarda as TAXAS da plataforma (sensível).
--
-- Solução: liberar leitura pública SÓ das 3 colunas de destaque, via GRANT por
-- coluna. As colunas de taxa continuam inacessíveis pra anon/authenticated —
-- elas só são lidas pelo service_role (lib/platform-config.ts).
--
-- Sem isso, a home cai no fallback (notícias/campeonatos mais recentes) em vez
-- de respeitar a ordem escolhida no painel admin.

grant select (id, destaques_ids, noticias_destaques_ids)
  on public.platform_config to anon, authenticated;

-- Se a tabela tiver RLS ligado, o GRANT por coluna não basta: o RLS também
-- precisa permitir LER a linha. Garante uma policy de leitura pública (a linha
-- fica visível, mas só as colunas liberadas acima são realmente legíveis).
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'platform_config'
      and c.relrowsecurity
  ) and not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'platform_config'
      and policyname = 'config_destaques_public_read'
  ) then
    create policy config_destaques_public_read
      on public.platform_config
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;
