-- Presença por plano: frequência semanal + regra de cancelamento.
-- RODAR NO SQL EDITOR DO SUPABASE.

-- ── 1. Frequência semanal do plano de mensalidade ────────────────────────────
-- Quantas aulas por semana (seg a dom) o plano dá direito.
-- NULL = ilimitado (dono não definiu limite).
ALTER TABLE arena_plans
  ADD COLUMN IF NOT EXISTS aulas_por_semana int;

ALTER TABLE arena_plans
  DROP CONSTRAINT IF EXISTS arena_plans_aulas_semana_check;
ALTER TABLE arena_plans
  ADD CONSTRAINT arena_plans_aulas_semana_check
  CHECK (aulas_por_semana IS NULL OR aulas_por_semana > 0);

-- ── 2. Antecedência mínima pra desmarcar presença ────────────────────────────
-- O aluno pode desmarcar até X horas antes da aula (devolve o crédito da
-- semana e libera a vaga). Configurável pelo dono; padrão 2 horas.
ALTER TABLE arenas
  ADD COLUMN IF NOT EXISTS cancel_horas_antes int NOT NULL DEFAULT 2;

ALTER TABLE arenas
  DROP CONSTRAINT IF EXISTS arenas_cancel_horas_check;
ALTER TABLE arenas
  ADD CONSTRAINT arenas_cancel_horas_check
  CHECK (cancel_horas_antes >= 0 AND cancel_horas_antes <= 72);

-- ── 3. Aluno pode desmarcar a própria presença ───────────────────────────────
-- A policy "arena_attendance_own" (FOR ALL, user_id = auth.uid()) já cobre o
-- DELETE — faltava só o GRANT. A validação de antecedência fica no servidor.
GRANT DELETE ON arena_attendance TO authenticated;

-- Recarrega o cache de schema do PostgREST.
NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'add-arena-presenca-planos done';
