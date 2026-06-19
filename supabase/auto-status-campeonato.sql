-- Auto-atualização de status de campeonatos baseada em datas.
-- Rode no Supabase SQL Editor para criar a função + job agendado.

-- ── 1. Função que roda a lógica de transição ──────────────────
CREATE OR REPLACE FUNCTION auto_update_championship_status()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- inscricoes_abertas → em_andamento: quando a data de início do evento chegou
  UPDATE championships
  SET status = 'em_andamento'
  WHERE status = 'inscricoes_abertas'
    AND data_inicio <= CURRENT_DATE;

  -- em_andamento → encerrado: quando a data de fim passou
  UPDATE championships
  SET status = 'encerrado'
  WHERE status = 'em_andamento'
    AND data_fim < CURRENT_DATE;
END;
$$;

-- ── 2. Agendamento: roda todo dia às 03:00 (horário do servidor) ──
-- Remove job anterior se já existir (ignora erro se não existir)
DO $$
BEGIN
  PERFORM cron.unschedule('auto-championship-status');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-championship-status',
  '0 3 * * *',
  'SELECT auto_update_championship_status()'
);

-- ── 3. Roda agora para corrigir campeonatos já atrasados ──────
SELECT auto_update_championship_status();
