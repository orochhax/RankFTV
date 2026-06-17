-- Adiciona questionário de nível e rating inicial ao perfil do atleta.
-- Rodar no Supabase SQL Editor.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS questionario JSONB,
  ADD COLUMN IF NOT EXISTS rating       INTEGER DEFAULT 0;
