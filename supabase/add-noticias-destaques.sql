-- IDs (em ordem) das até 3 notícias em destaque no carrossel da home.
-- Se vazio, a home cai no fallback: as 3 notícias mais recentes.
ALTER TABLE platform_config
  ADD COLUMN IF NOT EXISTS noticias_destaques_ids TEXT[] NOT NULL DEFAULT '{}';
