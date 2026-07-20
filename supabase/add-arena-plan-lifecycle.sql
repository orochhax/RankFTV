-- Ciclo de vida financeiro correto do plano de arena: sem cobrança manual
-- por aluno, com versionamento de plano e acesso desacoplado do estado ao
-- vivo do plano.
-- RODAR NO SQL EDITOR DO SUPABASE.
--
-- Contexto: /arena/[handle]/financeiro deixou o organizador escolher um
-- aluno e definir valor_mensalidade livremente, depois emitir uma cobrança
-- com esse valor — sem o aluno nunca ter escolhido ou confirmado nada. Essa
-- página e as actions que a sustentavam foram removidas do código. Esta
-- migração dá suporte ao substituto: o preço só nasce de um plano do
-- catálogo, escolhido e confirmado pelo próprio aluno.

-- ── 1. arena_plans: versionar em vez de mutar o preço em produção ────────
-- Editar o VALOR de um plano de mensalidade não deve alterar o que quem já
-- assinou está pagando — em vez de UPDATE no valor, o código arquiva a
-- linha atual e insere uma nova versão. arquivado_em marca quando essa
-- versão deixou de aceitar novas contratações; versao_anterior_id encadeia
-- o histórico pra auditoria (nome/valor/condições ficam intactos na linha
-- antiga, sem precisar duplicar em outra tabela).
ALTER TABLE arena_plans
  ADD COLUMN IF NOT EXISTS arquivado_em       timestamptz,
  ADD COLUMN IF NOT EXISTS versao_anterior_id uuid REFERENCES arena_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS arena_plans_versao_anterior ON arena_plans (versao_anterior_id);

-- ── 2. arena_students: acesso pago, separado do estado ao vivo do plano ──
-- access_until é a data até a qual o aluno já pagou (renovada pelo webhook
-- a cada pagamento confirmado). NULL preserva o comportamento anterior —
-- alunos existentes ou planos gratuitos (sem assinatura Asaas, sem webhook
-- pra atualizar isso) continuam liberados enquanto status = 'ativo', sem
-- precisar de backfill especulativo de data. renovacao_ativa indica se a
-- assinatura no Asaas ainda vai cobrar de novo; fica false quando o
-- organizador arquiva/reprecifica o plano ou o próprio aluno cancela.
ALTER TABLE arena_students
  ADD COLUMN IF NOT EXISTS access_until               date,
  ADD COLUMN IF NOT EXISTS renovacao_ativa             boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plano_encerrado_em          timestamptz,
  ADD COLUMN IF NOT EXISTS renovacao_cancelamento_erro text;

CREATE INDEX IF NOT EXISTS arena_students_access_until ON arena_students (arena_id, access_until);

-- ── 3. RLS: nenhuma escrita direta em arena_students ──────────────────────
-- Toda escrita legítima hoje já passa por Server Actions com service_role
-- (entrada na arena, aceitar/recusar aluno, assinatura, webhook), que
-- reautorizam em TypeScript — nada depende de escrita direta via cliente
-- comum. A policy "arena_students_own" (FOR ALL) e "arena_students_dono_write"
-- permitiam, sem essa dependência real, que o próprio aluno ou o dono
-- escrevessem em QUALQUER coluna da própria linha/das linhas da sua arena,
-- inclusive valor_mensalidade, plan_id, access_until — exatamente a porta
-- que este pedido pede pra fechar. Dono e aluno continuam só com leitura.
DROP POLICY IF EXISTS "arena_students_own" ON arena_students;
CREATE POLICY "arena_students_own_select" ON arena_students
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "arena_students_dono_write" ON arena_students;
-- "arena_students_dono_read" (SELECT) permanece como já estava.

REVOKE INSERT, UPDATE, DELETE ON arena_students FROM authenticated;
GRANT SELECT ON arena_students TO authenticated;

-- ── 4. RLS: cobranças (student_charges) também não são escritas pelo dono ──
-- Toda escrita legítima em student_charges já é feita pelos webhooks do
-- Asaas via service_role (confirmação de pagamento e repasse). A policy
-- "student_charges_dono" (FOR ALL) dava ao dono UPDATE/INSERT/DELETE
-- diretos — exatamente o que permitia (via emitirMensalidade, já removida
-- do código) criar uma cobrança arbitrária pra qualquer aluno. Dono
-- continua enxergando o extrato (SELECT), só não escreve mais nele.
DROP POLICY IF EXISTS "student_charges_dono" ON student_charges;
CREATE POLICY "student_charges_dono_select" ON student_charges
  FOR SELECT USING (
    arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
  );

REVOKE INSERT, UPDATE, DELETE ON student_charges FROM authenticated;
GRANT SELECT ON student_charges TO authenticated;

NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'add-arena-plan-lifecycle done';
