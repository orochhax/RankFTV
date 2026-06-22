-- =============================================================
-- PLATEIA — pedido com vários ingressos numa compra só.
--
-- O comprador pode escolher quantidades de um ou mais tipos e pagar tudo de
-- uma vez. Cada linha de spectator_tickets passa a representar o PEDIDO:
--  - valor       = total base do pedido (soma dos ingressos)
--  - quantidade  = total de ingressos
--  - itens       = detalhe [{tipo_nome, qty, valor_unit}]
--  - tipo_nome   = resumo legível ("2x Inteira, 1x Meia")
-- O QR de entrada admite o grupo todo; o check-in é por pedido.
--
-- Não muda webhook/repasse: continua spec:<ticketId> e repassa o `valor`.
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.
-- =============================================================

ALTER TABLE spectator_tickets
  ADD COLUMN IF NOT EXISTS quantidade int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS itens      jsonb;

NOTIFY pgrst, 'reload schema';
