-- Indices para rotas publicas e buscas frequentes.
-- Seguro rodar mais de uma vez.

CREATE INDEX IF NOT EXISTS idx_championships_public_status_date
  ON championships(status, data_inicio)
  WHERE status <> 'rascunho';

CREATE INDEX IF NOT EXISTS idx_championships_live_date
  ON championships(data_inicio DESC)
  WHERE status = 'em_andamento';

CREATE INDEX IF NOT EXISTS idx_athlete_tickets_lookup_comprador
  ON athlete_tickets(comprador_cpf, comprador_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_athlete_tickets_lookup_parceiro
  ON athlete_tickets(parceiro_cpf, parceiro_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_spectator_tickets_lookup_comprador
  ON spectator_tickets(comprador_cpf, comprador_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread_user
  ON notifications(user_id)
  WHERE lida = false;

NOTIFY pgrst, 'reload schema';
