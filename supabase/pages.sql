-- ─────────────────────────────────────────
-- Bloco 2: Páginas (séries de campeonato)
-- ─────────────────────────────────────────

-- 1. Tabela principal de páginas
CREATE TABLE IF NOT EXISTS pages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  handle      TEXT NOT NULL UNIQUE,          -- @handle único, ex: "copa-litoral"
  descricao   TEXT NOT NULL DEFAULT '',
  banner_from TEXT NOT NULL DEFAULT 'from-blue-500',
  banner_to   TEXT NOT NULL DEFAULT 'to-cyan-400',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ver todas as páginas (lista pública)
CREATE POLICY "pages_select_all" ON pages
  FOR SELECT USING (true);

-- Só o dono pode criar, editar ou deletar
CREATE POLICY "pages_insert_own" ON pages
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "pages_update_own" ON pages
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "pages_delete_own" ON pages
  FOR DELETE USING (auth.uid() = owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON pages TO authenticated;
GRANT SELECT ON pages TO anon;

-- 2. Seguidores de páginas
CREATE TABLE IF NOT EXISTS page_followers (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id    UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (page_id, user_id)
);

ALTER TABLE page_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_followers_select_own" ON page_followers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "page_followers_insert_own" ON page_followers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "page_followers_delete_own" ON page_followers
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON page_followers TO authenticated;

-- 3. Vínculo de edição: championships ganham page_id opcional
ALTER TABLE championships ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES pages(id) ON DELETE SET NULL;

-- 4. Notificações já existem (tabela notifications) — usamos ela.
--    Índice pra acelerar count de seguidores por página
CREATE INDEX IF NOT EXISTS page_followers_page_id_idx ON page_followers(page_id);

NOTIFY pgrst, 'reload schema';
