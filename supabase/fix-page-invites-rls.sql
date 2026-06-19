-- Refaz a tabela page_championship_invites com owner_id direto
-- (evita subquery no RLS que causa permission denied com anon key)

DROP TABLE IF EXISTS page_championship_invites;

CREATE TABLE page_championship_invites (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id         UUID        NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  page_owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  championship_id UUID        NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'pendente'
                              CHECK (status IN ('pendente', 'aceito', 'rejeitado')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (page_id, championship_id)
);

ALTER TABLE page_championship_invites ENABLE ROW LEVEL SECURITY;

-- Dono da página: pode inserir e ver os próprios convites
CREATE POLICY "invite_page_owner_insert" ON page_championship_invites
  FOR INSERT WITH CHECK (page_owner_id = auth.uid());

CREATE POLICY "invite_page_owner_select" ON page_championship_invites
  FOR SELECT USING (page_owner_id = auth.uid());

-- Dono do campeonato: pode ver e atualizar convites pendentes do seu camp
-- (usa subquery só na direção do championship, que tem policy mais simples)
CREATE POLICY "invite_champ_owner_select" ON page_championship_invites
  FOR SELECT USING (
    championship_id IN (SELECT id FROM championships WHERE organizador_id = auth.uid())
  );

CREATE POLICY "invite_champ_owner_update" ON page_championship_invites
  FOR UPDATE USING (
    championship_id IN (SELECT id FROM championships WHERE organizador_id = auth.uid())
  )
  WITH CHECK (
    championship_id IN (SELECT id FROM championships WHERE organizador_id = auth.uid())
  );
