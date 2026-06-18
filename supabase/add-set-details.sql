-- Adiciona coluna de pontos por set na tabela de chaveamento
-- Execute no Supabase SQL Editor.
ALTER TABLE bracket_matches
  ADD COLUMN IF NOT EXISTS set_details jsonb;
-- Formato: [{"a": 21, "b": 18}, {"a": 19, "b": 21}, {"a": 21, "b": 15}]
