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

NOTIFY pgrst, 'reload schema';
