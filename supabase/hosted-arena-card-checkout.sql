-- O cartão de aluguel e diária é preenchido exclusivamente no checkout do Asaas.
-- Mantém a URL hospedada para o comprador retomar uma cobrança pendente.
BEGIN;

ALTER TABLE public.arena_rentals
  ADD COLUMN IF NOT EXISTS invoice_url text;

ALTER TABLE public.arena_daily_passes
  ADD COLUMN IF NOT EXISTS invoice_url text;

COMMIT;
NOTIFY pgrst, 'reload schema';
