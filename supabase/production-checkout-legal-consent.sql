-- Registra a prova do aceite legal em cada pedido/inscricao. Registros
-- anteriores permanecem nulos e nao sao apresentados como aceites retroativos.

ALTER TABLE public.athlete_tickets
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS privacy_version text;

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS privacy_version text;

ALTER TABLE public.spectator_tickets
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS privacy_version text;

COMMENT ON COLUMN public.athlete_tickets.terms_accepted_at IS
  'Momento em que o comprador aceitou os termos e a politica de privacidade.';
COMMENT ON COLUMN public.registrations.terms_accepted_at IS
  'Momento em que o atleta aceitou os termos e a politica de privacidade.';
COMMENT ON COLUMN public.spectator_tickets.terms_accepted_at IS
  'Momento em que o comprador aceitou os termos e a politica de privacidade.';
