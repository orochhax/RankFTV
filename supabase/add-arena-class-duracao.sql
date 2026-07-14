-- Duração das aulas da arena, em minutos.
-- RODAR NO SQL EDITOR DO SUPABASE.
-- Idempotente — seguro rodar mais de uma vez.

-- Padrão de 60 min pros registros antigos (sem duração salva ainda).
ALTER TABLE arena_classes
  ADD COLUMN IF NOT EXISTS duracao_minutos integer NOT NULL DEFAULT 60;

-- Faixa razoável: 15 min a 8 horas.
ALTER TABLE arena_classes
  DROP CONSTRAINT IF EXISTS arena_classes_duracao_check;
ALTER TABLE arena_classes
  ADD CONSTRAINT arena_classes_duracao_check
  CHECK (duracao_minutos >= 15 AND duracao_minutos <= 480);

-- Recarrega o cache de schema do PostgREST.
NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'add-arena-class-duracao done';
