-- =============================================================
-- RANKFTV — Hardening: integridade categoria↔campeonato e escrita
-- direta em teams/registrations.
--
-- Consolida e substitui a autorização definida em registrations.sql.
-- Idempotente — pode rodar mais de uma vez. Não assume a ordem dos
-- scripts antigos: revoga/recria do zero o que precisa mudar.
-- =============================================================

-- ── 1. Integridade: category_id tem que pertencer ao championship_id ────
-- Sem isso dá pra criar dupla/inscrição com category_id de um campeonato
-- diferente (ex: categoria barata/gratuita de outro evento) só forjando o
-- FormData — nada no banco impedia.

DO $$
DECLARE
  v_bad_teams int;
  v_bad_regs  int;
BEGIN
  SELECT count(*) INTO v_bad_teams
  FROM teams t JOIN championship_categories c ON c.id = t.category_id
  WHERE c.championship_id <> t.championship_id;

  SELECT count(*) INTO v_bad_regs
  FROM registrations r JOIN championship_categories c ON c.id = r.category_id
  WHERE c.championship_id <> r.championship_id;

  IF v_bad_teams > 0 OR v_bad_regs > 0 THEN
    RAISE NOTICE 'ATENÇÃO: % linha(s) em teams e % em registrations com category_id de outro campeonato. A FK composta abaixo entra NOT VALID — investigue e corrija esses registros antes de rodar os VALIDATE CONSTRAINT no final deste arquivo.', v_bad_teams, v_bad_regs;
  ELSE
    RAISE NOTICE 'OK: nenhuma linha de teams/registrations aponta category_id de outro campeonato.';
  END IF;
END $$;

-- Cria só se ainda não existir — nunca DROP+ADD aqui. Na primeira execução
-- o índice único ainda não tem nada dependendo dele, mas depois que as duas
-- FKs compostas abaixo existem, elas passam a depender dele; um DROP
-- CONSTRAINT (mesmo IF EXISTS) sem CASCADE falha numa segunda execução —
-- e CASCADE destruiria as FKs (e qualquer VALIDATE CONSTRAINT que você já
-- tenha rodado manualmente) sem necessidade nenhuma, já que o índice nunca
-- muda de definição depois de criado.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'championship_categories_id_champ_uniq'
  ) THEN
    ALTER TABLE championship_categories
      ADD CONSTRAINT championship_categories_id_champ_uniq UNIQUE (id, championship_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teams_category_championship_fkey'
  ) THEN
    ALTER TABLE teams
      ADD CONSTRAINT teams_category_championship_fkey
      FOREIGN KEY (category_id, championship_id)
      REFERENCES championship_categories (id, championship_id)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'registrations_category_championship_fkey'
  ) THEN
    ALTER TABLE registrations
      ADD CONSTRAINT registrations_category_championship_fkey
      FOREIGN KEY (category_id, championship_id)
      REFERENCES championship_categories (id, championship_id)
      NOT VALID;
  END IF;
END $$;

-- Depois de confirmar (pela NOTICE acima, ou reconsultando as duas queries
-- do DO block) que não há linha ruim, rode manualmente pra travar de vez
-- (isso faz um scan da tabela, por isso não roda automático aqui):
--   ALTER TABLE teams VALIDATE CONSTRAINT teams_category_championship_fkey;
--   ALTER TABLE registrations VALIDATE CONSTRAINT registrations_category_championship_fkey;

-- ── 2. teams.status estava desatualizado ────────────────────────────────
-- app/campeonatos/[id]/inscrever/actions.ts grava status 'aguardando_pagamento'
-- (dupla paga com parceiro) e app/perfil/convite-actions.ts grava 'recusado'
-- (recusar convite) — nenhum dos dois nunca esteve no CHECK original
-- ('convite_pendente','confirmado','cancelado'), então esses dois fluxos
-- vinham falhando com violação de CHECK toda vez que rodavam contra um
-- banco com o constraint antigo intacto.

ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_status_check;
ALTER TABLE teams ADD CONSTRAINT teams_status_check
  CHECK (status IN ('convite_pendente', 'aguardando_pagamento', 'confirmado', 'cancelado', 'recusado'));

-- ── 3. Fecha escrita direta em teams/registrations ──────────────────────
-- Toda escrita real do produto (criar dupla, aceitar/recusar convite,
-- confirmar pagamento, cancelar) já passa pelo client admin (service_role)
-- dentro de Server Actions que autenticam e autorizam antes — nenhuma tela
-- depende do usuário escrever essas tabelas com o próprio client. O GRANT
-- direto pra authenticated, combinado com policies de UPDATE sem WITH
-- CHECK, deixava aberto: um atleta autenticado podia rodar
-- `supabase.from("registrations").update({status_pagamento:"pago"})`
-- direto no próprio navegador e aprovar o próprio pagamento sem passar
-- pelo Asaas.

REVOKE INSERT, UPDATE, DELETE ON teams, registrations FROM authenticated, anon;
GRANT SELECT ON teams, registrations TO anon, authenticated;

-- Policies continuam existindo por defesa em profundidade (caso algum
-- GRANT antigo seja reaplicado por engano), agora com WITH CHECK
-- simétrico ao USING — mas a autorização real é o REVOKE acima.

DROP POLICY IF EXISTS teams_insert ON teams;
CREATE POLICY teams_insert ON teams FOR INSERT
  WITH CHECK (atleta1_id = auth.uid());

DROP POLICY IF EXISTS teams_update ON teams;
CREATE POLICY teams_update ON teams FOR UPDATE
  USING (atleta1_id = auth.uid() OR atleta2_id = auth.uid())
  WITH CHECK (atleta1_id = auth.uid() OR atleta2_id = auth.uid());

DROP POLICY IF EXISTS registrations_insert ON registrations;
CREATE POLICY registrations_insert ON registrations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = team_id AND t.atleta1_id = auth.uid()
  ));

DROP POLICY IF EXISTS registrations_update ON registrations;
CREATE POLICY registrations_update ON registrations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = team_id AND t.atleta1_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = team_id AND t.atleta1_id = auth.uid()
  ));

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'harden-championship-registration-security done';
