-- Tamanho da fonte usada na geração da imagem de story do Instagram.
-- P = pequena, M = média (padrão), G = grande.
ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS tamanho_fonte TEXT NOT NULL DEFAULT 'M'
  CHECK (tamanho_fonte IN ('P', 'M', 'G'));
