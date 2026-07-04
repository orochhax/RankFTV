-- Adiciona nível e limite de alunos às aulas da arena.
-- RODAR NO SQL EDITOR DO SUPABASE.

-- nivel: iniciante | intermediario | avancado | NULL (todos os níveis)
-- max_alunos: limite de alunos que podem confirmar presença; NULL = sem limite
ALTER TABLE arena_classes
  ADD COLUMN IF NOT EXISTS nivel      text,
  ADD COLUMN IF NOT EXISTS max_alunos integer;

-- Garante que o nível, quando informado, seja um dos valores válidos.
ALTER TABLE arena_classes
  DROP CONSTRAINT IF EXISTS arena_classes_nivel_check;
ALTER TABLE arena_classes
  ADD CONSTRAINT arena_classes_nivel_check
  CHECK (nivel IS NULL OR nivel IN ('iniciante', 'intermediario', 'avancado'));

-- max_alunos, quando informado, precisa ser positivo.
ALTER TABLE arena_classes
  DROP CONSTRAINT IF EXISTS arena_classes_max_alunos_check;
ALTER TABLE arena_classes
  ADD CONSTRAINT arena_classes_max_alunos_check
  CHECK (max_alunos IS NULL OR max_alunos > 0);

NOTIFY migrations, 'add-arena-class-nivel-vagas done';
