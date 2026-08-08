-- Carteira em Rota: plano patrimonial versionado.
-- Migração aditiva e idempotente. Execute depois de performance-widgets.sql.
-- As tabelas existentes de snapshots, aportes e retiradas continuam canônicas.

CREATE TABLE IF NOT EXISTS public.perf_investment_plan (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_investment_plan_name_valid
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT perf_investment_plan_lifecycle_valid CHECK (
    (active AND completed_at IS NULL AND archived_at IS NULL)
    OR
    (NOT active AND num_nonnulls(completed_at, archived_at) = 1)
  ),
  CONSTRAINT perf_investment_plan_id_user_unique UNIQUE (id, user_id)
);

-- Só existe um destino principal ativo por proprietário. Planos concluídos ou
-- arquivados permanecem disponíveis no histórico.
CREATE UNIQUE INDEX IF NOT EXISTS perf_investment_plan_one_active_idx
  ON public.perf_investment_plan(user_id)
  WHERE active;
CREATE INDEX IF NOT EXISTS perf_investment_plan_user_created_idx
  ON public.perf_investment_plan(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.perf_investment_plan_revision (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL,
  effective_from date NOT NULL,
  baseline_date date NOT NULL,
  baseline_value numeric(18,2) NOT NULL,
  target_value numeric(18,2) NOT NULL,
  target_date date NOT NULL,
  value_mode text NOT NULL,
  value_reference_date date NOT NULL,
  planned_monthly_contribution numeric(18,2) NOT NULL,
  annual_return_conservative numeric(12,8) NOT NULL,
  annual_return_base numeric(12,8) NOT NULL,
  annual_return_favorable numeric(12,8) NOT NULL,
  annual_inflation numeric(12,8) NOT NULL,
  change_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_investment_revision_plan_owner_fk
    FOREIGN KEY (plan_id, user_id)
    REFERENCES public.perf_investment_plan(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT perf_investment_revision_version_valid CHECK (version > 0),
  CONSTRAINT perf_investment_revision_baseline_value_valid
    CHECK (baseline_value >= 0 AND baseline_value <= 999999999999.99),
  CONSTRAINT perf_investment_revision_target_value_valid
    CHECK (target_value > 0 AND target_value <= 999999999999.99),
  CONSTRAINT perf_investment_revision_contribution_valid
    CHECK (planned_monthly_contribution >= 0 AND planned_monthly_contribution <= 999999999999.99),
  CONSTRAINT perf_investment_revision_dates_valid CHECK (
    target_date > baseline_date
    AND effective_from >= baseline_date
    AND effective_from <= target_date
    AND target_date <= (baseline_date + INTERVAL '100 years')::date
  ),
  CONSTRAINT perf_investment_revision_value_mode_valid
    CHECK (value_mode IN ('real', 'nominal')),
  CONSTRAINT perf_investment_revision_rates_valid CHECK (
    annual_return_conservative > -1
    AND annual_return_base > -1
    AND annual_return_favorable > -1
    AND annual_inflation > -1
    AND annual_return_conservative <= 10
    AND annual_return_base <= 10
    AND annual_return_favorable <= 10
    AND annual_inflation <= 10
    AND annual_return_conservative <= annual_return_base
    AND annual_return_base <= annual_return_favorable
  ),
  CONSTRAINT perf_investment_revision_note_valid
    CHECK (change_note IS NULL OR char_length(change_note) <= 1000),
  CONSTRAINT perf_investment_revision_plan_version_unique UNIQUE (plan_id, version)
);

CREATE INDEX IF NOT EXISTS perf_investment_revision_user_effective_idx
  ON public.perf_investment_plan_revision(user_id, effective_from DESC, version DESC);
CREATE INDEX IF NOT EXISTS perf_investment_revision_plan_effective_idx
  ON public.perf_investment_plan_revision(plan_id, effective_from DESC, version DESC);

CREATE OR REPLACE FUNCTION public.perf_touch_investment_plan_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS perf_investment_plan_touch_updated_at
  ON public.perf_investment_plan;
CREATE TRIGGER perf_investment_plan_touch_updated_at
  BEFORE UPDATE ON public.perf_investment_plan
  FOR EACH ROW
  EXECUTE FUNCTION public.perf_touch_investment_plan_updated_at();

-- Revisões são append-only. Exclusões continuam possíveis somente por cascata
-- administrativa (por exemplo, remoção definitiva da conta em auth.users).
CREATE OR REPLACE FUNCTION public.perf_reject_investment_revision_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'investment plan revisions are immutable';
END;
$$;

DROP TRIGGER IF EXISTS perf_investment_revision_immutable
  ON public.perf_investment_plan_revision;
CREATE TRIGGER perf_investment_revision_immutable
  BEFORE UPDATE ON public.perf_investment_plan_revision
  FOR EACH ROW
  EXECUTE FUNCTION public.perf_reject_investment_revision_update();

ALTER TABLE public.perf_investment_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perf_investment_plan_revision ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_all ON public.perf_investment_plan;
CREATE POLICY owner_all ON public.perf_investment_plan
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS owner_all ON public.perf_investment_plan_revision;
CREATE POLICY owner_all ON public.perf_investment_plan_revision
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Cria a identidade do plano e sua revisão 1 na mesma transação. user_id nunca
-- vem do cliente: é derivado exclusivamente da sessão autenticada.
CREATE OR REPLACE FUNCTION public.perf_create_investment_plan(
  p_name text,
  p_baseline_date date,
  p_baseline_value numeric,
  p_target_value numeric,
  p_target_date date,
  p_value_mode text,
  p_value_reference_date date,
  p_planned_monthly_contribution numeric,
  p_annual_return_conservative numeric,
  p_annual_return_base numeric,
  p_annual_return_favorable numeric,
  p_annual_inflation numeric,
  p_effective_from date,
  p_change_note text,
  p_create_initial_snapshot boolean,
  p_initial_snapshot_value numeric,
  p_initial_snapshot_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bahia')::date;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'authentication required';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_user_id AND role = 'ceo'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'owner access required';
  END IF;

  IF p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid plan name';
  END IF;
  IF p_baseline_date IS NULL OR p_target_date IS NULL
     OR p_value_reference_date IS NULL OR p_effective_from IS NULL
     OR p_baseline_date > v_today OR p_value_reference_date > v_today
     OR p_target_date <= p_baseline_date
     OR p_effective_from < p_baseline_date
     OR p_effective_from <> v_today
     OR p_effective_from > p_target_date
     OR p_target_date > (p_baseline_date + INTERVAL '100 years')::date THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid plan dates';
  END IF;
  IF p_baseline_value IS NULL OR p_baseline_value < 0 OR p_baseline_value > 999999999999.99
     OR p_target_value IS NULL OR p_target_value <= 0 OR p_target_value > 999999999999.99
     OR p_planned_monthly_contribution IS NULL OR p_planned_monthly_contribution < 0
     OR p_planned_monthly_contribution > 999999999999.99 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid plan amounts';
  END IF;
  IF p_value_mode IS NULL OR p_value_mode NOT IN ('real', 'nominal') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid value mode';
  END IF;
  IF p_annual_return_conservative IS NULL OR p_annual_return_base IS NULL
     OR p_annual_return_favorable IS NULL OR p_annual_inflation IS NULL
     OR p_annual_return_conservative <= -1 OR p_annual_return_base <= -1
     OR p_annual_return_favorable <= -1 OR p_annual_inflation <= -1
     OR p_annual_return_conservative > 10 OR p_annual_return_base > 10
     OR p_annual_return_favorable > 10 OR p_annual_inflation > 10
     OR p_annual_return_conservative > p_annual_return_base
     OR p_annual_return_base > p_annual_return_favorable THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid plan rates';
  END IF;
  IF p_change_note IS NOT NULL AND char_length(p_change_note) > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid change note';
  END IF;
  IF p_create_initial_snapshot IS NULL
     OR (p_create_initial_snapshot AND (
       p_initial_snapshot_value IS NULL
       OR p_initial_snapshot_value < 0
       OR p_initial_snapshot_value > 999999999999.99
     ))
     OR (p_initial_snapshot_notes IS NOT NULL AND char_length(p_initial_snapshot_notes) > 1000) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid initial snapshot options';
  END IF;
  IF p_create_initial_snapshot AND p_baseline_date <> v_today THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'initial snapshot date must be today';
  END IF;
  IF p_create_initial_snapshot AND EXISTS (
    SELECT 1
    FROM public.perf_portfolio_snapshot
    WHERE user_id = v_user_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'perf_portfolio_snapshot history is no longer empty';
  END IF;

  INSERT INTO public.perf_investment_plan (user_id, name)
  VALUES (v_user_id, btrim(p_name))
  RETURNING id INTO v_plan_id;

  INSERT INTO public.perf_investment_plan_revision (
    plan_id, user_id, version, effective_from, baseline_date, baseline_value,
    target_value, target_date, value_mode, value_reference_date,
    planned_monthly_contribution, annual_return_conservative,
    annual_return_base, annual_return_favorable, annual_inflation, change_note
  ) VALUES (
    v_plan_id, v_user_id, 1, p_effective_from, p_baseline_date, p_baseline_value,
    p_target_value, p_target_date, p_value_mode, p_value_reference_date,
    p_planned_monthly_contribution, p_annual_return_conservative,
    p_annual_return_base, p_annual_return_favorable, p_annual_inflation,
    COALESCE(NULLIF(btrim(p_change_note), ''), 'Plano criado.')
  );

  IF p_create_initial_snapshot THEN
    INSERT INTO public.perf_portfolio_snapshot (
      user_id, date, total_value, previous_value, variation_amount,
      variation_percentage, movement, notes
    ) VALUES (
      v_user_id, p_baseline_date, p_initial_snapshot_value, NULL, NULL,
      NULL, 'stable', COALESCE(NULLIF(btrim(p_initial_snapshot_notes), ''), 'Check-in inicial criado com o plano da Carteira em Rota.')
    );
  END IF;

  RETURN v_plan_id;
END;
$$;

-- Serializa revisões concorrentes pelo lock da linha do plano e atribui a
-- próxima versão dentro da mesma transação.
DROP FUNCTION IF EXISTS public.perf_create_investment_plan_revision(
  uuid, text, date, numeric, numeric, date, text, date, numeric,
  numeric, numeric, numeric, numeric, date, text
);

CREATE OR REPLACE FUNCTION public.perf_create_investment_plan_revision(
  p_plan_id uuid,
  p_name text,
  p_baseline_date date,
  p_baseline_value numeric,
  p_target_value numeric,
  p_target_date date,
  p_value_mode text,
  p_value_reference_date date,
  p_planned_monthly_contribution numeric,
  p_annual_return_conservative numeric,
  p_annual_return_base numeric,
  p_annual_return_favorable numeric,
  p_annual_inflation numeric,
  p_effective_from date,
  p_change_note text,
  p_expected_version integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan_active boolean;
  v_latest_effective_from date;
  v_latest_value_mode text;
  v_latest_reference_date date;
  v_latest_version integer;
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bahia')::date;
  v_next_month date := (date_trunc('month', v_today::timestamp) + INTERVAL '1 month')::date;
  v_version integer;
  v_revision_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'authentication required';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_user_id AND role = 'ceo'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'owner access required';
  END IF;

  SELECT active
  INTO v_plan_active
  FROM public.perf_investment_plan
  WHERE id = p_plan_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'plan not found';
  END IF;
  IF NOT v_plan_active THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'plan is closed';
  END IF;

  -- O lock do plano serializa esta leitura com qualquer outra revisão. Uma
  -- versão nova nunca pode voltar no tempo nem anteceder uma versão agendada.
  SELECT effective_from, value_mode, value_reference_date, version
  INTO v_latest_effective_from, v_latest_value_mode, v_latest_reference_date, v_latest_version
  FROM public.perf_investment_plan_revision
  WHERE plan_id = p_plan_id AND user_id = v_user_id
  ORDER BY version DESC
  LIMIT 1;

  IF v_latest_version IS NULL
     OR p_expected_version IS NULL
     OR p_expected_version <> v_latest_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'investment revision conflict';
  END IF;

  IF p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid plan name';
  END IF;
  IF p_baseline_date IS NULL OR p_target_date IS NULL
     OR p_value_reference_date IS NULL OR p_effective_from IS NULL
     OR p_target_date <= p_baseline_date
     OR p_effective_from < p_baseline_date
     OR p_effective_from < v_today
     OR p_effective_from NOT IN (v_today, v_next_month)
     OR (v_latest_effective_from IS NOT NULL AND p_effective_from < v_latest_effective_from)
     OR p_effective_from > p_target_date
     OR p_target_date > (p_baseline_date + INTERVAL '100 years')::date THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid plan dates';
  END IF;
  IF p_baseline_value IS NULL OR p_baseline_value < 0 OR p_baseline_value > 999999999999.99
     OR p_target_value IS NULL OR p_target_value <= 0 OR p_target_value > 999999999999.99
     OR p_planned_monthly_contribution IS NULL OR p_planned_monthly_contribution < 0
     OR p_planned_monthly_contribution > 999999999999.99 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid plan amounts';
  END IF;
  IF p_value_mode IS NULL OR p_value_mode NOT IN ('real', 'nominal') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid value mode';
  END IF;
  IF p_value_mode IS DISTINCT FROM v_latest_value_mode
     OR p_value_reference_date IS DISTINCT FROM v_latest_reference_date THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'monetary reference cannot change inside an active plan';
  END IF;
  IF p_annual_return_conservative IS NULL OR p_annual_return_base IS NULL
     OR p_annual_return_favorable IS NULL OR p_annual_inflation IS NULL
     OR p_annual_return_conservative <= -1 OR p_annual_return_base <= -1
     OR p_annual_return_favorable <= -1 OR p_annual_inflation <= -1
     OR p_annual_return_conservative > 10 OR p_annual_return_base > 10
     OR p_annual_return_favorable > 10 OR p_annual_inflation > 10
     OR p_annual_return_conservative > p_annual_return_base
     OR p_annual_return_base > p_annual_return_favorable THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid plan rates';
  END IF;
  IF p_change_note IS NOT NULL AND char_length(p_change_note) > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid change note';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_version
  FROM public.perf_investment_plan_revision
  WHERE plan_id = p_plan_id;

  INSERT INTO public.perf_investment_plan_revision (
    plan_id, user_id, version, effective_from, baseline_date, baseline_value,
    target_value, target_date, value_mode, value_reference_date,
    planned_monthly_contribution, annual_return_conservative,
    annual_return_base, annual_return_favorable, annual_inflation, change_note
  ) VALUES (
    p_plan_id, v_user_id, v_version, p_effective_from, p_baseline_date,
    p_baseline_value, p_target_value, p_target_date, p_value_mode,
    p_value_reference_date, p_planned_monthly_contribution,
    p_annual_return_conservative, p_annual_return_base,
    p_annual_return_favorable, p_annual_inflation,
    COALESCE(NULLIF(btrim(p_change_note), ''), 'Plano ajustado.')
  )
  RETURNING id INTO v_revision_id;

  UPDATE public.perf_investment_plan
  SET name = btrim(p_name)
  WHERE id = p_plan_id AND user_id = v_user_id;

  RETURN v_revision_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.perf_close_investment_plan(
  p_plan_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan_active boolean;
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bahia')::date;
  v_value_mode text;
  v_value_reference_date date;
  v_annual_inflation numeric;
  v_target_value numeric;
  v_snapshot_date date;
  v_snapshot_value numeric;
  v_contribution_value numeric := 0;
  v_withdrawal_value numeric := 0;
  v_current_value numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'authentication required';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_user_id AND role = 'ceo'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'owner access required';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('completed', 'archived') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid plan status';
  END IF;

  -- O mesmo lock usado pela criacao de revisoes serializa "ajustar" e
  -- "encerrar". Assim, a conclusao nunca valida uma revisao parcialmente
  -- concorrente e uma revisao atrasada nao reabre um plano ja encerrado.
  SELECT active
  INTO v_plan_active
  FROM public.perf_investment_plan
  WHERE id = p_plan_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'plan not found';
  END IF;
  IF NOT v_plan_active THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'plan is closed';
  END IF;

  IF p_status = 'completed' THEN
    -- A conclusao e rara e definitiva. Estes locks curtos fazem a leitura do
    -- check-in e dos fluxos esperar por escritas em andamento e impedem que
    -- outra escrita atravesse a validacao antes do encerramento da transacao.
    LOCK TABLE public.perf_portfolio_snapshot IN SHARE MODE;
    LOCK TABLE public.perf_investment_contribution IN SHARE MODE;
    LOCK TABLE public.perf_investment_withdrawal IN SHARE MODE;

    -- Uma revisao futura pode orientar a projecao, mas nao e o contrato vigente
    -- hoje. A conclusao sempre compara com a ultima revisao ja efetiva.
    SELECT value_mode, value_reference_date, annual_inflation, target_value
    INTO v_value_mode, v_value_reference_date, v_annual_inflation, v_target_value
    FROM public.perf_investment_plan_revision
    WHERE plan_id = p_plan_id
      AND user_id = v_user_id
      AND effective_from <= v_today
    ORDER BY effective_from DESC, version DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'investment target not reached';
    END IF;

    SELECT date, total_value
    INTO v_snapshot_date, v_snapshot_value
    FROM public.perf_portfolio_snapshot
    WHERE user_id = v_user_id AND date <= v_today
    ORDER BY date DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'investment target not reached';
    END IF;

    IF v_value_mode = 'real' THEN
      v_snapshot_value := v_snapshot_value / power(
        1 + v_annual_inflation,
        (
          (EXTRACT(YEAR FROM v_snapshot_date) - EXTRACT(YEAR FROM v_value_reference_date)) * 12
          + EXTRACT(MONTH FROM v_snapshot_date) - EXTRACT(MONTH FROM v_value_reference_date)
        ) / 12
      );
    END IF;

    SELECT COALESCE(SUM(
      CASE
        WHEN v_value_mode = 'real' THEN amount / power(
          1 + v_annual_inflation,
          (
            (EXTRACT(YEAR FROM date) - EXTRACT(YEAR FROM v_value_reference_date)) * 12
            + EXTRACT(MONTH FROM date) - EXTRACT(MONTH FROM v_value_reference_date)
          ) / 12
        )
        ELSE amount
      END
    ), 0)
    INTO v_contribution_value
    FROM public.perf_investment_contribution
    WHERE user_id = v_user_id
      AND date > v_snapshot_date
      AND date <= v_today;

    SELECT COALESCE(SUM(
      CASE
        WHEN v_value_mode = 'real' THEN amount / power(
          1 + v_annual_inflation,
          (
            (EXTRACT(YEAR FROM date) - EXTRACT(YEAR FROM v_value_reference_date)) * 12
            + EXTRACT(MONTH FROM date) - EXTRACT(MONTH FROM v_value_reference_date)
          ) / 12
        )
        ELSE amount
      END
    ), 0)
    INTO v_withdrawal_value
    FROM public.perf_investment_withdrawal
    WHERE user_id = v_user_id
      AND date > v_snapshot_date
      AND date <= v_today;

    v_current_value := v_snapshot_value + v_contribution_value - v_withdrawal_value;
    IF v_current_value < v_target_value THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'investment target not reached';
    END IF;
  END IF;

  UPDATE public.perf_investment_plan
  SET active = false,
      completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE NULL END,
      archived_at = CASE WHEN p_status = 'archived' THEN now() ELSE NULL END
  WHERE id = p_plan_id AND user_id = v_user_id AND active;

  RETURN true;
END;
$$;

-- O navegador só lê plano/revisões. Toda escrita passa pelas RPCs acima, que
-- derivam auth.uid(), validam propriedade e preservam a atomicidade/versionamento.
REVOKE ALL ON TABLE public.perf_investment_plan FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.perf_investment_plan_revision FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.perf_investment_plan TO authenticated;
GRANT SELECT ON TABLE public.perf_investment_plan_revision TO authenticated;

REVOKE ALL ON FUNCTION public.perf_touch_investment_plan_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.perf_reject_investment_revision_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.perf_create_investment_plan(
  text, date, numeric, numeric, date, text, date, numeric,
  numeric, numeric, numeric, numeric, date, text, boolean, numeric, text
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.perf_create_investment_plan_revision(
  uuid, text, date, numeric, numeric, date, text, date, numeric,
  numeric, numeric, numeric, numeric, date, text, integer
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.perf_close_investment_plan(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.perf_create_investment_plan(
  text, date, numeric, numeric, date, text, date, numeric,
  numeric, numeric, numeric, numeric, date, text, boolean, numeric, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perf_create_investment_plan_revision(
  uuid, text, date, numeric, numeric, date, text, date, numeric,
  numeric, numeric, numeric, numeric, date, text, integer
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perf_close_investment_plan(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
