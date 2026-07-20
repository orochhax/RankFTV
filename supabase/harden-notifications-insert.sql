-- =============================================================
-- RANKFTV — notifications: fecha INSERT direto do client.
--
-- notif_insert (notifications.sql) tinha WITH CHECK (championship_id IS NULL
-- OR EXISTS(...organizador_id = auth.uid())) — no ramo championship_id NULL,
-- nada limitava o user_id da notificação inserida: qualquer authenticated
-- podia inserir notificação (título/mensagem livres) na caixa de QUALQUER
-- outro usuário. Nenhum fluxo legítimo do produto insere notificação pelo
-- client do próprio usuário — camisas/comunicado/exclusão de conta já usam
-- o client admin (service_role) — então fecha de vez em vez de só apertar
-- a policy.
--
-- Idempotente — pode rodar mais de uma vez.
-- =============================================================

REVOKE INSERT ON notifications FROM authenticated, anon;

DROP POLICY IF EXISTS notif_insert ON notifications;
CREATE POLICY notif_insert ON notifications FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      championship_id IS NULL
      OR EXISTS (SELECT 1 FROM championships c WHERE c.id = championship_id AND c.organizador_id = auth.uid())
    )
  );

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'harden-notifications-insert done';
