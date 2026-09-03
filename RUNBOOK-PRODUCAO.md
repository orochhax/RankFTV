# Runbook de producao do RankFTV

Atualizado em 03/09/2026. Este procedimento cobre apenas o produto Rank
Futevolei. Nao inclui Performance nem os controles financeiros pessoais
hospedados temporariamente no mesmo repositorio.

## Regra de liberacao

Nao receber pagamentos reais enquanto todos estes pontos nao estiverem
concluidos:

- backup recuperavel e restauracao ensaiada;
- migrations deste release aplicadas e validadas;
- deploy Preview aprovado pelos gates automatizados;
- Asaas, Supabase, Resend, Turnstile, Vercel e observabilidade configurados;
- homologacao financeira em sandbox com dados descartaveis;
- promocao do mesmo commit validado, sem alteracoes entre Preview e Production.

## 1. Preparacao

1. Registrar o commit que sera implantado e interromper alteracoes no schema.
2. Confirmar Node.js 20.9 ou superior e executar:

```bash
npm ci
npm run audit:prod
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

3. Fazer snapshot/PITR do Supabase e testar que o snapshot pode ser localizado.
4. Confirmar que as migrations-base ja usadas pelo projeto remoto existem,
   especialmente `harden-ticket-inventory-security.sql`,
   `add-elite-fee-collection.sql` e `add-security-audit-log.sql`.
5. Conferir que Production nao usa URL ou chave do Asaas Sandbox.
6. Configurar as variaveis descritas em `.env.example` e
   `PENDENCIAS-V1.md`, sem copiar valores para logs ou tickets.

## 2. Ordem das migrations

Aplicar no SQL Editor ou pipeline de migrations, uma por vez e nesta ordem:

1. `supabase/financial-operations.sql`
2. `supabase/payment-card-attempt-security.sql`
3. `supabase/production-spectator-ticket-items.sql`
4. `supabase/production-order-inventory-release.sql`
5. `supabase/asaas-webhook-idempotency.sql`
6. `supabase/production-query-indexes.sql`
7. `supabase/production-athlete-ticket-credentials.sql`
8. `supabase/production-athlete-ticket-change-security.sql`
9. `supabase/production-bracket-participants.sql`
10. `supabase/production-participant-category-uniqueness.sql`
11. `supabase/production-category-deletion-guard.sql`
12. `supabase/production-credential-operations.sql`
13. `supabase/production-data-retention.sql`

Os scripts sao aditivos e idempotentes. Ainda assim, nao os execute em paralelo.
O backfill de plateia e a criacao de indices podem disputar I/O com o trafego;
use janela de manutencao em uma base com volume relevante. A migration de
unicidade interrompe a instalacao se encontrar ingresso ativo sem categoria ou
identidade duplicada na mesma categoria. Audite e resolva cada conflito antes;
nao altere nem estorne dados em lote para forcar a instalacao. A migration de
credenciais e obrigatoria antes de `production-credential-operations.sql`, e a
retencao deve ser executada por ultimo.

## 3. Validacao do banco

### 3.1 Objetos e permissoes

Executar como administrador do banco:

```sql
select to_regclass('public.financial_operations') as financial_operations,
       to_regclass('public.financial_outbox') as financial_outbox,
       to_regclass('public.payment_card_attempts') as payment_card_attempts,
       to_regclass('public.payment_card_guards') as payment_card_guards,
       to_regclass('public.spectator_ticket_items') as spectator_ticket_items,
       to_regclass('public.asaas_webhook_events') as asaas_webhook_events,
       to_regclass('public.athlete_ticket_credentials') as athlete_ticket_credentials,
       to_regclass('public.athlete_ticket_change_challenges') as athlete_ticket_change_challenges,
       to_regclass('public.bracket_participants') as bracket_participants,
       to_regclass('public.athlete_ticket_credential_events') as credential_events,
       to_regclass('public.transactional_email_events') as email_events,
       to_regclass('public.support_cases') as support_cases,
       to_regclass('public.support_case_notes') as support_case_notes;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'financial_begin_operation',
    'financial_claim_outbox',
    'financial_resolve_transfer_reference',
    'create_spectator_ticket_order',
    'release_spectator_ticket_order',
    'claim_asaas_webhook_event',
    'can_select_athlete_ticket_credential',
    'claim_athlete_ticket_change_challenge',
    'block_nonempty_championship_category_delete',
    'log_athlete_ticket_credential_event',
    'purge_rankftv_operational_data'
  )
