-- =============================================================
-- FIX (MEDIUM) — repasse_status com CHECK desalinhado.
--
-- O webhook do Asaas grava 'processando', 'aguardando_liquidacao',
-- 'estornado' e (antes) 'erro: ...', mas o CHECK só permitia
-- ('pendente','aguardando_d32','repassado'). Resultado: esses UPDATEs
-- falhavam silenciosamente e o rastreio de repasse ficava errado.
--
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.
-- =============================================================

-- Coluna para detalhe de erro do repasse (em vez de embutir no status)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS repasse_erro text;

-- Migra valores antigos fora do novo conjunto
UPDATE registrations SET repasse_status = 'aguardando_liquidacao'
  WHERE repasse_status = 'aguardando_d32';
UPDATE registrations SET repasse_status = 'pendente'
  WHERE repasse_status LIKE 'erro:%';

-- Troca a constraint pelo conjunto que o código realmente usa
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_repasse_status_check;
ALTER TABLE registrations
  ADD CONSTRAINT registrations_repasse_status_check
  CHECK (repasse_status IN (
    'pendente', 'processando', 'aguardando_liquidacao', 'repassado', 'estornado', 'erro'
  ));

NOTIFY pgrst, 'reload schema';
