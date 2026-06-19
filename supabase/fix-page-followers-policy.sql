-- Corrige as policies de page_followers.
-- Seguidores de páginas são dados públicos (como no Instagram/YouTube).
-- SELECT liberado para todos; INSERT/DELETE só o próprio usuário.

DROP POLICY IF EXISTS "page_followers_select_own"        ON page_followers;
DROP POLICY IF EXISTS "page_followers_select_page_owner" ON page_followers;
DROP POLICY IF EXISTS "page_followers_select_public"     ON page_followers;

CREATE POLICY "page_followers_select_public" ON page_followers
  FOR SELECT USING (true);
