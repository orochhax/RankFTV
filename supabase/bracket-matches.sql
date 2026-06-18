-- =============================================================
-- RANKFTV — Bracket de chaveamento (resultados persistidos)
-- Execute no Supabase SQL Editor.
-- =============================================================

CREATE TABLE IF NOT EXISTS bracket_matches (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  championship_id uuid NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  category_id     uuid NOT NULL REFERENCES championship_categories(id) ON DELETE CASCADE,
  round_index     int  NOT NULL,  -- 0 = primeira rodada (oitavas), cresce em direção à final
  match_index     int  NOT NULL,  -- posição dentro da rodada (0-based)
  team_a_id       uuid REFERENCES teams(id) ON DELETE SET NULL,
  team_b_id       uuid REFERENCES teams(id) ON DELETE SET NULL,
  sets_a          int,
  sets_b          int,
  winner_id       uuid REFERENCES teams(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (championship_id, category_id, round_index, match_index)
);

CREATE INDEX IF NOT EXISTS idx_bracket_championship ON bracket_matches(championship_id);
CREATE INDEX IF NOT EXISTS idx_bracket_category     ON bracket_matches(category_id);

ALTER TABLE bracket_matches ENABLE ROW LEVEL SECURITY;

-- Leitura pública (página do campeonato pode mostrar o bracket)
DROP POLICY IF EXISTS bracket_select ON bracket_matches;
CREATE POLICY bracket_select ON bracket_matches
  FOR SELECT USING (true);

-- Só o organizador dono do campeonato escreve
DROP POLICY IF EXISTS bracket_insert ON bracket_matches;
CREATE POLICY bracket_insert ON bracket_matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM championships c
      WHERE c.id = championship_id AND c.organizador_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS bracket_update ON bracket_matches;
CREATE POLICY bracket_update ON bracket_matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM championships c
      WHERE c.id = championship_id AND c.organizador_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS bracket_delete ON bracket_matches;
CREATE POLICY bracket_delete ON bracket_matches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM championships c
      WHERE c.id = championship_id AND c.organizador_id = auth.uid()
    )
  );

GRANT SELECT                   ON bracket_matches TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE   ON bracket_matches TO authenticated;
