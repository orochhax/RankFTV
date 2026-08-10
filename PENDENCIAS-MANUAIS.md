# Pendencias manuais do RankFTV

Atualizado em 08/08/2026. Esta lista cobre somente o Rank Futevolei. Os itens
abaixo dependem de acesso a contas, banco, dominio, configuracoes externas ou
decisoes comerciais e juridicas. Nao coloque segredos em Git, prints publicos
ou conversas.

## Como usar esta lista

Siga a ordem das secoes. Marque um item apenas depois de executar a validacao
descrita nele. Se alguma tela tiver nome diferente do descrito, pare nessa etapa
e envie um print antes de mudar configuracoes ou executar SQL.

O `PAYMENT_FINGERPRINT_SECRET` ja foi configurado e por isso nao aparece mais
como pendencia. Ele permanece listado no fim apenas como referencia de variavel
privada obrigatoria.

## 1. Preparar o banco antes do release

### 1.1 Snapshot e migrations-base

- [ ] Criar ou confirmar um backup recuperavel do Supabase e conferir as
  migrations-base.

Passo a passo:

1. Entre no projeto correto no painel do Supabase.
2. Abra `Database` e procure `Backups` ou `Point in Time Recovery`.
3. Confirme que existe backup recente e que voce sabe em qual tela iniciar uma
   restauracao. Nao restaure nada agora.
4. Abra `SQL Editor` e confirme que as migrations-base do runbook ja existem:
   `harden-ticket-inventory-security.sql`, `add-elite-fee-collection.sql` e
   `add-security-audit-log.sql`.
5. Registre a data do backup e o projeto Supabase usado para producao.

Concluido quando: ha um backup identificavel e as migrations-base foram
confirmadas no projeto remoto.

### 1.2 Aplicar as sete migrations novas

- [ ] Aplicar as migrations na ordem correta, uma por vez.

Antes de comecar: escolha uma janela sem checkout ativo. Nao cole todos os
arquivos no SQL Editor de uma vez e nao execute scripts em paralelo.

Ordem obrigatoria:

1. `supabase/financial-operations.sql`
2. `supabase/payment-card-attempt-security.sql`
3. `supabase/production-spectator-ticket-items.sql`
4. `supabase/production-order-inventory-release.sql`
5. `supabase/asaas-webhook-idempotency.sql`
6. `supabase/production-query-indexes.sql`
7. `supabase/production-data-retention.sql`

Para cada arquivo:

1. Abra o arquivo no VS Code.
2. Copie todo o conteudo.
3. No Supabase, abra `SQL Editor` > `New query`.
4. Cole o SQL, confira o nome do projeto exibido no topo e clique em `Run`.
5. Espere a mensagem de sucesso antes de passar ao proximo arquivo.
6. Guarde um print ou o horario da execucao para o registro do release.

Concluido quando: os sete scripts retornaram sucesso no Supabase, exatamente
nessa ordem. O [RUNBOOK-PRODUCAO.md](RUNBOOK-PRODUCAO.md) tem consultas de
validacao para os objetos criados.

### 1.3 Conferir o backfill de pedidos antigos de plateia

- [ ] Revisar `spectator_ticket_items_backfill_report` antes de liberar
  expiracao ou estorno de pedidos antigos.

No `SQL Editor`, execute primeiro:

```sql
select status, count(*)
from spectator_ticket_items_backfill_report
group by status
order by status;
```

Depois execute:

```sql
select ticket_id, status, reason, expected_lines, migrated_lines, inspected_at
from spectator_ticket_items_backfill_report
where status <> 'complete'
order by inspected_at, ticket_id;
```

Como decidir:

- Sem resultado na segunda consulta: esta etapa esta concluida.
- `complete`: pedido convertido integralmente.
- `partial` ou `unmigrated`: nao execute correcao por conta propria. Envie o
  resultado para analise, porque atribuir o tipo errado pode liberar estoque ou
  estornar um ingresso incorreto.

Concluido quando: nao houver linhas pendentes, ou todos os casos pendentes
tiverem uma decisao manual documentada.

## 2. Configurar Vercel, alertas e crons

### 2.1 Variaveis de ambiente novas

- [ ] Configurar canal de alerta operacional.