order by routine_name;
```

Todas as tabelas e funcoes listadas devem existir. Validar RLS com `anon` e
`authenticated`: ledgers financeiros, tentativas de cartao, relatorio de
backfill, ledger de webhook, operacao de e-mail, casos de suporte e eventos de
credencial nao podem ser lidos diretamente. Um atleta autenticado so pode ler
sua propria credencial individual pela policy prevista.

### 3.2 Backfill de plateia

```sql
select status, count(*)
from spectator_ticket_items_backfill_report
group by status
order by status;

select ticket_id, status, reason, expected_lines, migrated_lines, inspected_at
from spectator_ticket_items_backfill_report
where status <> 'complete'
order by inspected_at, ticket_id;

select st.id
from spectator_tickets st
left join spectator_ticket_items i on i.ticket_id = st.id
where coalesce(st.quantidade, 0) > 0
  and st.items_normalized = true
group by st.id, st.quantidade
having coalesce(sum(i.quantidade), 0) <> st.quantidade;
```

O ultimo resultado deve estar vazio para pedidos marcados como normalizados.
Itens `partial` ou `unmigrated` exigem revisao manual. Nao force um tipo quando
o JSON legado nao permitir identificacao sem ambiguidade.

### 3.3 Operacoes financeiras e webhooks

```sql
select status, count(*)
from financial_operations
group by status
order by status;

select id, operation_type, external_reference, flow, status, provider_status,
       attempt_count, next_reconcile_at, last_error_code, last_error_message
from financial_operations
where status in ('initialized', 'provider_created', 'processing', 'ambiguous')
order by next_reconcile_at nulls first, created_at;

select status, count(*)
from financial_outbox
group by status
order by status;

select event_id, event_type, payment_id, status, last_error, updated_at
from asaas_webhook_events
where status = 'failed'
order by updated_at desc
limit 100;
```

Nao deve haver duas linhas com a mesma combinacao
`operation_type + external_reference`, nem dois pagamentos/assinaturas com o
mesmo `provider_id`. Uma operacao `ambiguous` deve permanecer reservada e ir
para conciliacao; nao apague pedido ou libere estoque para tentar novamente.
Em reembolso, somente `DONE` no endpoint dedicado de refunds confirma a
devolucao. `CANCELLED` e terminal e exige suporte: nao repetir a devolucao, nao
cancelar o ingresso e nao liberar inventario automaticamente.

### 3.4 Card testing

```sql
select scope_key, attempt_count, decline_count, blocked_until, updated_at
from payment_card_guards
where blocked_until > now()
order by blocked_until desc;

select flow, outcome, count(*)
from payment_card_attempts
where created_at >= now() - interval '24 hours'
group by flow, outcome
order by flow, outcome;
```

As tabelas guardam hashes/identificadores mascarados. PAN, CVV, CPF, token de
cartao e corpo integral da requisicao nunca devem aparecer nelas ou nos logs.

### 3.5 Credenciais, e-mails e suporte

```sql
select event_type, count(*)
from athlete_ticket_credential_events
group by event_type
order by event_type;

select status, count(*)
from transactional_email_events
where created_at >= now() - interval '30 days'
group by status
order by status;

select count(*) as entregas_pendentes
from athlete_ticket_credentials
where access_email_sent_at is null;

