-- =============================================================
-- RANKFTV — Hardening: Elo/rating como ledger idempotente
--
-- Antes: app/painel/campeonatos/[id]/chaveamento/actions.ts aplicava o
-- delta de Elo só quando "há vencedor novo" (winner_id mudou), mas nunca
-- revertia o delta anterior — editar um placar que troca o vencedor
-- empilhava dois deltas calculados sobre ratings diferentes (o segundo já
-- em cima do primeiro aplicado), e limpar um placar (clearScore) não
-- revertia rating nenhum, deixando o efeito de um resultado apagado preso
-- pra sempre no rating dos atletas.
--
-- Agora: toda escrita de placar (salvar, editar, limpar, resetar bracket)
-- passa pelas funções abaixo, que primeiro revertem qualquer aplicação
-- anterior daquela partida (usando o próprio rating_history como registro
-- do que foi aplicado) e só depois aplicam o resultado atual — sempre a
-- partir do rating "limpo" (pós-reversão), nunca empilhando.
--
-- Idempotente — pode rodar mais de uma vez.
-- =============================================================

CREATE OR REPLACE FUNCTION apply_bracket_match_rating(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match        record;
  v_hist         record;
  v_delta        int;
  v_team_a       record;
  v_team_b       record;
  v_winner_team  record;
  v_loser_team   record;
  v_rw1 int; v_rw2 int; v_rl1 int; v_rl2 int;
  v_avg_w numeric; v_avg_l numeric;
  v_ew numeric;
  v_delta_w int; v_delta_l int;
  v_ids   uuid[] := ARRAY[]::uuid[];
  v_deltas int[] := ARRAY[]::int[];
  v_antes  int[] := ARRAY[]::int[];
  v_res    text[] := ARRAY[]::text[];
  v_depois int;
  i int;
  K constant int := 32;
  DEFAULT_RATING constant int := 1000;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('bracket_match_rating:' || p_match_id::text, 0));

  SELECT team_a_id, team_b_id, winner_id, championship_id
    INTO v_match
    FROM bracket_matches WHERE id = p_match_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- ── Reverte qualquer aplicação anterior desta partida ──────────────────
  FOR v_hist IN
    SELECT id, atleta_id, rating_antes, rating_depois
    FROM rating_history WHERE match_id = p_match_id
  LOOP
    v_delta := v_hist.rating_depois - v_hist.rating_antes;
    UPDATE profiles SET rating = GREATEST(0, COALESCE(rating, 0) - v_delta) WHERE id = v_hist.atleta_id;
  END LOOP;
  DELETE FROM rating_history WHERE match_id = p_match_id;

  -- Placar limpo ou times incompletos: só a reversão acima já resolve.
  IF v_match.winner_id IS NULL OR v_match.team_a_id IS NULL OR v_match.team_b_id IS NULL THEN
    RETURN;
  END IF;

  SELECT atleta1_id, atleta2_id INTO v_team_a FROM teams WHERE id = v_match.team_a_id;
  SELECT atleta1_id, atleta2_id INTO v_team_b FROM teams WHERE id = v_match.team_b_id;
  IF v_team_a.atleta1_id IS NULL OR v_team_b.atleta1_id IS NULL THEN RETURN; END IF;

  IF v_match.winner_id = v_match.team_a_id THEN
    v_winner_team := v_team_a; v_loser_team := v_team_b;
  ELSIF v_match.winner_id = v_match.team_b_id THEN
    v_winner_team := v_team_b; v_loser_team := v_team_a;
  ELSE
    RETURN; -- winner_id não bate com nenhum dos dois times (dado inconsistente) — não aplica.
  END IF;

  -- Trava as linhas de profiles envolvidas em ordem estável, pra não dar
  -- deadlock com outra partida concorrente que compartilhe atleta.
  PERFORM 1 FROM profiles
    WHERE id = ANY (ARRAY[v_winner_team.atleta1_id, v_winner_team.atleta2_id, v_loser_team.atleta1_id, v_loser_team.atleta2_id])
    ORDER BY id FOR UPDATE;

  SELECT COALESCE(NULLIF(rating, 0), DEFAULT_RATING) INTO v_rw1 FROM profiles WHERE id = v_winner_team.atleta1_id;
  SELECT COALESCE(NULLIF(rating, 0), DEFAULT_RATING) INTO v_rl1 FROM profiles WHERE id = v_loser_team.atleta1_id;
  v_rw2 := NULL; v_rl2 := NULL;
  IF v_winner_team.atleta2_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(rating, 0), DEFAULT_RATING) INTO v_rw2 FROM profiles WHERE id = v_winner_team.atleta2_id;
  END IF;
  IF v_loser_team.atleta2_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(rating, 0), DEFAULT_RATING) INTO v_rl2 FROM profiles WHERE id = v_loser_team.atleta2_id;
  END IF;

  v_avg_w := CASE WHEN v_rw2 IS NOT NULL THEN (v_rw1 + v_rw2) / 2.0 ELSE v_rw1::numeric END;
  v_avg_l := CASE WHEN v_rl2 IS NOT NULL THEN (v_rl1 + v_rl2) / 2.0 ELSE v_rl1::numeric END;

  v_ew      := 1.0 / (1.0 + power(10, (v_avg_l - v_avg_w) / 400.0));
  v_delta_w := round((K * (1 - v_ew))::numeric)::int;
  v_delta_l := round((K * (0 - (1 - v_ew)))::numeric)::int;

  v_ids := array_append(v_ids, v_winner_team.atleta1_id);
  v_deltas := array_append(v_deltas, v_delta_w);
  v_antes  := array_append(v_antes, v_rw1);
  v_res    := array_append(v_res, 'vitoria');
  IF v_winner_team.atleta2_id IS NOT NULL THEN
    v_ids := array_append(v_ids, v_winner_team.atleta2_id);
    v_deltas := array_append(v_deltas, v_delta_w);
    v_antes  := array_append(v_antes, v_rw2);
    v_res    := array_append(v_res, 'vitoria');
  END IF;
  v_ids := array_append(v_ids, v_loser_team.atleta1_id);
  v_deltas := array_append(v_deltas, v_delta_l);
  v_antes  := array_append(v_antes, v_rl1);
  v_res    := array_append(v_res, 'derrota');
  IF v_loser_team.atleta2_id IS NOT NULL THEN
    v_ids := array_append(v_ids, v_loser_team.atleta2_id);
    v_deltas := array_append(v_deltas, v_delta_l);
    v_antes  := array_append(v_antes, v_rl2);
    v_res    := array_append(v_res, 'derrota');
  END IF;

  FOR i IN 1..array_length(v_ids, 1) LOOP
    v_depois := GREATEST(0, v_antes[i] + v_deltas[i]);
    UPDATE profiles SET rating = v_depois WHERE id = v_ids[i];
    INSERT INTO rating_history (atleta_id, championship_id, match_id, rating_antes, rating_depois, resultado)
      VALUES (v_ids[i], v_match.championship_id, p_match_id, v_antes[i], v_depois, v_res[i]);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION apply_bracket_match_rating(uuid) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION apply_bracket_match_rating(uuid) TO service_role;

