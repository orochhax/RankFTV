-- Zera o valor_inscricao de todas as categorias do RochaCup
-- Rodar no Supabase SQL Editor.

UPDATE championship_categories
SET valor_inscricao = 0
WHERE championship_id = (
  SELECT id FROM championships WHERE nome = 'RochaCup' LIMIT 1
);
