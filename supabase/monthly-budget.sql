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

-- =============================================================
-- Histórico de eventos (timeline do Extrato)
-- =============================================================
--
-- O Extrato deixou de listar cada ocorrência mensal — uma série De/Até de 12
-- meses aparecia como 12 linhas. Agora ele é uma timeline de AÇÕES: criar,
-- editar, excluir, marcar pago/pendente — uma linha por ação, nunca por mês.
--
-- Os dados "ao vivo" continuam só em monthly_budget_expenses/incomes; esta
-- tabela é o registro imutável do que aconteceu, com snapshots ANTES/DEPOIS
-- das ocorrências que aquela ação especificamente afetou (não a série
-- inteira) — dá pra reconstruir o antes/depois mesmo que o registro original
-- já tenha sido editado de novo ou excluído.

CREATE TABLE IF NOT EXISTS monthly_budget_history_events (
  id                uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_kind       text          NOT NULL CHECK (entity_kind IN ('income', 'expense')),
  action            text          NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'payment_changed', 'imported')),
  -- repeat_group_id do lançamento — liga todos os eventos da mesma série ao
  -- longo do tempo. Nunca agrupar eventos por nome/valor/created_at.
  entity_group_id   uuid,
  -- Id da ocorrência mensal que ancorou a ação (a linha que o usuário clicou
  -- pra editar/excluir, ou a primeira ocorrência de uma criação). De
  -- propósito SEM foreign key — precisa continuar existindo depois que a
  -- ocorrência original for excluída.
  anchor_entry_id   uuid,
  anchor_month_key  date          NOT NULL,
  edit_scope        text          CHECK (edit_scope IN ('esta', 'esta_e_proximas', 'todas')),
  -- Evento anterior na mesma cadeia (mesmo entity_group_id) — forma uma
  -- lista encadeada cronológica por lançamento. Nulo só no primeiro evento
  -- do grupo (created ou imported).
  previous_event_id uuid          REFERENCES monthly_budget_history_events(id),
  occurred_at       timestamptz   NOT NULL DEFAULT now(),
  before_snapshot   jsonb,
  after_snapshot    jsonb,
  affected_months   date[]        NOT NULL DEFAULT '{}',
  metadata          jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mb_history_user_id          ON monthly_budget_history_events(user_id);
CREATE INDEX IF NOT EXISTS idx_mb_history_occurred_at       ON monthly_budget_history_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_mb_history_entity_group_id   ON monthly_budget_history_events(entity_group_id);
CREATE INDEX IF NOT EXISTS idx_mb_history_previous_event_id ON monthly_budget_history_events(previous_event_id);

ALTER TABLE monthly_budget_history_events ENABLE ROW LEVEL SECURITY;

-- Só SELECT e INSERT pro dono — sem policy de UPDATE/DELETE, então essas
-- operações ficam negadas por padrão (RLS nega tudo que não tem policy
-- explícita). O histórico é imutável mesmo pra quem é dono da linha.
DROP POLICY IF EXISTS monthly_budget_history_events_owner_select ON monthly_budget_history_events;
CREATE POLICY monthly_budget_history_events_owner_select ON monthly_budget_history_events
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS monthly_budget_history_events_owner_insert ON monthly_budget_history_events;
CREATE POLICY monthly_budget_history_events_owner_insert ON monthly_budget_history_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT ON monthly_budget_history_events TO authenticated;

-- =============================================================
-- RPCs transacionais: a mutação da tabela mensal e o evento de histórico
-- acontecem numa única transação (a própria chamada da função) — se uma
-- parte falhar, a outra é revertida junto. SECURITY INVOKER (o padrão, não
-- declarado explicitamente): roda com a permissão de quem chama, então a
-- RLS das tabelas de baixo continua valendo normalmente. Por isso nenhuma
-- função recebe user_id como parâmetro — todas usam auth.uid() por dentro,
-- o que torna impossível gravar em nome de outro usuário mesmo que o
-- parâmetro tentasse indicar isso.
-- =============================================================

