-- Link da transmissão ao vivo do campeonato (YouTube, Twitch, etc).
-- Usado pelo botão "Ver ao vivo" na página pública e na prévia do organizador.
ALTER TABLE championships
  ADD COLUMN IF NOT EXISTS live_url text;

NOTIFY pgrst, 'reload schema';
