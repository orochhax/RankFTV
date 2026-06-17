-- =============================================================
-- RANKFTV — Desempenho do perfil (Home): categoria por resultado,
-- conquistas em destaque e seed demo do Carlos (@rochhax).
-- Execute no Supabase SQL Editor. Pode rodar mais de uma vez.
--
-- Rode DEPOIS de seed_ranking.sql e seed_liga_ranking.sql.
-- =============================================================

-- ── 1. CATEGORIA POR RESULTADO ────────────────────────────────
-- Cada resultado passa a guardar a categoria (nível) em que o atleta
-- jogou aquele campeonato. Alimenta os cards "Nível" e "Evolução".
ALTER TABLE external_results
  ADD COLUMN IF NOT EXISTS categoria text;

-- Drop e recria a view (necessário porque CREATE OR REPLACE não permite
-- renomear colunas existentes — Postgres exige DROP + CREATE nesse caso).
DROP VIEW IF EXISTS ranking_entries;
CREATE VIEW ranking_entries AS
SELECT
  er.id,
  er.tournament_id,
  er.colocacao,
  er.pontos,
  er.parceiro_nome,
  ea.id          AS athlete_id,
  ea.nome,
  ea.instagram,
  ea.genero,
  ea.user_id,
  et.nome_circuito,
  et.tier,
  et.data,
  EXTRACT(YEAR FROM et.data)::int AS ano,
  er.categoria
FROM external_results er
JOIN external_athletes   ea ON ea.id = er.athlete_id
JOIN external_tournaments et ON et.id = er.tournament_id;

GRANT SELECT ON ranking_entries TO anon, authenticated;

-- ── 2. CONQUISTAS EM DESTAQUE ─────────────────────────────────
-- destaque_ordem: 1..4 = posição na Home; NULL = não destacada.
ALTER TABLE conquistas
  ADD COLUMN IF NOT EXISTS destaque_ordem int;

-- O dono precisa poder marcar/desmarcar as próprias conquistas.
GRANT UPDATE ON conquistas TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'conquistas_update_own'
  ) THEN
    CREATE POLICY conquistas_update_own ON conquistas FOR UPDATE
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ── 3. SEED DEMO DO CARLOS (@rochhax) ─────────────────────────
-- Cria um histórico de exemplo que SOBE de Estreante B até Profissional,
-- pra os cards Nível/Evolução e a página de histórico ficarem reais.
-- Pontos somam 1065 (igual à linha dele no ranking_individual abaixo).
DO $$
DECLARE
  v_user_id    uuid;
  v_athlete_id uuid;
  v_ev         record;
BEGIN
  SELECT id INTO v_user_id FROM profiles WHERE username = 'rochhax';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Perfil @rochhax não encontrado — seed do Carlos pulado.';
    RETURN;
  END IF;

  -- Atleta externo vinculado à conta do Carlos (a view usa esse user_id).
  INSERT INTO external_athletes (nome, instagram, genero, user_id)
  VALUES ('Carlos', 'rochhax', 'masculino', v_user_id)
  ON CONFLICT (instagram)
    DO UPDATE SET user_id = EXCLUDED.user_id, genero = EXCLUDED.genero
  RETURNING id INTO v_athlete_id;

  -- Limpa histórico anterior do Carlos (idempotência).
  DELETE FROM external_results WHERE athlete_id = v_athlete_id;

  -- 9 campeonatos, um por nível, em ordem crescente de categoria.
  FOR v_ev IN
    SELECT * FROM (VALUES
      ('Praia Cup — Estreantes',     '2023-02-18'::date, 'estreante_b',     3, 'Diego',     70),
      ('Arena Open',                 '2023-06-24'::date, 'estreante_a',     3, 'Diego',     85),
      ('Copa Litoral',               '2023-10-21'::date, 'iniciante_b',     2, 'Rafa',     100),
      ('Circuito Verão',             '2024-02-17'::date, 'iniciante_a',     2, 'Rafa',     110),
      ('Torneio da Cidade',          '2024-06-22'::date, 'intermediario_b', 1, 'Bruno',    120),
      ('Open Regional',              '2024-10-19'::date, 'intermediario_a', 2, 'Bruno',    130),
      ('Desafio dos Campeões',       '2025-03-15'::date, 'avancado_b',      1, 'Léo',      140),
      ('Master Cup',                 '2025-08-23'::date, 'avancado_a',      2, 'Léo',      150),
      ('Team Águia Footvolley Cup',  '2026-02-21'::date, 'profissional',    1, 'Léo',      160)
    ) AS x(nome, data, categoria, colocacao, parceiro, pontos)
  LOOP
    INSERT INTO external_tournaments (nome_circuito, tier, data)
    VALUES (v_ev.nome, 'nacional', v_ev.data)
    ON CONFLICT (nome_circuito, data) DO NOTHING;

    INSERT INTO external_results (tournament_id, athlete_id, colocacao, parceiro_nome, pontos, categoria)
    SELECT et.id, v_athlete_id, v_ev.colocacao, v_ev.parceiro, v_ev.pontos, v_ev.categoria
    FROM external_tournaments et
    WHERE et.nome_circuito = v_ev.nome AND et.data = v_ev.data;
  END LOOP;
END $$;

-- ── 4. CARLOS NO RANKING GERAL (card "Rank") ──────────────────
-- A posição (#) é calculada na hora pela aplicação (quantos têm mais
-- pontos). Pontos = 1065 (mesma soma do histórico acima).
DELETE FROM ranking_individual WHERE instagram = 'rochhax';
INSERT INTO ranking_individual (nome, instagram, genero, pontos)
VALUES ('Carlos', 'rochhax', 'masculino', 1065);

-- ── FIM ──────────────────────────────────────────────────────
-- Confira:
--   SELECT categoria, colocacao, pontos FROM ranking_entries
--   WHERE instagram='rochhax' ORDER BY data;