No Vercel: projeto RankFTV > `Settings` > `Environment Variables`.

1. Adicione `OPERATIONS_ALERT_WEBHOOK_URL` em `Production` e, se quiser testar
   antes, tambem em `Preview`.
2. Use a URL de um Incoming Webhook do Slack. O payload do RankFTV ja e
   compativel com Slack e nao exige token adicional.
3. Salve a variavel e faca um novo deploy para ela entrar em vigor.

Google Chat so deve ser usado se a conta for Google Workspace e o administrador
liberar webhooks. Na tela mostrada anteriormente, `O gerenciamento de webhook e
restrito` significa que essa permissao esta bloqueada. O Slack gratuito e o
caminho mais simples para agora.

- [ ] Decidir se vai usar um provedor externo de observabilidade agora.

`OBSERVABILITY_HTTP_ENDPOINT` e `OBSERVABILITY_HTTP_TOKEN` sao opcionais. Sem
eles, os logs JSON continuam no painel da Vercel. Configure apenas quando tiver
um provedor que aceite `POST` de JSON e autenticacao `Authorization: Bearer`.

Se for deixar para depois: nao crie valores falsos e nao marque como falha. A
decisao pode ser registrada como `adiado, usando logs da Vercel`.

### 2.2 Confirmar os crons na Vercel

- [ ] Confirmar que os tres crons aparecem no deploy de producao.

No Vercel: projeto > `Settings` > `Cron Jobs` ou `Functions` > `Cron Jobs`.
Confirme estas rotas:

| Rota | Funcao |
| --- | --- |
| `/api/cron/repasse-liquidacao` | Processa repasses que aguardam liquidacao. |
| `/api/cron/financial-reconciliation` | Concilia operacoes financeiras incertas a cada 10 minutos. |
| `/api/cron/data-retention` | Aplica a politica diaria de retencao. |

Passo a passo:

1. Confirme que `CRON_SECRET` esta cadastrado como variavel privada em
   Production.
2. Faca um deploy que contenha o `vercel.json` atualizado.
3. Veja se as tres rotas aparecem na area de Cron Jobs.
4. Em Preview ou sandbox, chame cada rota com Postman/Insomnia usando o cabecalho
   `Authorization: Bearer SEU_CRON_SECRET`.
5. Confira no log da Vercel se a resposta foi `200` e se nao houve alerta de
   erro.

Nao teste retencao manualmente em producao se voce ainda nao revisou a politica
de dados. Ela remove registros operacionais antigos conforme os prazos do
runbook.

Concluido quando: as tres rotas aparecem na Vercel, respondem autenticadas em
ambiente seguro e os logs nao mostram falha.

### 2.3 Validar Preview antes de producao

- [ ] Fazer deploy Preview e validar o basico sem usar dinheiro real.

1. Faca deploy em Preview pelo Git/Vercel.
2. Abra `https://SEU-PREVIEW/api/health` e confirme resposta `status: ok` sem
   segredos no JSON.
3. Abra uma pagina publica, login e uma pagina protegida. Confira no navegador
   que nao ha erro de CSP no console.
4. Teste login, painel de organizador, listagem de arenas, inscricao e checkout
   somente com ambiente sandbox.
5. Promova para Production apenas o mesmo commit que foi aprovado em Preview.

Concluido quando: health, login, painel e fluxo sandbox funcionarem no Preview.

## 3. Homologar pagamentos, estoque e repasses

### 3.1 Preparar a conta Asaas de producao

- [ ] Concluir KYC e habilitar meios de pagamento e transferencia.

No painel Asaas, confirme com a equipe deles que a conta de producao esta apta
para Pix, cartao, parcelamento, estorno, assinaturas e transferencias Pix.

Depois, no Vercel Production:

1. Defina `ASAAS_BASE_URL` para a API de producao indicada pelo Asaas.
2. Cadastre `ASAAS_API_KEY` de producao como variavel privada.
3. Confirme que nenhum valor de Sandbox ficou em Production.
4. Faca deploy e verifique que a chave nunca aparece no navegador, HTML ou logs.

### 3.2 Configurar webhook Asaas

- [ ] Cadastrar o webhook de producao no Asaas.

