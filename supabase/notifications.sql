-- =============================================================
-- RANKFTV — Notificações in-site
-- Execute no Supabase SQL Editor.
-- =============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL,
  championship_id uuid REFERENCES championships(id) ON DELETE CASCADE,
  tipo            text NOT NULL DEFAULT 'geral',
  titulo          text NOT NULL,
  mensagem        text NOT NULL,
  lida            boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_champ ON notifications(championship_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Usuário lê e marca como lida as próprias notificações
DROP POLICY IF EXISTS notif_select ON notifications;
CREATE POLICY notif_select ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notif_update ON notifications;
CREATE POLICY notif_update ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Organizador insere notificações para atletas do próprio campeonato
DROP POLICY IF EXISTS notif_insert ON notifications;
CREATE POLICY notif_insert ON notifications
  FOR INSERT WITH CHECK (
    championship_id IS NULL
    OR EXISTS (
      SELECT 1 FROM championships c
      WHERE c.id = championship_id AND c.organizador_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
