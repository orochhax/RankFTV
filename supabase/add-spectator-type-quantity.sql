-- =============================================================
-- PLATEIA — quantidade (estoque) por tipo de ingresso.
--
-- Quantos ingressos de cada tipo vão existir. NULL = sem limite.
-- Por enquanto é informativo (capacidade total do evento); a venda ainda
-- não bloqueia ao esgotar.
--
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.
-- =============================================================

ALTER TABLE spectator_ticket_types
  ADD COLUMN IF NOT EXISTS max_quantidade int;

NOTIFY pgrst, 'reload schema';
