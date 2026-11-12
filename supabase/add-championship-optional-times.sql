-- Adiciona horários opcionais (HH:MM) na criação e edição de campeonatos:
-- pré-venda, início das vendas/inscrições, início do evento e término no último dia.
BEGIN;

ALTER TABLE public.championships
  ADD COLUMN IF NOT EXISTS prevenda_hora_inicio text,
  ADD COLUMN IF NOT EXISTS inscricoes_hora_inicio text,
  ADD COLUMN IF NOT EXISTS hora_inicio text,
  ADD COLUMN IF NOT EXISTS hora_fim text;

ALTER TABLE public.championships
  DROP CONSTRAINT IF EXISTS championships_prevenda_hora_inicio_check,
  ADD CONSTRAINT championships_prevenda_hora_inicio_check
    CHECK (prevenda_hora_inicio IS NULL OR prevenda_hora_inicio ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  DROP CONSTRAINT IF EXISTS championships_inscricoes_hora_inicio_check,
  ADD CONSTRAINT championships_inscricoes_hora_inicio_check
    CHECK (inscricoes_hora_inicio IS NULL OR inscricoes_hora_inicio ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  DROP CONSTRAINT IF EXISTS championships_hora_inicio_check,
  ADD CONSTRAINT championships_hora_inicio_check
    CHECK (hora_inicio IS NULL OR hora_inicio ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  DROP CONSTRAINT IF EXISTS championships_hora_fim_check,
  ADD CONSTRAINT championships_hora_fim_check
    CHECK (hora_fim IS NULL OR hora_fim ~ '^([01]\d|2[0-3]):[0-5]\d$');

COMMIT;
NOTIFY pgrst, 'reload schema';
