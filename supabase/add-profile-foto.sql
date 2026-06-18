-- =============================================================
-- RANKFTV — foto_url no perfil + campos de link no ranking
-- Execute no Supabase SQL Editor.
-- =============================================================

-- Foto de perfil (upload via Storage; null = usa iniciais no Avatar)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS foto_url text;

-- Ranking individual: username e foto para linkar pro perfil da plataforma
-- (fica null para atletas externos da Liga Brasileira; preenchido quando o
--  atleta também tem conta na plataforma)
ALTER TABLE ranking_individual ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE ranking_individual ADD COLUMN IF NOT EXISTS foto_url text;

-- Ranking de duplas: mesma ideia, por atleta
ALTER TABLE ranking_dupla ADD COLUMN IF NOT EXISTS atleta1_username text;
ALTER TABLE ranking_dupla ADD COLUMN IF NOT EXISTS atleta1_foto     text;
ALTER TABLE ranking_dupla ADD COLUMN IF NOT EXISTS atleta2_username text;
ALTER TABLE ranking_dupla ADD COLUMN IF NOT EXISTS atleta2_foto     text;
