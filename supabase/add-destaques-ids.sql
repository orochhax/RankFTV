-- IDs dos 3 campeonatos em destaque na home
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS destaques_ids TEXT[] NOT NULL DEFAULT '{}';
