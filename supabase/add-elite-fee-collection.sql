-- =============================================================
-- ELITE — cobrança da ativação (R$178) por desconto progressivo.
--
-- O organizador não paga nada na hora. A "dívida" fica em
-- championships.premium_fee_pendente e é abatida dos repasses das
-- inscrições pagas até zerar. Estas funções fazem o abatimento de
-- forma ATÔMICA (FOR UPDATE) — duas inscrições pagas ao mesmo tempo
-- não descontam o mesmo valor duas vezes.
--
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.
-- =============================================================

-- Quanto da dívida Elite cada inscrição abateu (auditoria + estorno seguro).
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS elite_fee_coletada NUMERIC NOT NULL DEFAULT 0;

-- Abate até p_max da dívida do campeonato e retorna quanto foi efetivamente
-- abatido (min(dívida, p_max)). Se não for Elite ou a dívida já estiver zerada,
-- retorna 0.
CREATE OR REPLACE FUNCTION claim_elite_fee(p_champ_id uuid, p_max numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old      numeric;
  v_deducted numeric;
BEGIN
  IF p_max IS NULL OR p_max <= 0 THEN
    RETURN 0;
  END IF;

  -- Trava a linha do campeonato: serializa abatimentos concorrentes.
  SELECT premium_fee_pendente INTO v_old
    FROM championships
    WHERE id = p_champ_id AND is_elite = true
    FOR UPDATE;

  IF v_old IS NULL OR v_old <= 0 THEN
    RETURN 0;
  END IF;

  v_deducted := LEAST(v_old, p_max);

  UPDATE championships
    SET premium_fee_pendente = v_old - v_deducted
    WHERE id = p_champ_id;

  RETURN v_deducted;
END $$;

-- Devolve p_amount à dívida (transferência falhou ou inscrição estornada).
CREATE OR REPLACE FUNCTION release_elite_fee(p_champ_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;
  UPDATE championships
    SET premium_fee_pendente = premium_fee_pendente + p_amount
    WHERE id = p_champ_id;
END $$;

GRANT EXECUTE ON FUNCTION claim_elite_fee(uuid, numeric)   TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION release_elite_fee(uuid, numeric) TO service_role, authenticated;

NOTIFY pgrst, 'reload schema';
