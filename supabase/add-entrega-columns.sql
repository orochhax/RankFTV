-- Adiciona colunas de entrega de kit na tabela shirt_production
-- Execute no Supabase SQL Editor.
ALTER TABLE shirt_production
  ADD COLUMN IF NOT EXISTS retirado_por  text,
  ADD COLUMN IF NOT EXISTS data_retirada date;
