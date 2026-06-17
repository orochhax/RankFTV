-- Seguidores de páginas de série de campeonato.
-- series_id é TEXT sem FK pois as séries ainda vivem em mock data.
-- Quando migrarmos séries pro banco, adicionar a FK depois sem dor.
CREATE TABLE IF NOT EXISTS series_followers (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  series_id  TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, series_id)
);

ALTER TABLE series_followers ENABLE ROW LEVEL SECURITY;

-- Cada usuário só vê e gerencia os próprios follows
CREATE POLICY "series_followers_select_own" ON series_followers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "series_followers_insert_own" ON series_followers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "series_followers_delete_own" ON series_followers
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON series_followers TO authenticated;