-- ── Reverte todo o rating aplicado pelas partidas de uma categoria ────────
-- Usada antes de generateBracket/resetBracket apagarem bracket_matches: sem
-- isso, apagar as partidas orfanava rating_history (match_id vira NULL por
-- ON DELETE SET NULL) e o rating aplicado ficava preso pra sempre, sem
-- nenhum jeito de reverter depois.
CREATE OR REPLACE FUNCTION reverse_bracket_category_ratings(p_championship_id uuid, p_category_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hist record;
  v_delta int;
BEGIN
  FOR v_hist IN
    SELECT rh.id, rh.atleta_id, rh.rating_antes, rh.rating_depois
    FROM rating_history rh
    JOIN bracket_matches bm ON bm.id = rh.match_id
    WHERE bm.championship_id = p_championship_id AND bm.category_id = p_category_id
  LOOP
    v_delta := v_hist.rating_depois - v_hist.rating_antes;
    UPDATE profiles SET rating = GREATEST(0, COALESCE(rating, 0) - v_delta) WHERE id = v_hist.atleta_id;
    DELETE FROM rating_history WHERE id = v_hist.id;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION reverse_bracket_category_ratings(uuid, uuid) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION reverse_bracket_category_ratings(uuid, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'harden-rating-ledger-idempotency done';
