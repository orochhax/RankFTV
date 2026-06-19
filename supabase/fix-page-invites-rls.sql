-- Corrige as policies de RLS da tabela page_championship_invites.
-- FOR ALL USING (...) não cobre INSERT — precisa de WITH CHECK explícito.

DROP POLICY IF EXISTS "invite_page_owner" ON page_championship_invites;
DROP POLICY IF EXISTS "invite_champ_owner" ON page_championship_invites;

-- Dono da página pode inserir convites
CREATE POLICY "invite_insert_page_owner" ON page_championship_invites
  FOR INSERT WITH CHECK (
    page_id IN (SELECT id FROM pages WHERE owner_id = auth.uid())
  );

-- Dono da página pode ver os convites da sua página
CREATE POLICY "invite_select_page_owner" ON page_championship_invites
  FOR SELECT USING (
    page_id IN (SELECT id FROM pages WHERE owner_id = auth.uid())
  );

-- Dono do campeonato pode ver e atualizar o status
CREATE POLICY "invite_champ_owner" ON page_championship_invites
  FOR ALL
  USING (
    championship_id IN (SELECT id FROM championships WHERE organizador_id = auth.uid())
  )
  WITH CHECK (
    championship_id IN (SELECT id FROM championships WHERE organizador_id = auth.uid())
  );
