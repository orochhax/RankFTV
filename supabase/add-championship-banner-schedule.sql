-- Banner e datas de cronograma para campeonatos
ALTER TABLE championships ADD COLUMN IF NOT EXISTS banner_url       TEXT;
ALTER TABLE championships ADD COLUMN IF NOT EXISTS prevenda_inicio  DATE;
ALTER TABLE championships ADD COLUMN IF NOT EXISTS prevenda_fim     DATE;

-- Links sociais para páginas (JSON array ordenado)
ALTER TABLE pages ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '[]'::jsonb;
