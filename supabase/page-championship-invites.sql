-- Convites de vínculo entre página e campeonato.
-- O dono da página convida; o dono do campeonato aceita/rejeita.

CREATE TABLE IF NOT EXISTS page_championship_invites (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id         UUID        NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  championship_id UUID        NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'pendente'
                              CHECK (status IN ('pendente', 'aceito', 'rejeitado')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (page_id, championship_id)
);

-- RLS
ALTER TABLE page_championship_invites ENABLE ROW LEVEL SECURITY;

-- Dono da página pode criar e ver
CREATE POLICY "invite_page_owner" ON page_championship_invites
  FOR ALL USING (
    page_id IN (SELECT id FROM pages WHERE owner_id = auth.uid())
  );

-- Dono do campeonato pode ver e atualizar o status
CREATE POLICY "invite_champ_owner" ON page_championship_invites
  FOR ALL USING (
    championship_id IN (SELECT id FROM championships WHERE organizador_id = auth.uid())
  );
