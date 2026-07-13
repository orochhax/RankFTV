-- =============================================================
-- RANKFTV — Controle financeiro pessoal (Carlos e Julia)
-- Execute no Supabase SQL Editor (pode rodar mais de uma vez).
--
-- Tabela isolada: não se integra a campeonatos, arenas, inscrições
-- ou financeiro da plataforma. Uso exclusivo de /admin/gastos.
-- =============================================================

CREATE TABLE IF NOT EXISTS personal_finance_entries (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person                text        NOT NULL CHECK (person IN ('carlos', 'julia')),
  name                  text        NOT NULL,
  category              text        NOT NULL,
  entry_date            date        NOT NULL,
  amount                numeric(12,2) NOT NULL CHECK (amount > 0),
  type                  text        NOT NULL CHECK (type IN ('gasto', 'renda', 'investimento')),
  bank                  text        NOT NULL CHECK (bank IN ('inter', 'c6', 'mercado_pago', 'nubank', 'vale')),
  payment_method        text        NOT NULL CHECK (payment_method IN ('credito', 'debito', 'pix')),
  is_installment        boolean     NOT NULL DEFAULT false,
  installment_group_id  uuid,
  installment_number    int         NOT NULL DEFAULT 1,
  installment_total     int         NOT NULL DEFAULT 1,
  -- Fixo/recorrente: vale todo mês a partir de entry_date, sem data de término
  -- (ex: salário). Mutuamente exclusivo com parcelamento — ver actions.ts.
  is_recurring          boolean     NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ── ÍNDICES ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_personal_finance_user_id    ON personal_finance_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_finance_entry_date ON personal_finance_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_personal_finance_person     ON personal_finance_entries(person);
CREATE INDEX IF NOT EXISTS idx_personal_finance_type       ON personal_finance_entries(type);
CREATE INDEX IF NOT EXISTS idx_personal_finance_category   ON personal_finance_entries(category);

-- ── SEGURANÇA (RLS) ───────────────────────────────────────────
-- Cada lançamento só é visível/editável pelo próprio dono (user_id = auth.uid()).

ALTER TABLE personal_finance_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS personal_finance_owner_all ON personal_finance_entries;
CREATE POLICY personal_finance_owner_all ON personal_finance_entries
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── GRANTS ────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance_entries TO authenticated;

-- =============================================================
-- Exceções mensais de lançamentos fixos/recorrentes.
--
-- Um lançamento fixo (personal_finance_entries.is_recurring = true) conta
-- "virtualmente" todo mês a partir de entry_date. Quando é preciso mudar (ou
-- pular) só UM mês específico sem afetar os outros — ex: salário maior num
-- mês por hora extra — cria-se um override aqui pra aquele month_key. Campos
-- nulos no override significam "usa o valor do lançamento original nesse
-- campo"; deleted=true significa "não conta nesse mês".
-- =============================================================

CREATE TABLE IF NOT EXISTS personal_finance_recurring_overrides (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recurring_entry_id  uuid        NOT NULL REFERENCES personal_finance_entries(id) ON DELETE CASCADE,
  month_key           text        NOT NULL, -- "YYYY-MM"
  name                text,
  category            text,
  entry_date          date,
  amount              numeric(12,2) CHECK (amount IS NULL OR amount > 0),
  type                text        CHECK (type IS NULL OR type IN ('gasto', 'renda', 'investimento')),
  bank                text        CHECK (bank IS NULL OR bank IN ('inter', 'c6', 'mercado_pago', 'nubank', 'vale')),
  payment_method      text        CHECK (payment_method IS NULL OR payment_method IN ('credito', 'debito', 'pix')),
  person              text        CHECK (person IS NULL OR person IN ('carlos', 'julia')),
  deleted             boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, recurring_entry_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_pf_overrides_user_id            ON personal_finance_recurring_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_pf_overrides_recurring_entry_id ON personal_finance_recurring_overrides(recurring_entry_id);
CREATE INDEX IF NOT EXISTS idx_pf_overrides_month_key          ON personal_finance_recurring_overrides(month_key);

ALTER TABLE personal_finance_recurring_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS personal_finance_overrides_owner_all ON personal_finance_recurring_overrides;
CREATE POLICY personal_finance_overrides_owner_all ON personal_finance_recurring_overrides
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance_recurring_overrides TO authenticated;

-- =============================================================
-- Categorias do financeiro pessoal (editáveis pelo dono).
--
-- "Sem categoria" é a categoria padrão — o app garante que ela existe (ver
-- app/admin/gastos/page.tsx) e as actions bloqueiam renomear/remover ela.
-- Remover uma categoria NUNCA apaga lançamento: os lançamentos e overrides
-- que usavam o nome removido são migrados pra "Sem categoria" antes da
-- categoria virar active=false.
-- =============================================================

CREATE TABLE IF NOT EXISTS personal_finance_categories (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_pf_categories_user_id ON personal_finance_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_pf_categories_active   ON personal_finance_categories(active);
CREATE INDEX IF NOT EXISTS idx_pf_categories_name     ON personal_finance_categories(name);

ALTER TABLE personal_finance_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS personal_finance_categories_owner_all ON personal_finance_categories;
CREATE POLICY personal_finance_categories_owner_all ON personal_finance_categories
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance_categories TO authenticated;

-- =============================================================
-- Rendimento de investimentos (Mercado Pago por faixas / % único do CDI).
--
-- A regra do Mercado Pago (percentuais e limite da faixa) é configurável por
-- usuário, nunca fixa no código — ver lib/personal-finance-investments.ts
-- pras fórmulas. last_cdi_annual/last_cdi_reference_date guardam a última
-- taxa CDI anual obtida do Banco Central (série 4389), usada como fallback
-- quando a API está indisponível.
-- =============================================================

CREATE TABLE IF NOT EXISTS personal_finance_investment_settings (
  id                              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  mercado_pago_bonus_cdi_percent  numeric(6,2) NOT NULL DEFAULT 120,
  mercado_pago_bonus_limit        numeric(12,2) NOT NULL DEFAULT 10000,
  mercado_pago_excess_cdi_percent numeric(6,2) NOT NULL DEFAULT 100,
  last_cdi_annual                 numeric(6,2),
  last_cdi_reference_date         date,
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pf_investment_settings_user_id ON personal_finance_investment_settings(user_id);

ALTER TABLE personal_finance_investment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS personal_finance_investment_settings_owner_all ON personal_finance_investment_settings;
CREATE POLICY personal_finance_investment_settings_owner_all ON personal_finance_investment_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance_investment_settings TO authenticated;

-- ── Regra de rendimento por lançamento de investimento ──────────────────────
-- Nulos pra renda/gasto (garantido pela aplicação); só valem quando type =
-- 'investimento'. investment_cdi_percent é usado no modo single_cdi (100,
-- 105, 110, 120...); no modo mercado_pago_tiered ele é ignorado — a regra
-- vem de personal_finance_investment_settings.

ALTER TABLE personal_finance_entries
  ADD COLUMN IF NOT EXISTS investment_yield_mode text
    CHECK (investment_yield_mode IS NULL OR investment_yield_mode IN ('single_cdi', 'mercado_pago_tiered')),
  ADD COLUMN IF NOT EXISTS investment_cdi_percent numeric(6,2);

-- A mesma coluna precisa existir nos overrides mensais, pra poder trocar a
-- regra de rendimento de um mês específico de um investimento fixo.
ALTER TABLE personal_finance_recurring_overrides
  ADD COLUMN IF NOT EXISTS investment_yield_mode text
    CHECK (investment_yield_mode IS NULL OR investment_yield_mode IN ('single_cdi', 'mercado_pago_tiered')),
  ADD COLUMN IF NOT EXISTS investment_cdi_percent numeric(6,2);

-- ── Backfill: investimentos existentes precisam de uma regra explícita ──────
-- Mercado Pago já lançado antes desta migração cai na regra por faixas
-- (era o comportamento implícito); os demais bancos caem em 100% do CDI até
-- o usuário editar e escolher outra coisa.
UPDATE personal_finance_entries
SET investment_yield_mode = 'mercado_pago_tiered'
WHERE type = 'investimento' AND bank = 'mercado_pago' AND investment_yield_mode IS NULL;

UPDATE personal_finance_entries
SET investment_yield_mode = 'single_cdi', investment_cdi_percent = 100
WHERE type = 'investimento' AND investment_yield_mode IS NULL;

-- =============================================================
-- Lançamento conjunto (Carlos e Julia) + dia do lançamento fixo.
--
-- shared_entry_group_id: quando um lançamento é criado a partir da opção
-- "Carlos e Julia" no formulário, DOIS registros reais são inseridos (um por
-- pessoa), ligados por esse id em comum — nunca uma linha só. É só uma chave
-- de agrupamento (sem FK), usada pra edição/exclusão conjunta na UI.
--
-- recurrence_day_mode/recurrence_day: só valem pra lançamentos fixos
-- (is_recurring=true). calendar_day = dia fixo do mês (1–31, clampado no
-- último dia quando o mês for mais curto); business_day = Nº-ésimo dia útil
-- do mês (1–23, segunda a sexta, sem feriados — ver nthBusinessDayOfMonth em
-- lib/personal-finance.ts). O backfill abaixo preserva o comportamento atual
-- dos fixos já cadastrados (calendar_day = dia atual de entry_date).
-- =============================================================

ALTER TABLE personal_finance_entries
  ADD COLUMN IF NOT EXISTS shared_entry_group_id uuid,
  ADD COLUMN IF NOT EXISTS recurrence_day_mode text
    CHECK (recurrence_day_mode IS NULL OR recurrence_day_mode IN ('calendar_day', 'business_day')),
  ADD COLUMN IF NOT EXISTS recurrence_day integer
    CHECK (recurrence_day IS NULL OR (recurrence_day >= 1 AND recurrence_day <= 31));

CREATE INDEX IF NOT EXISTS idx_pf_entries_shared_group ON personal_finance_entries(shared_entry_group_id);

-- A mesma trinca precisa existir nos overrides mensais, pra poder trocar a
-- pessoa/valor/dia de UM mês específico de um fixo compartilhado.
ALTER TABLE personal_finance_recurring_overrides
  ADD COLUMN IF NOT EXISTS recurrence_day_mode text
    CHECK (recurrence_day_mode IS NULL OR recurrence_day_mode IN ('calendar_day', 'business_day')),
  ADD COLUMN IF NOT EXISTS recurrence_day integer
    CHECK (recurrence_day IS NULL OR (recurrence_day >= 1 AND recurrence_day <= 31));

-- ── Backfill: fixos existentes migram pra calendar_day, preservando o dia
-- que já usavam (comportamento idêntico ao atual, sem quebrar nada).
UPDATE personal_finance_entries
SET recurrence_day_mode = 'calendar_day', recurrence_day = EXTRACT(DAY FROM entry_date)::int
WHERE is_recurring = true AND recurrence_day_mode IS NULL;

NOTIFY pgrst, 'reload schema';
