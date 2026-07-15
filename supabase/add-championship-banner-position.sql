-- Posição de enquadramento do banner do campeonato (foco X/Y em %).
-- Usada como object-position no CSS sempre que o banner é exibido com
-- object-cover, pra refletir o enquadramento escolhido no upload.
-- NULL = centro (comportamento atual, sem quebrar campeonatos existentes).
-- RODAR NO SQL EDITOR DO SUPABASE.

ALTER TABLE championships
  ADD COLUMN IF NOT EXISTS banner_position_x numeric,
  ADD COLUMN IF NOT EXISTS banner_position_y numeric;

ALTER TABLE championships
  DROP CONSTRAINT IF EXISTS championships_banner_position_x_check;
ALTER TABLE championships
  ADD CONSTRAINT championships_banner_position_x_check
  CHECK (banner_position_x IS NULL OR (banner_position_x >= 0 AND banner_position_x <= 100));

ALTER TABLE championships
  DROP CONSTRAINT IF EXISTS championships_banner_position_y_check;
ALTER TABLE championships
  ADD CONSTRAINT championships_banner_position_y_check
  CHECK (banner_position_y IS NULL OR (banner_position_y >= 0 AND banner_position_y <= 100));

NOTIFY pgrst, 'reload schema';
