-- Remove features de páginas/seguidores do banco.
-- Rode no SQL Editor do Supabase (apenas uma vez).

-- Remove coluna page_id da tabela de campeonatos
ALTER TABLE championships DROP COLUMN IF EXISTS page_id;

-- Remove tabelas de páginas e seguidores
DROP TABLE IF EXISTS page_championship_invites;
DROP TABLE IF EXISTS page_followers;
DROP TABLE IF EXISTS pages;
