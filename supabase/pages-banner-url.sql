-- Adiciona suporte a banner por imagem nas páginas.
-- Se banner_url for preenchido, tem prioridade sobre o gradiente.
ALTER TABLE pages ADD COLUMN IF NOT EXISTS banner_url TEXT;

NOTIFY pgrst, 'reload schema';
