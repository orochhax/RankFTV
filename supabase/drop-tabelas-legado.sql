-- Drop de tabelas legado não usadas pelo código atual.
-- Rode no Supabase SQL Editor. Irreversível.

-- Tabela legado: usada antes de championship_categories existir
DROP TABLE IF EXISTS categories CASCADE;

-- Views de ranking por dupla/individual (substituídas pela view ranking_entries)
DROP TABLE IF EXISTS ranking_individual CASCADE;
DROP TABLE IF EXISTS ranking_dupla      CASCADE;

-- Tabela de seguidores de séries (sistema de séries foi removido, substituído por Pages)
DROP TABLE IF EXISTS series_followers CASCADE;

-- Tabela de configurações de campeonato (sem uso no código)
DROP TABLE IF EXISTS championship_settings CASCADE;
