-- =============================================================
-- RANKFTV — tier de dificuldade nos campeonatos
-- Execute no Supabase SQL Editor.
-- =============================================================

-- tier: calculado automaticamente a partir do questionário + inscrições pagas.
-- Mínimos por tier (validação feita na aplicação):
--   local : qualquer número de duplas
--   open  : 10+ duplas pagas
--   elite : 20+ duplas pagas
ALTER TABLE championships
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'local'
  CHECK (tier IN ('local', 'open', 'elite'));

-- tier_quiz: respostas do organizador ao questionário de 5 perguntas.
-- Estrutura esperada: { "duplas": 0-3, "abrangencia": 0-3, "premiacao": 0-3,
--                       "nivel": 0-3, "circuito": 0-3 }
ALTER TABLE championships
  ADD COLUMN IF NOT EXISTS tier_quiz jsonb;
