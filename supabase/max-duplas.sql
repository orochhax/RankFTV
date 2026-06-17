-- Limite de duplas por categoria.
-- Rodar no Supabase SQL Editor.

ALTER TABLE championship_categories
  ADD COLUMN IF NOT EXISTS max_duplas integer;
