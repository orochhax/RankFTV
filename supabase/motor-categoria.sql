-- Motor de categoria: adiciona flag de sandbagging na tabela teams.
-- Rodar no Supabase SQL Editor.

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS sandbagging_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating_dupla     integer;