select status, count(*)
from support_cases
group by status
order by status;
```

Confirmar que eventos de e-mail guardam somente `recipient_hash`, nunca o
destinatario em texto puro, e que os eventos de credencial nao guardam token,
QR ou codigo. Testar duas credenciais por dupla, acesso isolado, recuperacao
exata por CPF + e-mail + OTP, e-mail compartilhado, rotacao do link antigo,
reenvio limitado e auditoria do CEO.

### 3.6 Integridade de categoria e participantes

Antes da migration de unicidade, revisar os conflitos levantados pelo bloco de
preflight no inicio de `production-participant-category-uniqueness.sql`. Depois,
em uma restauracao local descartavel, executar
`participant-category-uniqueness-test.sql`; o teste abre transacao e faz
rollback. Na aplicacao, confirmar que uma categoria vazia pode ser excluida e
que uma categoria com inscricao, ingresso ou chaveamento exibe erro dentro do
site e permanece intacta.

## 4. Deploy gradual

1. Implantar em Preview com as mesmas integracoes de sandbox usadas no teste.
2. Verificar `GET /api/health`: resposta sem segredos, banco acessivel e versao
   esperada.
3. Conferir CSP em pagina publica, login, pagina protegida e 404. `script-src`
   deve usar nonce e nao conter `unsafe-inline`.
4. Executar Playwright. Os cenarios destrutivos exigem
   `E2E_ASAAS_MUTATION_TESTS=1` e/ou `E2E_CARD_GUARD_MUTATION_TESTS=1` somente
   em sandbox descartavel.
5. Homologar inscricao, duas credenciais individuais de atleta, recuperacao,
   troca protegida, pedido multi-item de plateia, mensalidade, aluguel, diaria
   e aula avulsa em Pix/cartao aplicavel.
6. Repetir clique/requisicao e simular timeout depois da criacao no provedor.
   Confirmar uma unica cobranca por `externalReference` e conciliacao posterior.
7. Reenviar webhook duplicado e fora de ordem. Confirmar que status terminal nao
   regride, estoque/cupom so e liberado uma vez e estorno e idempotente.
8. Testar repasse recusado, pendente e `DONE`; somente `DONE` encerra o fluxo.
   Uma nova referencia `:retry:N` so pode surgir depois de falha terminal.
9. Confirmar os crons protegidos por `CRON_SECRET`: conciliacao financeira,
   liquidacao/repasse e retencao.
10. Confirmar assinatura do webhook Resend e transicao de e-mail aceito para
    entregue, sem expor destinatarios nas metricas.
11. Confirmar que `/admin/suporte` e exclusivo de `profiles.role = ceo` e que
    correcao, reenvio, invalidacao e casos ficam na auditoria.
12. Promover o mesmo commit e repetir health check e smoke tests sem mutacoes.

No plano Hobby da Vercel, todas as expressoes em `vercel.json` precisam executar
no maximo uma vez por dia. A conciliacao financeira fica agendada diariamente
as 10:00 UTC como contingencia. O repositorio inclui
`.github/workflows/financial-reconciliation.yml`, com agenda a cada dez minutos
e alvo fixo em `https://www.rankftv.com/api/cron/financial-reconciliation`.
Antes de depender dele, promover o workflow para a branch padrao, configurar
`FINANCIAL_RECONCILIATION_URL` e `CRON_SECRET` no environment `production` do
GitHub e conferir pelo menos uma execucao manual e uma agendada.

## 5. Monitoramento e alertas

- Monitorar `/api/health` externamente sem enviar credenciais.
- Configurar `OBSERVABILITY_HTTP_ENDPOINT` e `OBSERVABILITY_HTTP_TOKEN` para o
  coletor escolhido.
- Configurar `OPERATIONS_ALERT_WEBHOOK_URL` em um canal com responsavel e SLA.
- Alertar falha de webhook, cron, conciliacao, estorno e repasse.
- Pesquisar logs por `correlation_id`, `flow` e ID interno, nunca por dado
  financeiro sensivel.
- Executar a retencao pelo cron. Evidencia financeira terminal fica por seis
  anos; tentativas de cartao por 180 dias; auditoria, eventos de credencial,
  falhas de e-mail e casos de suporte resolvidos por 730 dias; webhooks e
  e-mails entregues/aceitos por 400 dias; desafios de alteracao por 30 dias.

## 6. Rollback

As migrations adicionam estruturas que passam a receber evidencia financeira.
O rollback normal e de aplicacao, nao de schema:

1. pausar novos checkouts e os crons de conciliacao/repasse;
2. registrar IDs de operacoes/outbox em processamento;
3. reimplantar o ultimo commit conhecido, somente se ele for compativel com o
   schema aditivo;
4. manter tabelas, colunas, indices, itens normalizados e ledgers no banco;
5. corrigir para frente qualquer RPC ou policy defeituosa;
6. conciliar manualmente cobrancas ja criadas no Asaas antes de reabrir;
7. restaurar snapshot apenas em corrupcao comprovada e com reconciliacao do que
   aconteceu no Asaas depois do horario do backup.

Nunca use `DROP`, apague ledger ou reverta o backfill para resolver falha de
interface. Isso pode recriar cobrancas, devolver estoque duas vezes ou perder a
trilha de auditoria.

## 7. Encerramento da janela

Registrar commit, horario, migrations, contagens do backfill, resultado dos
gates, cobrancas sandbox usadas, incidentes e responsavel pela liberacao. As
configuracoes externas ainda abertas permanecem em `PENDENCIAS-V1.md`.
