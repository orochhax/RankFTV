-- Banners editoriais exibidos acima dos campeonatos em destaque na home.
-- A ordem do array define a ordem do carrossel. Uma lista vazia oculta a seção.

ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS home_banners jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.platform_config
  DROP CONSTRAINT IF EXISTS platform_config_home_banners_array;
ALTER TABLE public.platform_config
  ADD CONSTRAINT platform_config_home_banners_array
  CHECK (jsonb_typeof(home_banners) = 'array');

GRANT SELECT (id, home_banners)
  ON public.platform_config TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
