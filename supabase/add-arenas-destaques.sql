-- Adiciona coluna de destaques de arenas na platform_config.
-- RODAR NO SQL EDITOR DO SUPABASE.

ALTER TABLE platform_config
  ADD COLUMN IF NOT EXISTS arenas_destaques_ids uuid[] DEFAULT '{}';

NOTIFY migrations, 'add-arenas-destaques done';