1. Gere um valor aleatorio forte para `ASAAS_WEBHOOK_TOKEN` se ainda nao houver
   um exclusivo de producao.
2. Cadastre o mesmo valor no Vercel como variavel privada.
3. No Asaas, crie/edite o webhook para:
   `https://rankftv.com/api/webhooks/asaas`
4. Habilite eventos de confirmacao, recebimento, solicitacao de estorno,
   estorno, exclusao e chargeback.
5. Remova URLs antigas de tunnel, localhost ou sandbox do ambiente de producao.
6. Faca o teste de webhook fornecido pelo Asaas e confira os logs da Vercel.

Concluido quando: o teste chega com HTTP 2xx e o log nao exibe token, CPF,
chave Pix, PAN ou CVV.

### 3.3 Homologacao financeira em sandbox

- [ ] Testar os fluxos financeiros com valores baixos e dados descartaveis.

Faca em sandbox, nunca na base real sem necessidade:

1. Pix criado e confirmado.
2. Cartao aprovado e cartao recusado.
3. Parcelamento.
4. Clique repetido no pagamento.
5. Timeout depois de o provedor receber a solicitacao.
6. Webhook duplicado e webhook fora de ordem.
7. Estorno.
8. Assinatura de aluno de arena, quando aplicavel.
9. Repasse pendente, recusado e `DONE`.
10. Pedido de plateia com mais de um tipo de ingresso.

Para cada teste, confira na interface, no Asaas e nas tabelas financeiras que
existe apenas uma operacao para cada `external_reference`. Nunca apague uma
operacao ambigua para tentar de novo: ela precisa ser conciliada.

Concluido quando: cada caso tiver resultado registrado e os tres lados
(interface, Asaas e banco) estiverem consistentes.

### 3.4 Chaves Pix e procedimento de incidente

- [ ] Testar seguranca de chave Pix e definir quem trata um repasse parado.

1. Em sandbox, troque uma chave Pix e confirme que o cooldown de 48 horas
   impede repasse imediato.
2. Teste arena sem chave Pix e transferencia recusada.
3. Defina quem consulta `financial_operations`, `financial_outbox` e os logs
   quando um repasse ficar em conciliacao.
4. Documente prazo de resposta e quem pode falar com organizadores afetados.

### 3.5 Decidir a assinatura da plataforma para arenas

- [ ] Tomar a decisao comercial antes de reativar essa oferta.

A rota esta em 404 de proposito. Antes de reativa-la, defina preco, periodo de
teste, carencia, inadimplencia, cancelamento, emissao fiscal e suporte. Depois
disso sera necessario criar um fluxo financeiro separado e testado. Planos que
as arenas vendem para alunos continuam funcionando e nao dependem dessa decisao.

## 4. Base, dominio e seguranca operacional

### 4.1 Dominio e Vercel

- [ ] Preparar o ambiente Production correto.

1. No Vercel, conecte `rankftv.com` e `www.rankftv.com` ao projeto correto.
2. Confirme HTTPS valido nos dois enderecos e escolha qual sera o dominio
   principal.
3. Defina `NEXT_PUBLIC_BASE_URL=https://rankftv.com` em Production.
4. Mantenha Preview separado de Production e use chaves sandbox somente no
   ambiente de Preview/desenvolvimento.
5. Confira os logs do primeiro deploy em Production.

### 4.2 Supabase

- [ ] Endurecer a operacao do projeto Supabase de producao.

1. Ative o plano/recursos de backup e PITR disponiveis para sua conta.
2. Teste o procedimento de restauracao em projeto separado ou ambiente seguro,
   nunca sobrescrevendo producao para aprender.
3. Ative MFA para todas as contas administrativas.
4. Revise alertas de uso de banco, armazenamento e autenticacao.
5. Revise RLS como anon, atleta, organizador, staff, dono de arena e service
   role. A service role nunca vai para o navegador.

### 4.3 Storage

- [ ] Conferir buckets e policies de arquivos.

No Supabase > `Storage`:

1. Verifique os buckets de banners, noticias, arenas, camisas e avatares.
2. Confirme tipo MIME e tamanho maximo aceitos.
3. Revise se upload, leitura e exclusao exigem usuario autorizado.
4. Remova apenas policies antigas comprovadamente permissivas, depois de testar
   upload e leitura em Preview.

