-- =============================================================
-- RANKFTV — nível autodeclarado (questionário) por ingresso de atleta
-- avulso (checkout de visitante, tabela athlete_tickets).
--
-- Esse é o fluxo REAL de inscrição de dupla usado pelo botão "Sou atleta"
-- da página pública do campeonato (app/campeonatos/[id]/page.tsx linka
-- direto pra /campeonatos/[id]/comprar) — a rota /categorias + /inscrever
-- não é linkada em lugar nenhum do app, está órfã. Por isso a validação de
-- gênero/questionário feita antes em lib/inscricao-elegibilidade.ts não
-- tinha efeito nenhum na prática: o comprador nunca passava por ali.
--
-- comprador/parceiro aqui são convidados (sem conta na maioria das vezes),
-- então não há profiles.rating pra usar — o rating vem do questionário de
-- 5 perguntas respondido na hora da compra (app/campeonatos/[id]/comprar/
-- actions.ts), salvo só nesta linha do ingresso (nunca sobrescreve rating
-- competitivo de ninguém, porque não é o mesmo dado).
--
-- Idempotente — seguro rodar de novo. Execute no SQL Editor do Supabase.
-- =============================================================

ALTER TABLE athlete_tickets
  ADD COLUMN IF NOT EXISTS comprador_rating integer,
  ADD COLUMN IF NOT EXISTS parceiro_rating  integer;

NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'harden-athlete-ticket-eligibility done';
