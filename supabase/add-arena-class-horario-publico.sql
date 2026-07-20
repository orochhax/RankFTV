-- Horário de início/término, público (misto/masculino/feminino) e preço de
-- aula avulsa das aulas da arena.
-- RODAR NO SQL EDITOR DO SUPABASE.
-- Idempotente e segura: só ADICIONA colunas e faz backfill a partir dos dados
-- que já existem (horario + duracao_minutos). Nada é apagado — `horario` e
-- `duracao_minutos` ficam no schema (não usadas mais pelo app) até uma limpeza
-- futura confirmada, evitando qualquer janela de deploy que quebre em produção.

-- ── 1. Novas colunas ──────────────────────────────────────────────────────
ALTER TABLE arena_classes
  ADD COLUMN IF NOT EXISTS hora_inicio time,
  ADD COLUMN IF NOT EXISTS hora_fim    time,
  ADD COLUMN IF NOT EXISTS publico     text NOT NULL DEFAULT 'misto',
  ADD COLUMN IF NOT EXISTS valor_avulso numeric(10,2);

-- ── 2. Backfill a partir de horario (text "HH:MM") + duracao_minutos ──────
-- Só preenche onde ainda está NULL — seguro rodar de novo sem sobrescrever
-- edições feitas depois da primeira execução.
UPDATE arena_classes
SET hora_inicio = horario::time
WHERE hora_inicio IS NULL
  AND horario IS NOT NULL
  AND horario ~ '^\d{1,2}:\d{2}$';

UPDATE arena_classes
SET hora_fim = (horario::time + (COALESCE(duracao_minutos, 60) || ' minutes')::interval)::time
WHERE hora_fim IS NULL
  AND horario IS NOT NULL
  AND horario ~ '^\d{1,2}:\d{2}$';

-- ── 3. Regras ──────────────────────────────────────────────────────────────
ALTER TABLE arena_classes
  DROP CONSTRAINT IF EXISTS arena_classes_publico_check;
ALTER TABLE arena_classes
  ADD CONSTRAINT arena_classes_publico_check
  CHECK (publico IN ('misto', 'masculino', 'feminino'));

ALTER TABLE arena_classes
  DROP CONSTRAINT IF EXISTS arena_classes_horario_ordem_check;
ALTER TABLE arena_classes
  ADD CONSTRAINT arena_classes_horario_ordem_check
  CHECK (hora_fim IS NULL OR hora_inicio IS NULL OR hora_fim > hora_inicio);

ALTER TABLE arena_classes
  DROP CONSTRAINT IF EXISTS arena_classes_valor_avulso_check;
ALTER TABLE arena_classes
  ADD CONSTRAINT arena_classes_valor_avulso_check
  CHECK (valor_avulso IS NULL OR valor_avulso >= 0);

-- Recarrega o cache de schema do PostgREST.
NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'add-arena-class-horario-publico done';
