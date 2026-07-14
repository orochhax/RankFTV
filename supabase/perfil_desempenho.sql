-- =============================================================
-- RankFTV - estrutura de desempenho do perfil.
-- Esta migracao nao insere atletas nem resultados de demonstracao.
-- =============================================================

-- Cada resultado guarda a categoria em que o atleta competiu.
ALTER TABLE external_results
  ADD COLUMN IF NOT EXISTS categoria text;

DROP VIEW IF EXISTS ranking_entries;
CREATE VIEW ranking_entries AS
SELECT
  er.id,
  er.tournament_id,
  er.colocacao,
  er.pontos,
  er.parceiro_nome,
  ea.id AS athlete_id,
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
JOIN external_athletes ea ON ea.id = er.athlete_id
JOIN external_tournaments et ON et.id = er.tournament_id;

GRANT SELECT ON ranking_entries TO anon, authenticated;

-- Permite ao atleta escolher ate quatro conquistas para o perfil.
ALTER TABLE conquistas
  ADD COLUMN IF NOT EXISTS destaque_ordem int;

GRANT UPDATE ON conquistas TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'conquistas_update_own'
  ) THEN
    CREATE POLICY conquistas_update_own ON conquistas FOR UPDATE
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
