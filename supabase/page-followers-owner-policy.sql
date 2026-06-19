-- Permite que o dono de uma página veja os seguidores dela (necessário
-- para o contador em tempo real funcionar no painel do organizador).
CREATE POLICY "page_followers_select_page_owner" ON page_followers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pages
      WHERE pages.id = page_followers.page_id
        AND pages.owner_id = auth.uid()
    )
  );
