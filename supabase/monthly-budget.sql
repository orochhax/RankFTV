-- =============================================================
-- RANKFTV — Planejamento financeiro mensal (Carlos e Julia)
-- Execute no Supabase SQL Editor (idempotente, pode rodar mais de uma vez).
--
-- Tabelas isoladas: uso exclusivo de /admin/gasto-mensal. NÃO se integra a
-- personal_finance_* (página /admin/gastos) nem a nenhuma tabela de
-- campeonatos, arenas ou inscrições. Não há recorrência automática, parcelas,
-- categorias, bancos, formas de pagamento nem vínculo com outros lançamentos
-- — cada linha é só uma tarefa (despesa ou receita) de um mês específico.
-- =============================================================

CREATE TABLE IF NOT EXISTS monthly_budget_expenses (
  id             uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key      date          NOT NULL, -- sempre o 1º dia do mês (ex: 2026-08-01)
  name           text          NOT NULL,
  -- Divisão por pessoa: uma despesa "de Carlos" tem amount_julia = 0 (e
  -- vice-versa); uma despesa "de Carlos e Julia" tem as duas partes > 0.
  -- Continua sendo UMA linha só, com UM único status pago/pendente.
  amount_carlos  numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_carlos >= 0),
  amount_julia   numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_julia >= 0),
  is_paid        boolean       NOT NULL DEFAULT false,
  paid_at        timestamptz,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT monthly_budget_expenses_soma_positiva CHECK (amount_carlos + amount_julia > 0)
);

CREATE INDEX IF NOT EXISTS idx_mb_expenses_user_id  ON monthly_budget_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_mb_expenses_month_key ON monthly_budget_expenses(month_key);
CREATE INDEX IF NOT EXISTS idx_mb_expenses_is_paid   ON monthly_budget_expenses(is_paid);

ALTER TABLE monthly_budget_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS monthly_budget_expenses_owner_all ON monthly_budget_expenses;
CREATE POLICY monthly_budget_expenses_owner_all ON monthly_budget_expenses
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON monthly_budget_expenses TO authenticated;

-- =============================================================
-- Receitas previstas do mês (equivalente a "SALÁRIO LÍQUIDO" + "A RECEBER"
-- da planilha de referência). Mesmo modelo de divisão por pessoa das
-- despesas, sem is_paid/paid_at (receita prevista não tem status de
-- pagamento nessa tela).
-- =============================================================

CREATE TABLE IF NOT EXISTS monthly_budget_incomes (
  id             uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key      date          NOT NULL,
  name           text          NOT NULL,
  amount_carlos  numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_carlos >= 0),
  amount_julia   numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_julia >= 0),
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT monthly_budget_incomes_soma_positiva CHECK (amount_carlos + amount_julia > 0)
);

CREATE INDEX IF NOT EXISTS idx_mb_incomes_user_id   ON monthly_budget_incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_mb_incomes_month_key ON monthly_budget_incomes(month_key);

ALTER TABLE monthly_budget_incomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS monthly_budget_incomes_owner_all ON monthly_budget_incomes;
CREATE POLICY monthly_budget_incomes_owner_all ON monthly_budget_incomes
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON monthly_budget_incomes TO authenticated;

-- =============================================================
-- Vencimento opcional da despesa/dívida (não obrigatório) + "repetir até um
-- mês final" na criação. O vencimento é só uma data informativa por linha —
-- repetir gera uma linha independente por mês (ver buildExpenseDrafts em
-- lib/monthly-budget.ts), não é recorrência automática.
-- =============================================================

ALTER TABLE monthly_budget_expenses
  ADD COLUMN IF NOT EXISTS due_date date;

CREATE INDEX IF NOT EXISTS idx_mb_expenses_due_date ON monthly_budget_expenses(due_date);

