-- Armazena o tamanho de camisa confirmado do atleta2 (convidado) por campeonato.
-- Separado do profiles.tamanho_camisa para que seja por evento e não possa ser
-- alterado após confirmação na página do ingresso.
ALTER TABLE teams ADD COLUMN IF NOT EXISTS tamanho_camisa_atleta2 text;
