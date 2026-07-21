-- =============================================================
-- RANKFTV — vincula ingresso de atleta/plateia à CONTA (user_id), não só
-- ao e-mail digitado no checkout.
--
-- Problema que isso corrige: /minhas-compras (app/minhas-compras/page.tsx)
-- e a busca de "Meus ingressos" mostravam ingresso pra quem estivesse
-- logado com um e-mail IGUAL ao "comprador_email"/"parceiro_email" da
-- compra — e-mail não é uma identidade autenticada (não tem verificação
-- de posse nesse ponto), então isso deixava qualquer pessoa que criasse
-- conta com aquele e-mail ver o ingresso de outra pessoa, sem OTP nenhum.
--
-- Esta migration só ADICIONA colunas/política — não migra dado retroativo
-- automaticamente (isso exigiria decidir por conta própria qual conta cada
-- e-mail antigo pertence, o que é exatamente o "vincular silenciosamente"
-- que o produto não deve fazer). Compras antigas ficam com user_id NULL até
-- o próprio dono vincular explicitamente via OTP em /meus-ingressos
-- (app/meus-ingressos/actions.ts#vincularComprasAntigas) — mesmo código de
-- 6 dígitos por e-mail já usado pela recuperação de ingresso hoje.
--
-- Idempotente — seguro rodar de novo. Execute no SQL Editor do Supabase.
-- =============================================================

ALTER TABLE athlete_tickets
  ADD COLUMN IF NOT EXISTS user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parceiro_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE spectator_tickets
  ADD COLUMN IF NOT EXISTS user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS athlete_tickets_user_id_idx          ON athlete_tickets(user_id);
CREATE INDEX IF NOT EXISTS athlete_tickets_parceiro_user_id_idx ON athlete_tickets(parceiro_user_id);
CREATE INDEX IF NOT EXISTS spectator_tickets_user_id_idx        ON spectator_tickets(user_id);

-- RLS: dono do ingresso pelo user_id (nunca por e-mail) também pode ler o
-- próprio — política ADITIVA à já existente de organizador (permissive
-- policies do Postgres se combinam com OR, então isso não tira o acesso
-- que o organizador já tinha).
DROP POLICY IF EXISTS athlete_tickets_select_owner_user ON athlete_tickets;
CREATE POLICY athlete_tickets_select_owner_user ON athlete_tickets
  FOR SELECT
  USING (user_id = auth.uid() OR parceiro_user_id = auth.uid());

DROP POLICY IF EXISTS spectator_tickets_select_owner_user ON spectator_tickets;
CREATE POLICY spectator_tickets_select_owner_user ON spectator_tickets
  FOR SELECT
  USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'harden-ticket-user-linking done';