### 4.4 Auth e Turnstile

- [ ] Confirmar autenticacao no dominio final.

1. No Supabase Auth, configure `Site URL` com `https://rankftv.com`.
2. Inclua URLs de callback de Production e Preview.
3. No Cloudflare Turnstile, adicione o dominio final e confira a chave publica
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no Vercel.
4. Defina politica de senha e MFA da conta administrativa.
5. Teste cadastro, login, recuperacao de senha e callback em Preview.

## 5. Legal, e-mail e operacao diaria

### 5.1 Dados legais e atendimento

- [ ] Completar informacoes legais antes de cobrar usuarios.

1. Defina responsavel legal, razao social, CNPJ quando houver e e-mail oficial
   de privacidade.
2. Substitua `[PENDENTE]` em `app/termos/page.tsx` e
   `app/privacidade/page.tsx` com dados corretos.
3. Revise com orientacao juridica/contabil termos, cancelamento, estorno,
   atendimento e privacidade.

### 5.2 E-mail transacional

- [ ] Configurar o dominio de envio no Resend.

1. No Resend, adicione o dominio de envio.
2. Publique os registros DNS SPF e DKIM fornecidos pelo Resend.
3. Adicione DMARC no DNS do dominio.
4. Defina `RESEND_FROM_EMAIL` no Vercel usando endereco do dominio verificado.
5. Envie testes para Gmail e Outlook e confira spam, remetente e links.

### 5.3 Contas sandbox e testes E2E mutantes

- [ ] Criar dados descartaveis de teste e rodar os cenarios mutantes em sandbox.

1. Crie contas sandbox de atleta, organizador, dono de arena, aluno e staff.
2. Preencha `E2E_ATHLETE_EMAIL`, `E2E_ATHLETE_PASSWORD`,
   `E2E_ORGANIZER_EMAIL` e `E2E_ORGANIZER_PASSWORD` somente em ambiente de CI
   seguro, nunca no repositorio.
3. Use Supabase e Asaas sandbox separados de producao.
4. Ative `E2E_ASAAS_MUTATION_TESTS=1` e
   `E2E_CARD_GUARD_MUTATION_TESTS=1` apenas nesse sandbox.
5. Rode `npm run test:e2e` e confira que os testes limparam seus dados.

### 5.4 Monitoramento e resposta a incidentes

- [ ] Definir quem recebe e trata alertas.

1. Configure monitoramento externo simples para consultar `/api/health`.
2. Configure o webhook de alertas no Slack quando estiver disponivel.
3. Defina responsavel e SLA para pagamento pendente, estorno, ingresso nao
   recebido, conta bloqueada, falha de cron, incidente de seguranca e pedido
   LGPD.
4. Registre um roteiro curto de comunicacao com atleta/organizador afetado.

### 5.5 Liberacao final

- [ ] Registrar o release e abrir pagamentos reais somente apos todos os itens
  criticos estarem concluidos.

1. Faca backup final antes do deploy de producao.
2. Registre commit, data, horario, migrations aplicadas e responsavel.
3. Registre contagens do backfill e testes de homologacao financeira.
4. Ensaie rollback de aplicacao conforme `RUNBOOK-PRODUCAO.md`; rollback normal
   nao apaga migrations nem ledger financeiro.
5. Abra trafego e pagamentos reais somente depois da aprovacao desse registro.

## Variaveis do RankFTV

Publicas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_BASE_URL` e `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

Privadas obrigatorias conforme o recurso utilizado: `SUPABASE_SERVICE_ROLE_KEY`,
`ADMIN_EMAIL`, `ASAAS_BASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`,
`PAYMENT_FINGERPRINT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` e
`CRON_SECRET`.

Privadas opcionais: `OBSERVABILITY_HTTP_ENDPOINT`,
`OBSERVABILITY_HTTP_TOKEN`, `OPERATIONS_ALERT_WEBHOOK_URL` e `APP_VERSION`.

Nunca use prefixo `NEXT_PUBLIC_` em service role, chave Asaas, fingerprint,
cron, observabilidade ou token de webhook.
