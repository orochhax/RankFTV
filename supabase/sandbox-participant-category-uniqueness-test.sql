-- RankFTV - disposable functional check for participant/category uniqueness.
--
-- Run ONLY in the RankFTV Sandbox SQL Editor, after
-- production-participant-category-uniqueness.sql. It performs no provider call
-- and ends with ROLLBACK, so no test row remains in the Sandbox.

BEGIN;

DO $$
DECLARE
  v_source public.athlete_tickets%ROWTYPE;
  v_other_category uuid;
  v_ticket_id uuid;
  v_team_id uuid;
  v_cpf_a text;
  v_cpf_b text;
  v_blocked boolean;
BEGIN
  -- Use an existing active Sandbox athlete ticket as the identity being protected.
  SELECT * INTO v_source
  FROM public.athlete_tickets
  WHERE status_pagamento = 'pago'
    AND category_id IS NOT NULL
    AND user_id IS NOT NULL
  ORDER BY created_at
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEST_SETUP_FAILED: active athlete ticket with linked account not found';
  END IF;

  SELECT id INTO v_other_category
  FROM public.championship_categories
  WHERE championship_id = v_source.championship_id
    AND id <> v_source.category_id
  ORDER BY created_at
  LIMIT 1;

  IF v_other_category IS NULL THEN
    RAISE EXCEPTION 'TEST_SETUP_FAILED: a second category is required in the same championship';
  END IF;

  -- Same buyer in the same category must be blocked before any payment is created.
  v_blocked := false;
  BEGIN
    INSERT INTO public.athlete_tickets (
      championship_id, category_id, comprador_nome, comprador_cpf, comprador_email,
      parceiro_nome, parceiro_cpf, user_id
    ) VALUES (
      v_source.championship_id, v_source.category_id,
      'Teste comprador duplicado', v_source.comprador_cpf,
      'duplicate-buyer@example.invalid', 'Parceiro de teste', '90000000001', v_source.user_id
    );
  EXCEPTION WHEN unique_violation THEN
    v_blocked := SQLERRM LIKE '%PARTICIPANT_ALREADY_REGISTERED%';
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'TEST_FAILED: duplicate buyer in same category was accepted';
  END IF;

  -- The same protected identity cannot evade the rule as the partner.
  v_blocked := false;
  BEGIN
    INSERT INTO public.athlete_tickets (
      championship_id, category_id, comprador_nome, comprador_cpf, comprador_email,
      parceiro_nome, parceiro_cpf
    ) VALUES (
      v_source.championship_id, v_source.category_id,
      'Outro comprador', '90000000002', 'duplicate-partner@example.invalid',
      'Teste parceiro duplicado', v_source.comprador_cpf
    );
  EXCEPTION WHEN unique_violation THEN
    v_blocked := SQLERRM LIKE '%PARTICIPANT_ALREADY_REGISTERED%';
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'TEST_FAILED: duplicate partner in same category was accepted';
  END IF;

  -- Cross-flow protection: an authenticated team cannot reuse this quick-checkout identity.
  v_blocked := false;
  BEGIN
    INSERT INTO public.teams (championship_id, category_id, atleta1_id, status)
    VALUES (v_source.championship_id, v_source.category_id, v_source.user_id, 'convite_pendente');
  EXCEPTION WHEN unique_violation THEN
    v_blocked := SQLERRM LIKE '%PARTICIPANT_ALREADY_REGISTERED%';
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'TEST_FAILED: cross-flow duplicate was accepted';
  END IF;

  -- The same account remains allowed in a different category in the championship.
  INSERT INTO public.teams (championship_id, category_id, atleta1_id, status)
  VALUES (v_source.championship_id, v_other_category, v_source.user_id, 'convite_pendente')
  RETURNING id INTO v_team_id;
  UPDATE public.teams SET status = 'cancelado' WHERE id = v_team_id;

  INSERT INTO public.athlete_tickets (
    championship_id, category_id, comprador_nome, comprador_cpf, comprador_email,
    parceiro_nome, parceiro_cpf, user_id
  ) VALUES (
    v_source.championship_id, v_other_category,
    'Teste categoria diferente', v_source.comprador_cpf,
    'different-category@example.invalid', 'Parceiro de teste', '90000000003', v_source.user_id
  );

  -- A terminal row frees the same category for a new purchase.
  v_cpf_a := (floor(random() * 90000000000 + 10000000000)::bigint)::text;
  v_cpf_b := (v_cpf_a::bigint + 1)::text;
  INSERT INTO public.athlete_tickets (
    championship_id, category_id, comprador_nome, comprador_cpf, comprador_email,
    parceiro_nome, parceiro_cpf
  ) VALUES (
    v_source.championship_id, v_source.category_id,
    'Teste liberacao apos terminal', v_cpf_a,
    'terminal-release@example.invalid', 'Parceiro de teste', v_cpf_b
  ) RETURNING id INTO v_ticket_id;

  UPDATE public.athlete_tickets
  SET status_pagamento = 'expirado'
  WHERE id = v_ticket_id;

  INSERT INTO public.athlete_tickets (
    championship_id, category_id, comprador_nome, comprador_cpf, comprador_email,
    parceiro_nome, parceiro_cpf
  ) VALUES (
    v_source.championship_id, v_source.category_id,
    'Teste nova compra apos terminal', v_cpf_a,
    'terminal-release-second@example.invalid', 'Outro parceiro', v_cpf_b
  );

  RAISE NOTICE 'PASS: buyer, partner, cross-flow, different category and terminal release';
END;
$$;

ROLLBACK;
