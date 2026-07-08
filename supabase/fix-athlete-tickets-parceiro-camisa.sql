-- CORREÇÃO DE BUG: compra de ingresso de atleta (guest checkout) dava erro
-- genérico "Erro ao gerar o ingresso. Tente novamente." A action
-- app/campeonatos/[id]/comprar/actions.ts insere parceiro_camisa, mas essa
-- coluna nunca foi criada — o INSERT falhava com "column does not exist".
--
-- De quebra, o CHECK de gênero só aceitava masculino/feminino, mas o
-- formulário (IngressoAtletaForm) já oferece a opção "Outro" — quem
-- escolhesse isso também tomaria erro (violação de CHECK).
--
-- RODAR NO SQL EDITOR DO SUPABASE.

ALTER TABLE athlete_tickets
  ADD COLUMN IF NOT EXISTS parceiro_camisa text;

ALTER TABLE athlete_tickets
  DROP CONSTRAINT IF EXISTS athlete_tickets_comprador_genero_check;
ALTER TABLE athlete_tickets
  ADD CONSTRAINT athlete_tickets_comprador_genero_check
  CHECK (comprador_genero IS NULL OR comprador_genero IN ('masculino', 'feminino', 'outro'));

ALTER TABLE athlete_tickets
  DROP CONSTRAINT IF EXISTS athlete_tickets_parceiro_genero_check;
ALTER TABLE athlete_tickets
  ADD CONSTRAINT athlete_tickets_parceiro_genero_check
  CHECK (parceiro_genero IS NULL OR parceiro_genero IN ('masculino', 'feminino', 'outro'));

NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'fix-athlete-tickets-parceiro-camisa done';
