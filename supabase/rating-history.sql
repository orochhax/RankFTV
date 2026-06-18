-- Histórico de rating por partida (Fase 2)
-- Execute no Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS rating_history (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  atleta_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  championship_id uuid        NOT NULL REFERENCES championships(id)  ON DELETE CASCADE,
  match_id        uuid        REFERENCES bracket_matches(id) ON DELETE SET NULL,
  rating_antes    int         NOT NULL,
  rating_depois   int         NOT NULL,
  resultado       text        NOT NULL CHECK (resultado IN ('vitoria', 'derrota')),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rating_history_atleta ON rating_history(atleta_id);
CREATE INDEX IF NOT EXISTS idx_rating_history_champ  ON rating_history(championship_id);

ALTER TABLE rating_history ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado lê seu próprio histórico; leitura pública para o ranking
DROP POLICY IF EXISTS rating_history_select ON rating_history;
CREATE POLICY rating_history_select ON rating_history FOR SELECT USING (true);

-- Só o service role / server action insere (não expor insert a clientes)
DROP POLICY IF EXISTS rating_history_insert ON rating_history;
CREATE POLICY rating_history_insert ON rating_history FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT ON rating_history TO anon, authenticated;
GRANT INSERT ON rating_history TO authenticated;