-- =============================================================
-- Grupo de repetição ("De"/"Até" na criação): quando um lançamento é criado
-- pra mais de um mês de uma vez, todas as linhas geradas recebem o mesmo
-- repeat_group_id — nunca uma FK, só uma chave de agrupamento (mesmo padrão
-- de shared_entry_group_id em personal_finance_entries). Uma linha criada
-- sozinha (sem "Até") fica com repeat_group_id NULL. Usado só pra oferecer,
-- na edição, o escopo "somente este mês / este e os próximos / todos os
-- meses" — nunca pra recorrência automática nem pra ligar o status pago.
-- =============================================================

ALTER TABLE monthly_budget_expenses
  ADD COLUMN IF NOT EXISTS repeat_group_id uuid;

ALTER TABLE monthly_budget_incomes
  ADD COLUMN IF NOT EXISTS repeat_group_id uuid;

CREATE INDEX IF NOT EXISTS idx_mb_expenses_repeat_group_id ON monthly_budget_expenses(repeat_group_id);
CREATE INDEX IF NOT EXISTS idx_mb_incomes_repeat_group_id  ON monthly_budget_incomes(repeat_group_id);

-- ── Backfill: lançamentos criados ANTES da coluna repeat_group_id existir ────
-- (ex: a "Parcela - Moto" de 48 meses cadastrada nas primeiras versões) ficaram
-- com repeat_group_id NULL, então a tela não oferecia o escopo "este mês /
-- este e os próximos / todos". Aqui reconstruímos o grupo agrupando linhas
-- soltas (repeat_group_id IS NULL) que têm o MESMO nome + mesma divisão de
-- valor (Carlos/Julia) e aparecem em mais de um mês — que é exatamente o
-- formato de um lançamento repetido. Cada grupo ganha um id próprio.
--
-- Idempotente: numa 2ª execução, as linhas já agrupadas têm id não-nulo e
-- não voltam a entrar no filtro (WHERE repeat_group_id IS NULL).

WITH grupos_despesas AS (
  SELECT user_id, name, amount_carlos, amount_julia, gen_random_uuid() AS novo_grupo
  FROM monthly_budget_expenses
  WHERE repeat_group_id IS NULL
  GROUP BY user_id, name, amount_carlos, amount_julia
  HAVING COUNT(*) > 1
)
UPDATE monthly_budget_expenses e
SET repeat_group_id = g.novo_grupo
FROM grupos_despesas g
WHERE e.repeat_group_id IS NULL
  AND e.user_id = g.user_id
  AND e.name = g.name
  AND e.amount_carlos = g.amount_carlos
  AND e.amount_julia = g.amount_julia;

WITH grupos_receitas AS (
  SELECT user_id, name, amount_carlos, amount_julia, gen_random_uuid() AS novo_grupo
  FROM monthly_budget_incomes
  WHERE repeat_group_id IS NULL
  GROUP BY user_id, name, amount_carlos, amount_julia
  HAVING COUNT(*) > 1
)
UPDATE monthly_budget_incomes i
SET repeat_group_id = g.novo_grupo
FROM grupos_receitas g
WHERE i.repeat_group_id IS NULL
  AND i.user_id = g.user_id
  AND i.name = g.name
  AND i.amount_carlos = g.amount_carlos
  AND i.amount_julia = g.amount_julia;

-- ── Identidade de série estável pra TODO lançamento, mesmo os que sempre
-- foram sozinhos ─────────────────────────────────────────────────────────
-- Depois do backfill acima, ainda sobram linhas com repeat_group_id NULL:
-- lançamentos que nunca tiveram irmã (nome+valor únicos). A partir de agora
-- a aplicação sempre atribui um repeat_group_id na criação (mesmo pra um
-- único mês), então aqui só fechamos a lacuna dos dados que já existiam
-- antes dessa mudança — cada um ganha seu próprio id (não forma grupo com
-- ninguém, mas passa a ter uma identidade estável pra futuras edições).
-- Idempotente: só afeta linhas que ainda estão com repeat_group_id NULL.

UPDATE monthly_budget_expenses
SET repeat_group_id = gen_random_uuid()
WHERE repeat_group_id IS NULL;

UPDATE monthly_budget_incomes
SET repeat_group_id = gen_random_uuid()
WHERE repeat_group_id IS NULL;

NOTIFY pgrst, 'reload schema';
