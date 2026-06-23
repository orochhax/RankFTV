-- Campeonato "vitrine": evento grande do cenário que cadastramos só pra
-- aparecer na plataforma (página informativa), SEM vender inscrição. Não tem
-- categoria, nem quiz de nível, nem chave PIX — só as informações do evento.
--
-- A página pública esconde os botões de inscrição/plateia quando is_vitrine.
ALTER TABLE championships
  ADD COLUMN IF NOT EXISTS is_vitrine boolean NOT NULL DEFAULT false;
