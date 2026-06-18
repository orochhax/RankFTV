-- Adiciona flag para identificar a partida pelo terceiro lugar
ALTER TABLE bracket_matches
  ADD COLUMN IF NOT EXISTS is_third_place boolean NOT NULL DEFAULT false;
