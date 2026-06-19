-- Colunas adicionadas após a criação inicial da tabela championships

ALTER TABLE championships
  ADD COLUMN IF NOT EXISTS regulamento_pdf_url  text,
  ADD COLUMN IF NOT EXISTS inscricoes_inicio    date,
  ADD COLUMN IF NOT EXISTS inscricoes_fim       date,
  ADD COLUMN IF NOT EXISTS tier                 text,
  ADD COLUMN IF NOT EXISTS tier_quiz            jsonb;

-- Vagas máximas por categoria
ALTER TABLE championship_categories
  ADD COLUMN IF NOT EXISTS max_duplas int;
