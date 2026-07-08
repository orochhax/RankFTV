-- CORREÇÃO DE BUG: ingresso de atleta (guest checkout) nunca confirmava o
-- pagamento sozinho. Causa: o webhook do Asaas não tinha um branch pra
-- "athl:<id>" (externalReference usado por comprarIngressoAtleta) — caía no
-- default (tabela registrations), que não encontrava nada e não fazia nada.
--
-- Esta migração adiciona as colunas de repasse que faltavam em
-- athlete_tickets (o schema original nunca teve — só spectator_tickets e
-- registrations tinham), pra permitir repassar o valor ao organizador
-- quando o pagamento for confirmado, igual já acontece com plateia.
--
-- RODAR NO SQL EDITOR DO SUPABASE.

ALTER TABLE athlete_tickets
  ADD COLUMN IF NOT EXISTS repasse_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS repasse_transfer_id text,
  ADD COLUMN IF NOT EXISTS repasse_erro text,
  ADD COLUMN IF NOT EXISTS repasse_data_prevista timestamptz;

ALTER TABLE athlete_tickets
  DROP CONSTRAINT IF EXISTS athlete_tickets_repasse_status_check;
ALTER TABLE athlete_tickets
  ADD CONSTRAINT athlete_tickets_repasse_status_check
  CHECK (repasse_status IN ('pendente','processando','aguardando_liquidacao','repassado','estornado'));

NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'add-athlete-tickets-repasse done';
