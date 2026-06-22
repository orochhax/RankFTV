-- Título alternativo exibido na imagem gerada pra o Instagram Stories.
-- Opcional: se nulo, o gerador usa o titulo principal.
ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS titulo_story TEXT;