CREATE OR REPLACE FUNCTION mb_write_expense_event(
  p_ids_to_delete uuid[],
  p_rows_to_insert jsonb,
  p_updates jsonb,
  p_event jsonb
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_group_id uuid := NULLIF(p_event->>'entity_group_id', '')::uuid;
  v_previous_event_id uuid;
  v_event_id uuid;
  v_row jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_ids_to_delete IS NOT NULL AND array_length(p_ids_to_delete, 1) > 0 THEN
    DELETE FROM monthly_budget_expenses
    WHERE id = ANY(p_ids_to_delete) AND user_id = v_uid;
  END IF;

  IF p_rows_to_insert IS NOT NULL AND jsonb_array_length(p_rows_to_insert) > 0 THEN
    INSERT INTO monthly_budget_expenses (id, user_id, month_key, name, amount_carlos, amount_julia, due_date, repeat_group_id)
    SELECT
      (r->>'id')::uuid,
      v_uid,
      (r->>'month_key')::date,
      r->>'name',
      (r->>'amount_carlos')::numeric,
      (r->>'amount_julia')::numeric,
      NULLIF(r->>'due_date', '')::date,
      (r->>'repeat_group_id')::uuid
    FROM jsonb_array_elements(p_rows_to_insert) r;
  END IF;

  IF p_updates IS NOT NULL AND jsonb_array_length(p_updates) > 0 THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_updates) LOOP
      UPDATE monthly_budget_expenses
      SET name = v_row->>'name',
          amount_carlos = (v_row->>'amount_carlos')::numeric,
          amount_julia = (v_row->>'amount_julia')::numeric,
          due_date = NULLIF(v_row->>'due_date', '')::date,
          updated_at = now()
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  IF v_group_id IS NOT NULL THEN
    SELECT id INTO v_previous_event_id
    FROM monthly_budget_history_events
    WHERE entity_group_id = v_group_id AND user_id = v_uid
    ORDER BY occurred_at DESC, created_at DESC
    LIMIT 1;
  END IF;

  INSERT INTO monthly_budget_history_events (
    user_id, entity_kind, action, entity_group_id, anchor_entry_id, anchor_month_key,
    edit_scope, previous_event_id, before_snapshot, after_snapshot, affected_months, metadata
  ) VALUES (
    v_uid,
    'expense',
    p_event->>'action',
    v_group_id,
    NULLIF(p_event->>'anchor_entry_id', '')::uuid,
    (p_event->>'anchor_month_key')::date,
    NULLIF(p_event->>'edit_scope', ''),
    v_previous_event_id,
    p_event->'before_snapshot',
    p_event->'after_snapshot',
    COALESCE((SELECT array_agg((x)::date) FROM jsonb_array_elements_text(p_event->'affected_months') x), '{}'),
    COALESCE(p_event->'metadata', '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION mb_write_expense_event(uuid[], jsonb, jsonb, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION mb_write_income_event(
  p_ids_to_delete uuid[],
  p_rows_to_insert jsonb,
  p_updates jsonb,
  p_event jsonb
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_group_id uuid := NULLIF(p_event->>'entity_group_id', '')::uuid;
  v_previous_event_id uuid;
  v_event_id uuid;
  v_row jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_ids_to_delete IS NOT NULL AND array_length(p_ids_to_delete, 1) > 0 THEN
    DELETE FROM monthly_budget_incomes
    WHERE id = ANY(p_ids_to_delete) AND user_id = v_uid;
  END IF;

  IF p_rows_to_insert IS NOT NULL AND jsonb_array_length(p_rows_to_insert) > 0 THEN
    INSERT INTO monthly_budget_incomes (id, user_id, month_key, name, amount_carlos, amount_julia, repeat_group_id)
    SELECT
      (r->>'id')::uuid,
      v_uid,
      (r->>'month_key')::date,
      r->>'name',
      (r->>'amount_carlos')::numeric,
      (r->>'amount_julia')::numeric,
      (r->>'repeat_group_id')::uuid
    FROM jsonb_array_elements(p_rows_to_insert) r;
  END IF;

  IF p_updates IS NOT NULL AND jsonb_array_length(p_updates) > 0 THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_updates) LOOP
      UPDATE monthly_budget_incomes
      SET name = v_row->>'name',
          amount_carlos = (v_row->>'amount_carlos')::numeric,
          amount_julia = (v_row->>'amount_julia')::numeric,
          updated_at = now()
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  IF v_group_id IS NOT NULL THEN
    SELECT id INTO v_previous_event_id
    FROM monthly_budget_history_events
    WHERE entity_group_id = v_group_id AND user_id = v_uid
    ORDER BY occurred_at DESC, created_at DESC
    LIMIT 1;
  END IF;

  INSERT INTO monthly_budget_history_events (
    user_id, entity_kind, action, entity_group_id, anchor_entry_id, anchor_month_key,
    edit_scope, previous_event_id, before_snapshot, after_snapshot, affected_months, metadata
  ) VALUES (
    v_uid,
    'income',
    p_event->>'action',
    v_group_id,
    NULLIF(p_event->>'anchor_entry_id', '')::uuid,
    (p_event->>'anchor_month_key')::date,
    NULLIF(p_event->>'edit_scope', ''),
    v_previous_event_id,
    p_event->'before_snapshot',
    p_event->'after_snapshot',
    COALESCE((SELECT array_agg((x)::date) FROM jsonb_array_elements_text(p_event->'affected_months') x), '{}'),
    COALESCE(p_event->'metadata', '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION mb_write_income_event(uuid[], jsonb, jsonb, jsonb) TO authenticated;

-- Marcar/desmarcar como paga não muda nome/valor/mês — só is_paid/paid_at.
-- Função própria (não reaproveita mb_write_expense_event) porque a ação
-- 'payment_changed' muta de um jeito diferente das outras: um único campo
-- booleano, nunca cria/apaga/atualiza nome ou valor de ninguém.
CREATE OR REPLACE FUNCTION mb_toggle_expense_paid(
  p_id uuid,
  p_paid boolean,
  p_event jsonb
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_group_id uuid := NULLIF(p_event->>'entity_group_id', '')::uuid;
  v_previous_event_id uuid;
  v_event_id uuid;
  v_updated int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE monthly_budget_expenses
  SET is_paid = p_paid,
      paid_at = CASE WHEN p_paid THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_id AND user_id = v_uid;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'expense not found';
  END IF;

  IF v_group_id IS NOT NULL THEN
    SELECT id INTO v_previous_event_id
    FROM monthly_budget_history_events
    WHERE entity_group_id = v_group_id AND user_id = v_uid
    ORDER BY occurred_at DESC, created_at DESC
    LIMIT 1;
  END IF;

  INSERT INTO monthly_budget_history_events (
    user_id, entity_kind, action, entity_group_id, anchor_entry_id, anchor_month_key,
    edit_scope, previous_event_id, before_snapshot, after_snapshot, affected_months, metadata
  ) VALUES (
    v_uid,
    'expense',
    'payment_changed',
    v_group_id,
    p_id,
    (p_event->>'anchor_month_key')::date,
    NULL,
    v_previous_event_id,
    p_event->'before_snapshot',
    p_event->'after_snapshot',
    COALESCE((SELECT array_agg((x)::date) FROM jsonb_array_elements_text(p_event->'affected_months') x), '{}'),
    COALESCE(p_event->'metadata', '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION mb_toggle_expense_paid(uuid, boolean, jsonb) TO authenticated;

-- =============================================================
-- Backfill idempotente: um evento 'imported' por repeat_group_id que ainda
-- não tem NENHUM evento — nunca um por mês. Rodar de novo não duplica nada:
-- o WHERE NOT EXISTS barra qualquer grupo que já tenha algum evento, seja de
-- uma execução anterior deste backfill, seja de uso real do app depois da
-- migração (o que já teria criado o evento 'created' correspondente).
-- =============================================================

WITH anchor AS (
  SELECT DISTINCT ON (user_id, repeat_group_id)
    id AS anchor_id, user_id, repeat_group_id, month_key AS anchor_month_key,
    name, amount_carlos, amount_julia
  FROM monthly_budget_expenses
  WHERE repeat_group_id IS NOT NULL
  ORDER BY user_id, repeat_group_id, month_key ASC
),
agg AS (
  SELECT
    user_id, repeat_group_id,
    array_agg(month_key ORDER BY month_key ASC) AS affected_months,
    count(*) AS months_count,
    max(month_key) AS last_month_key,
    jsonb_agg(jsonb_build_object(
      'id', id, 'monthKey', to_char(month_key, 'YYYY-MM'),
      'amountCarlos', amount_carlos, 'amountJulia', amount_julia,
      'dueDate', due_date, 'isPaid', is_paid, 'paidAt', paid_at
    ) ORDER BY month_key ASC) AS occurrences
  FROM monthly_budget_expenses
  WHERE repeat_group_id IS NOT NULL
  GROUP BY user_id, repeat_group_id
)
INSERT INTO monthly_budget_history_events (
  user_id, entity_kind, action, entity_group_id, anchor_entry_id, anchor_month_key,
  edit_scope, previous_event_id, occurred_at, before_snapshot, after_snapshot, affected_months, metadata
)
SELECT
  a.user_id, 'expense', 'imported', a.repeat_group_id, a.anchor_id, a.anchor_month_key,
  NULL, NULL, now(), NULL,
  jsonb_build_object(
    'name', a.name, 'amountCarlos', a.amount_carlos, 'amountJulia', a.amount_julia,
    'amountTotal', a.amount_carlos + a.amount_julia,
    'periodStart', to_char(a.anchor_month_key, 'YYYY-MM'),
    'periodEnd', to_char(g.last_month_key, 'YYYY-MM'),
    'monthsCount', g.months_count,
    'occurrences', g.occurrences
  ),
  g.affected_months,
  jsonb_build_object('source', 'backfill')
FROM anchor a
JOIN agg g USING (user_id, repeat_group_id)
WHERE NOT EXISTS (
  SELECT 1 FROM monthly_budget_history_events h WHERE h.entity_group_id = a.repeat_group_id
);

WITH anchor AS (
  SELECT DISTINCT ON (user_id, repeat_group_id)
    id AS anchor_id, user_id, repeat_group_id, month_key AS anchor_month_key,
    name, amount_carlos, amount_julia
  FROM monthly_budget_incomes
  WHERE repeat_group_id IS NOT NULL
  ORDER BY user_id, repeat_group_id, month_key ASC
),
agg AS (
  SELECT
    user_id, repeat_group_id,
    array_agg(month_key ORDER BY month_key ASC) AS affected_months,
    count(*) AS months_count,
    max(month_key) AS last_month_key,
    jsonb_agg(jsonb_build_object(
      'id', id, 'monthKey', to_char(month_key, 'YYYY-MM'),
      'amountCarlos', amount_carlos, 'amountJulia', amount_julia
    ) ORDER BY month_key ASC) AS occurrences
  FROM monthly_budget_incomes
  WHERE repeat_group_id IS NOT NULL
  GROUP BY user_id, repeat_group_id
)
INSERT INTO monthly_budget_history_events (
  user_id, entity_kind, action, entity_group_id, anchor_entry_id, anchor_month_key,
  edit_scope, previous_event_id, occurred_at, before_snapshot, after_snapshot, affected_months, metadata
)
SELECT
  a.user_id, 'income', 'imported', a.repeat_group_id, a.anchor_id, a.anchor_month_key,
  NULL, NULL, now(), NULL,
  jsonb_build_object(
    'name', a.name, 'amountCarlos', a.amount_carlos, 'amountJulia', a.amount_julia,
    'amountTotal', a.amount_carlos + a.amount_julia,
    'periodStart', to_char(a.anchor_month_key, 'YYYY-MM'),
    'periodEnd', to_char(g.last_month_key, 'YYYY-MM'),
    'monthsCount', g.months_count,
    'occurrences', g.occurrences
  ),
  g.affected_months,
  jsonb_build_object('source', 'backfill')
FROM anchor a
JOIN agg g USING (user_id, repeat_group_id)
WHERE NOT EXISTS (
  SELECT 1 FROM monthly_budget_history_events h WHERE h.entity_group_id = a.repeat_group_id
);

NOTIFY pgrst, 'reload schema';
