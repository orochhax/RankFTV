-- =============================================================
-- RANKFTV — tier de dificuldade nos campeonatos
-- Execute no Supabase SQL Editor.
-- =============================================================

-- Tier determina quantos pontos valem as colocações nesse campeonato.
-- Liga Brasileira é importada externamente (tier = 'liga').
-- Campeonatos da plataforma: organizer escolhe na criação; a plataforma
-- revalida no fechamento — se não atingiu o mínimo de duplas, rebaixa.
ALTER TABLE championships
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'local'
  CHECK (tier IN ('local', 'open', 'elite'));

-- Mínimos por tier (referência — validação feita na aplicação):
-- local : qualquer número de duplas
-- open  : 10+ duplas pagas
-- elite : 20+ duplas pagas
-- (tier 'liga' reservado para dados externos, não usado nos camps da plataforma)
