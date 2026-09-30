# Auditoria de seguranca e prontidao para producao - RankFTV

Data da revisao: 14/07/2026
Ultima atualizacao: 30/09/2026

## Atualizacao 30/09/2026 - prontidao operacional da V1

- A migration de alertas operacionais de e-mail foi aplicada em producao pela
  execucao `36779269155`. Ela adicionou detecção de fila acumulada e falha
  definitiva, índices, RLS e grants mínimos; o painel `/admin/alertas` ganhou a
  contingência correspondente, restrita ao CEO.
- O Preview `rank-hd1go3z38-devcarlosrochas-projects.vercel.app` passou por
  webhook descartável repetido, reembolso e evento fora de ordem. A fixture
  confirmou uma única transição financeira, duas credenciais individuais e um
  único aviso ao organizador por evento, com limpeza posterior.
- A suíte local aprovou lint sem erros, TypeScript, build, 802 testes e
  `npm audit` completo e de produção sem vulnerabilidades. A busca por padrões
  de segredo não encontrou credenciais versionadas.
- O ensaio autenticado completo do k6 fez 6.297 requisições em 17 minutos com
  até 25 usuários virtuais: 6,17 req/s, erro HTTP de 0,23%, média de 503,14 ms,
  p95 de 752,44 ms e máximo de 3,63 s. Todos os thresholds passaram, nenhuma
  iteração foi interrompida e o pico histórico de 26,74 s não se repetiu.
- O smoke somente leitura de produção aprovou 12 requisições, com média de
  274 ms e máximo de 1.026 ms, cobrindo health, páginas públicas e legais,
  robots, sitemap, CSP, fronteira autenticada e rejeições esperadas.
- O roteiro transacional completo foi separado em
  `docs/SMOKE-TRANSACIONAL-V1.md`. Entrega real em Gmail/Outlook, operações
  específicas no Asaas e pagamentos reais permanecem supervisionados e não
  foram simulados em Production.

## Atualizacao 30/09/2026 - promocao controlada e prova operacional

- O PR #4 foi aprovado pelos checks obrigatorios e mesclado por squash. A
  producao foi promovida sem copiar secrets para o repositorio.
- A branch `master` passou a exigir os checks atualizados `verify` e Vercel,
  inclusive para administradores, sem force-push ou exclusao, com historico
  linear e resolucao de conversas. O environment `Production` aceita somente
  branches protegidas.
- `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`, `EMAIL_EVENT_HASH_SECRET` e
  `ASAAS_WITHDRAWAL_AUTH_TOKEN` foram cadastrados na Vercel Production.
- `OBSERVABILITY_HTTP_ENDPOINT`, `OBSERVABILITY_HTTP_TOKEN` e
  `OPERATIONS_ALERT_WEBHOOK_URL` foram cadastrados como secrets na Vercel
  Production. O Better Stack aceitou o evento de teste e o Slack recebeu o
  alerta no canal privado `#alertas-rankftv`. Carlos Gregório Rocha Batista foi
  registrado como responsável primário, com SLA de resposta inicial de 15
  minutos para alertas críticos e uma hora para alta prioridade.
- O redeploy ficou Ready e `/api/health` confirmou aplicação e banco `ok` no
  release `fd058f57d51f`. A conciliação financeira `36718714462`, executada
  depois da configuração, terminou com sucesso.
- Os workers de avisos de campeonato e financeiros do organizador foram
  disparados manualmente em producao e concluiram com sucesso nas execucoes
  `36708232283` e `36708235880`.
- A primeira execucao da conciliacao financeira falhou de forma segura com
  `checkout_reservation_expiration_failed`. A causa foi a ausencia da migration
  `production-athlete-checkout-reservations.sql` na ordem do runbook, embora o
  codigo implantado ja dependesse da RPC correspondente.
- O PR #15 adicionou a migration a ordem oficial e um workflow manual fixo,
  atomico e restrito ao projeto de producao. A execucao `36708976564` aplicou a
  migration e confirmou tabela, colunas e funcoes. A repeticao da conciliacao,
  execucao `36709050462`, terminou com sucesso.
- O release operacional final e o commit `b5fa6f4a9632`, deployment Vercel
  `dpl_65HNiDgLQkxhh3RHcCg5foqcuJCi`, Ready em 30/09/2026 as 08:30 BRT. A CI
  `36708963025` aprovou audit, lint, tipos, 797 testes, build e 30 testes de
  navegador; 55 cenarios condicionais foram ignorados conforme suas flags.
- O smoke final somente-leitura confirmou home HTTP 200, health `ok`, banco
  `ok`, release `b5fa6f4a9632` e redirecionamento anonimo de `/admin` para
  `/login`. O smoke transacional completo permanece pendente.

## Atualizacao 29/09/2026 - notificacao financeira e dependencias

- A fila financeira do organizador foi aplicada no Sandbox. Uma cobranca Pix
  de R$ 23,99 confirmou o ingresso e gerou exatamente uma entrega aceita, na
  primeira tentativa, sem erro. O e-mail recebido exibiu campeonato, categoria,
  forma de pagamento, valor e os dois atletas.
- Next.js e `eslint-config-next` foram atualizados de 16.3.0 para 16.3.7, e o
  override do Sharp passou de 0.35.3 para 0.35.4, eliminando os alertas criticos
  e altos encontrados na verificacao inicial.
- `npm run audit:prod`: aprovado, zero vulnerabilidades conhecidas.
- `npm run lint`: aprovado, zero erros; permanecem 1.288 avisos de qualidade
  registrados como baseline e fora deste ajuste de seguranca.
- `npm run typecheck`: aprovado, sem erros.
- `npm test`: 795/795 testes aprovados.
- `npm run build`: aprovado no Next.js 16.3.7, incluindo TypeScript e geracao
  das 67 paginas estaticas coletadas pelo build.
- `npm run test:e2e`: 25 testes publicos aprovados nos cinco perfis de
  navegador e 60 ignorados por dependerem de contas, dados ou flags explicitas
  do Sandbox. O teste de plateia deixou de usar silenciosamente um campeonato
  removido e agora exige `E2E_CHAMPIONSHIP_ID` valido.
- O k6 2.2.0 foi instalado e o ensaio somente-leitura foi concluido no Preview
  `rank-5b2dt9r7m-devcarlosrochas-projects.vercel.app`. Em 17 minutos, a rampa
  de 5, 10 e 25 usuarios virtuais completou 6.715 requisicoes, com 0% de erro,
  media de 356,36 ms, p95 de 463,65 ms e 6,57 requisicoes/s. O pico de 25
  usuarios foi sustentado por cinco minutos. Houve um maximo isolado de 26,74 s;
  Vercel, Supabase e consultas internas ainda precisam ser correlacionados para
  explicar esse outlier antes do teste supervisionado em producao.
- A saude publica de producao retornou HTTP 200 e banco `ok` em 86 ms. HTTPS,
  redirect do dominio raiz para `www`, CSP com nonce, HSTS, protecao contra
  frame e redirect anonimo de `/admin` para login foram confirmados.
- A auditoria SQL somente-leitura de producao confirmou RLS nas tabelas
  expostas, mas encontrou `handle_new_user()` sem `search_path`, a view
  `ranking_entries` sem `security_invoker`, funcoes privilegiadas executaveis
  por `anon`, acesso anonimo a `credentials` e grants indevidos de
  `TRUNCATE/TRIGGER`. O hardening continua bloqueado ate backup e janela sem
  checkout.
- O check complementar do Security Advisor confirmou que as cinco funcoes
  auditadas existem, mas seus `search_path` e grants ainda nao correspondem ao
  baseline homologado. `auto_update_championship_status()` continua acessivel
  por clientes. As migrations de hardening do Advisor, da view de ranking e dos
  20 pontos foram adicionadas explicitamente ao inicio do runbook.
- Os objetos financeiros, de ingresso e credenciais listados no runbook estao
  presentes. Ainda nao existem em producao `championship_notice_deliveries`,
  `organizer_financial_notification_deliveries` nem suas funcoes de claim.
- No GitHub, a conciliacao financeira esta ativa e as dez execucoes recentes
  terminaram com sucesso, mas ocorreram com intervalos de horas. Os dois secrets
  estavam no repositorio. A URL fixa da conciliacao e a URL publica do Supabase
  foram cadastradas no environment protegido `Production`; `CRON_SECRET` e os
  demais secrets sensiveis ainda dependem de confirmacao. Backup e avisos de
  campeonato ainda nao aparecem na branch padrao.
- Foi acrescentado um workflow idempotente a cada 15 minutos para drenar a fila
  de avisos financeiros do organizador, com retry de transporte e contingencia
  diaria na Vercel. Ele permanece inativo ate a promocao para a branch padrao e
  a configuracao do `CRON_SECRET` no environment protegido.
- A branch `master` e o environment `Production` nao possuem regras de
  protecao. O PR rascunho #4 foi aberto sem merge automatico; checks obrigatorios
  e a politica de aprovacao ainda precisam ser definidos antes da promocao.
- O Preview final do PR respondeu HTTP 200 na home, login e health, redirecionou
  `/admin` anonimo para login e confirmou banco `ok` em 81 ms no release
  `0bd5351`.
- Na Vercel Production faltam o remetente e webhook do Resend, o segredo
  dedicado de hash de e-mail, o token de autorizacao de saques e as tres
  variaveis de observabilidade. O DNS publico possui SPF no subdominio `send`,
  DKIM e DMARC em modo de monitoramento (`p=none`).

## Atualizacao 30/09/2026 - primeiro backup remoto criptografado

- O workflow `Production logical backup` foi promovido para a branch `master` e
  seus quatro secrets foram cadastrados no environment protegido `Production`.
- A execucao manual `36652847512` terminou com sucesso: validou o destino de
  producao, usou explicitamente `pg_dump`/`pg_restore` 17, gerou os dumps do
  banco, exportou o Storage, conferiu os hashes SHA-256, criptografou e verificou
  o pacote antes do upload.
- O artefato privado `rankftv-production-36652847512-1` possui 25.015.975 bytes,
  nao estava expirado na verificacao e tem retencao ate 30/10/2026. O conteudo
  nao foi baixado nem exposto durante a auditoria.
- O backup remove o bloqueio operacional que impedia o hardening do banco, mas
  as migrations continuam dependendo de uma janela controlada sem checkout e
  de validacao posterior. O teste de restauracao isolada ainda deve ser ensaiado.

## Atualizacao 30/09/2026 - migrations e hardening de producao

- Antes da janela, a execucao `36655950084` gerou e verificou um novo backup
  criptografado de banco e Storage. O preflight confirmou PostgreSQL 17.6,
  nenhuma conexao ativa, nenhuma inscricao nos 30 minutos anteriores, nenhum
  ingresso ativo sem categoria e nenhuma identidade duplicada por categoria.
- As 27 migrations do runbook foram aplicadas/reconciliadas sequencialmente. Os
  scripts sem transacao propria foram executados de forma atomica; nenhum erro
  de instalacao permaneceu aberto.
- A primeira auditoria encontrou tres lacunas de ordenacao no runbook: hardening
  de perfil ausente, claim da fila de avisos ausente e privilegios herdados em
  `championship_notices`. As migrations correspondentes foram aplicadas, o
  hardening global foi repetido e a migration-base foi corrigida para revogar
  todos os privilegios antes de conceder somente `SELECT` aos clientes.
- Todos os checks finais de seguranca, perfil, ranking, filas e RPCs de
  campeonato retornaram verdadeiros, com listas de revisao vazias. O inventario
  final nao encontrou tabelas/funcoes ausentes, backfill incompleto, divergencia
  de quantidade, operacao financeira pendente, bloqueio de cartao, acesso de
  cliente as filas ou coluna de destinatario em texto puro.
- Existe um webhook historico `PAYMENT_RECEIVED`, criado em 20/08/2026, ainda
  com status `failed` apos oito tentativas e sem evento posterior bem-sucedido.
  Ele requer conciliacao com o provedor; nenhum replay ou confirmacao manual foi
  feito sem evidencia externa.
- O smoke posterior retornou HTTP 200 na home e no health, banco `ok` em 36 ms
  e redirecionamento anonimo de `/admin` para `/login`.

## Atualizacao 06/09/2026 - inventario, avisos e backup periodico

- Consulta somente de leitura confirmou em producao as tabelas, funcoes e
  colunas de credenciais, suporte, anexos, participantes canonicos/manuais,
  quadras e chaveamento com repescagem. O bucket `support-attachments` existe,
  e privado, limita cada arquivo a 5 MB e aceita apenas JPEG, PNG, WebP e PDF.
- A nova fila de avisos de mudanca de campeonato foi implementada no codigo e
  ainda nao foi aplicada em producao. Faltam exatamente a tabela
  `championship_notice_deliveries` e as colunas de deduplicacao/origem em
  `championship_notices` e `notifications`.
- O workflow semanal de backup gera dump customizado, schema e dados, baixa o
  Storage, valida a listagem com `pg_restore` e confere hashes SHA-256. A
  primeira execucao remota depende dos secrets protegidos no GitHub.
- Antes da limpeza da demonstracao, foi criado o backup customizado
  `production-20260906-141852-pre-fake-cleanup`, com 1.991 itens listados e
  checksum SHA-256. Depois foram removidos somente 15 ingressos fake, os 15
  participantes derivados, 30 eventos de credencial e as 30 partidas da
  categoria Aprendiz da Copa Bahia. A dupla real foi preservada e as contagens
  finais dos tres conjuntos falsos ficaram em zero.

## Atualizacao 03/09/2026 - credenciais individuais, suporte e reembolso

Esta secao substitui o estado operacional das secoes historicas abaixo. O
release continua bloqueado para pagamentos reais ate concluir os itens P0 de
`PENDENCIAS-V1.md`.

### Implementado no codigo

- Cada compra de dupla em `athlete_tickets` possui duas linhas em
  `athlete_ticket_credentials`, com token de acesso, QR, codigo e check-in
  individuais. O resumo legado do pedido indica se ao menos um atleta chegou.
- O checkout permite usar o mesmo e-mail para os dois atletas sem juntar as
  credenciais. A recuperacao exige correspondencia exata de CPF + e-mail e OTP;
  cada sessao acessa somente a credencial autorizada.
- A troca de titularidade exige OTP para mudancas sensiveis, gira links e QRs
  afetados, desvincula identidades antigas e envia avisos. O fluxo e bloqueado
  depois de check-in, inicio do evento ou confirmacao do chaveamento.
- `/admin/suporte` e exclusivo de `profiles.role = ceo`. Busca ingresso,
  corrige e-mail com justificativa, reenvia com limite, invalida credencial e
  registra casos/notas. A auditoria possui periodo por data, e o painel agrega
  eventos de credencial e metricas de entrega sem expor destinatarios.
- O webhook Resend valida assinatura e registra estados aceito, entregue,
  atrasado, bounce, reclamacao, falha e supressao. A retencao cobre os novos
  eventos operacionais e casos de suporte.
- Uma categoria com inscricao, ingresso ou chaveamento nao pode ser apagada. O
  erro aparece dentro do site, sem `alert()` nativo, e a exclusao nao cancela
  compras nem gera reembolso.
- A unicidade de participante por campeonato + categoria cobre o fluxo
  autenticado e o checkout rapido, inclusive concorrencia entre os dois.
- O financeiro do organizador prioriza saldo liquido, status, chave Pix, grafico
  responsivo e lista rolavel de pendencias. O nome do provedor nao aparece nos
  textos operacionais destinados ao organizador.
- Cancelamento e reembolso usam operacao duravel e idempotente. Reembolso
  integral envia o total; parcial preserva a taxa conforme a regra atual. A
  conciliacao consulta `GET /payments/{id}/refunds`: somente `DONE` confirma a
  devolucao; `CANCELLED` vira falha terminal assistida sem cancelar ingresso ou
  liberar inventario.
- O workflow `.github/workflows/financial-reconciliation.yml` esta preparado
  para conciliacao a cada dez minutos no dominio de producao. Ele ainda depende
  de chegar a branch padrao e dos secrets do environment `production` no
  GitHub; o cron diario da Vercel continua como contingencia.

### Evidencias informadas da homologacao Sandbox

- Duas credenciais foram emitidas e cada link mostrou somente um ingresso.
- O uso de um unico e-mail para a dupla e a revisao antes do pagamento foram
  testados.
- Recuperacao, OTP, troca protegida, invalidacao do link antigo e entrega do
  novo ingresso funcionaram.
- Correcao assistida pelo CEO notificou o e-mail antigo e entregou a nova
  credencial ao endereco corrigido.
- Reenvio registrou auditoria; o e-mail chegou e o webhook alterou a metrica de
  aceito para entregue, com tempo medio calculado.
- Exclusao de categoria com historico foi recusada com mensagem dentro da
  interface, preservando categoria e ingressos.
- As migrations de credenciais, seguranca de alteracao, operacao de
  credenciais/retencao e protecao de categoria foram executadas no ambiente de
  homologacao conforme as confirmacoes do responsavel.

### Bloqueios e resultado financeiro real do teste

No teste de 03/09/2026, o pedido de reembolso integral de R$ 108,00 foi criado
e autorizado no processador, mas a consulta posterior retornou `CANCELLED`, sem
devolucao confirmada. Depois da correcao, a conciliacao marcou a operacao
interna como cancelada e o cliente passou a ver que o caso precisa de
atendimento. Esse teste nao e evidencia de reembolso concluido.

Continuam pendentes: obter um reembolso Pix e um de cartao com estado `DONE` em
teste controlado; fechar o procedimento do CEO para falha terminal; configurar
e validar dominio/e-mail/webhook no ambiente Production; habilitar e observar o
agendamento subdiario; testar backup/restore; concluir juridico, suporte e
monitoramento; e implementar o e-mail importante para mudanca de data, horario
ou local do campeonato.

### Validacoes locais de 03/09/2026

- `npm run audit:prod`: aprovado, zero vulnerabilidades conhecidas.
- `npm run lint`: aprovado, sem erros.
- `npm run typecheck`: aprovado, sem erros.
- `npm test`: 660/660 testes aprovados.
- `npm run build`: aprovado no Next.js 16.3.0, incluindo TypeScript e geracao
  das 59 paginas estaticas coletadas pelo build.
- `git diff --check`: aprovado; somente avisos locais de conversao LF/CRLF no
  Windows.

Os E2E mutantes e qualquer nova operacao remota nao foram executados nesta
revisao documental. As evidencias Sandbox acima foram informadas pelo
responsavel ao longo da homologacao e nao foram recriadas por este fechamento.

### Migrations acumuladas desta etapa

Executar somente na ordem e com as verificacoes de `RUNBOOK-PRODUCAO.md`:

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

## Atualizacao 07/08/2026 - hardening para trafego e pagamentos reais

Esta atualizacao substitui o estado tecnico dos itens historicos de 21/07 sobre
idempotencia financeira, card testing, CSP, paginacao, assinatura indefinida e
E2E. A aplicacao das migrations no Supabase remoto e a homologacao com servicos
externos continuam manuais e nao foram presumidas.

### Implementado no codigo

- Next.js e `eslint-config-next` atualizados para 16.3.0. Overrides fixam
  DOMPurify 3.4.13, PostCSS 8.5.26 e Sharp 0.35.3.
- Toda criacao de cobranca do RankFTV usa operacao duravel com chave unica,
  `externalReference`, lease, outbox e reconciliacao. Abrange inscricao,
  ingresso de atleta, plateia, assinatura de aluno, aluguel, diaria e aula
  avulsa. Timeout ambiguo nao apaga pedido nem libera estoque.
- Estorno, webhook e repasse usam estado monotono e repeticao segura. Repasse
  so finaliza quando a transferencia chega a `DONE`.
- Pedido de plateia foi normalizado em itens, com backfill conservador e
  relatorio para linhas legadas ambiguas. Reserva/liberacao de tipo, lote e
  cupom acontece em RPC atomica e exatamente uma vez.
- Guard duravel contra card testing combina IP, usuario, pedido e fingerprint
  HMAC mascarado, com cooldown progressivo, bloqueio e alerta. PAN/CVV nao sao
  persistidos nem enviados a observabilidade.
- A assinatura paga da propria plataforma para arenas foi retirada da
  navegacao e suas duas rotas retornam 404 enquanto produto e preco nao forem
  definidos. Planos vendidos pelas arenas aos alunos permanecem ativos.
- Arenas, campeonatos, plateia, alunos, check-ins e paineis principais usam
  paginacao/aggregates no servidor; foram adicionados indices para os filtros e
  ordenacoes correspondentes, evitando cargas ilimitadas e N+1 conhecidos.
- `proxy.ts` gera nonce por requisicao. `script-src` nao usa `unsafe-inline`;
  `style-src` conserva a excecao necessaria aos estilos inline atuais, sem
  wildcard de origem. Headers sao aplicados tambem a redirect e erro.
- Observabilidade configuravel, logs JSON sanitizados, correlation ID,
  `/api/health`, alertas operacionais e retencao automatizada foram adicionados.
- Playwright, fixtures Asaas, testes sandbox condicionais e CI com audit, lint,
  tipos, testes, build e navegador foram adicionados.

### Migrations deste release

1. `supabase/financial-operations.sql`
2. `supabase/payment-card-attempt-security.sql`
3. `supabase/production-spectator-ticket-items.sql`
4. `supabase/production-order-inventory-release.sql`
5. `supabase/asaas-webhook-idempotency.sql`
6. `supabase/production-query-indexes.sql`
7. `supabase/production-data-retention.sql`

Ordem, consultas de validacao, backfill, deploy e rollback estao em
`RUNBOOK-PRODUCAO.md`. O que exige conta, segredo ou decisao do responsavel esta
em `PENDENCIAS-V1.md`.

### Validacoes locais de 07/08/2026

- `npm run audit:prod`: aprovado, zero vulnerabilidades.
- `npm ci --dry-run`: aprovado; `package.json` e `package-lock.json` estao
  sincronizados.
- `npm run lint`: aprovado com zero erros e um aviso preexistente em
  `app/convite/[teamId]/AceitarConviteViaLink.tsx` sobre navegacao com
  `window.location.href`.
- TypeScript isolado do produto RankFTV: aprovado, sem erros.
- `npm run typecheck`: o escopo RankFTV passa, mas a verificacao global atual
  para em dois fixtures pessoais de `lib/study-organization.test.ts`, que nao
  informam o novo campo obrigatorio `availableDevices`. Esse modulo e
  explicitamente externo ao escopo deste release e nao foi alterado.
- Suite unitaria exclusiva do RankFTV: 165/165 testes aprovados.
- `npm test`: 385/387 aprovados. As duas falhas sao do modulo pessoal
  `study-roadmap-ai`, explicitamente fora do escopo deste release:
  `roadmapPromptInput limita o plano a uma etapa relevante por sessao` e
  `roadmapPromptInput envia contexto linguistico personalizado`. Nenhuma regra
  foi desativada e esses arquivos nao foram alterados para esconder a falha.
- `npm run build`: a compilacao de producao no Next.js 16.3.0 foi concluida;
  a etapa TypeScript parou nos mesmos dois fixtures pessoais acima. Antes das
  alteracoes pessoais concorrentes, este build havia sido concluido com 54
  paginas estaticas.
- `npm run test:e2e`: 4 aprovados e 6 ignorados por falta de credenciais/dados
  mutaveis de sandbox. Execucao adicional do webhook com token local: 2
  aprovados e 1 mutante de ledger ignorado.
- `GET /api/health`: HTTP 200, servico `rankftv` e banco `ok`, sem segredos no
  payload.
- Playwright Chromium instalado. Os testes mutantes de ledger e card guard
  permanecem condicionados a uma base sandbox descartavel.
- `git diff --check`: aprovado, sem erro de whitespace (somente avisos locais
  de conversao LF/CRLF do Git no Windows).

Nao foi executado SQL contra o Supabase remoto nem teste destrutivo contra o
Asaas. Portanto, o codigo esta preparado, mas pagamentos reais permanecem
bloqueados ate concluir o runbook e todas as pendencias manuais.

## Atualizacao 21/07/2026

- Sequencia obrigatoria do primeiro deploy CONCLUIDA: backup do Supabase, execucao
  de `production-security-hardening.sql`, deploy do codigo e execucao de
  `production-security-hardening-after-deploy.sql`. Verificado que usuario comum
  nao altera role, rating, pagamento nem dados de outra conta.
- CAPTCHA (Cloudflare Turnstile) implementado nas telas de login e cadastro: o
  token e enviado ao Supabase em `signInWithPassword`/`signUp`, com reset a cada
  falha (uso unico). CSP liberou `challenges.cloudflare.com`.
- Fluxo de recuperacao de senha criado: `/recuperar-senha` (envia o e-mail, com
  captcha) e `/recuperar-senha/atualizar` (define a nova senha). O link do e-mail
  reaproveita o `/auth/callback` via token_hash.
- Supabase Auth: Site URL (`https://www.rankftv.com`), Redirect URLs e captcha
  configurados no painel. Falta ainda a politica de senha/MFA do admin.

## Atualizacao 21/07/2026 (auditoria de seguranca de ponta a ponta)

Segunda rodada de auditoria, em paralelo a atualizacao acima (branches
diferentes, mesclados depois). Cobriu autorizacao, pagamentos, concorrencia e
privacidade em codigo — nao so recomendacao. Resumo; detalhe completo e
passo a passo de aplicacao ficaram em `PENDENCIAS-V1.md`.

- Presenca de aula de arena passou a ser feita só por RPC atômica (gênero,
  vaga e crédito derivados no banco); fim da escrita direta na tabela pelo
  client.
- Inscrição em campeonato: FK composta trava category_id de outro
  campeonato; rating/gênero de elegibilidade vêm sempre do perfil salvo,
  nunca do FormData; CPF salvo sempre vence sobre o do formulário; bloqueio
  de autoconvite; índice único trava clique duplo/retry criando inscrição
  ou cobrança duplicada.
- Elo/rating: ledger idempotente (editar placar reverte o delta anterior
  antes de aplicar o novo); questionário de nível para de sobrescrever
  rating competitivo depois da primeira partida.
- Campos financeiros/administrativos (`is_elite`, taxa da plataforma, chave
  Pix, dados de repasse, habilitação): trigger bloqueia escrita direta pelo
  client, RPCs dedicadas assumem essas mudanças.
- Chave Pix: reautenticação por senha ao trocar uma chave existente,
  auditoria em `security_audit_log`, cooldown de 48h no repasse após troca,
  e consulta de titularidade na API oficial da Asaas antes de aceitar a
  troca.
- Comunicação de campeonato: destinatários sempre recalculados no servidor
  a partir de quem tem inscrição paga; HTML escapado em todos os templates
  de e-mail (o comunicado livre do organizador era o maior risco de
  injeção/phishing).
- Cartão salvo de aluno de arena: token de cobrança reutilizável sem SELECT
  para o usuário — só service_role lê; browser só recebe bandeira/últimos
  dígitos/validade.
- Estoque de ingresso de plateia: `max_quantidade` por tipo passou a ser
  aplicado de fato; pedido Pix pendente sem pagamento em 24h expira e
  devolve lote/cupom/vaga automaticamente (cron diário); rate limit por
  IP/e-mail nos checkouts de visitante.
- **Recuperação de ingresso por CPF+e-mail deixou de devolver o
  `access_token` direto — agora manda um código de 6 dígitos de uso único
  pro e-mail (item 4 antigo desta lista, ver abaixo).**
- Bucket de notícias restrito a admin/ceo (estava aberto a qualquer
  authenticated); bucket `avatars` passou a ter definição em SQL rastreada
  (antes só existia criado direto no painel); limites de tamanho/MIME.
- Fechado IDOR em `notifications` que permitia inserir notificação pra
  `user_id` arbitrário.
- N+1 corrigido na contagem de alunos da listagem de arenas.
- **LGPD: CPF pessoal e endereço residencial removidos dos Termos de Uso
  (ficou placeholder `[PENDENTE]` até ter o dado empresarial correto — ver
  `PENDENCIAS-V1.md`); Política de Privacidade criada em `/privacidade`;
  exportação de dados e solicitação de exclusão de conta implementadas em
  `/perfil/conta` (item 6 antigo desta lista, ver abaixo).**

Migrations novas em `supabase/harden-*.sql`, `supabase/add-security-audit-log.sql`
e `supabase/add-ticket-recovery-otp.sql` — já aplicadas no banco em 20-21/07.
Pendências reais (dado de empresa pros Termos, CAPTCHA/rate limit de
login-cadastro no painel do Supabase, limitações conhecidas) estão todas em
`PENDENCIAS-V1.md`, com passo a passo.

## Resultado executivo

O codigo foi revisado, corrigido e validado, e a base Supabase real foi limpa. A
conferencia final encontrou zero contas alem da conta administrativa. Tambem
foram removidos da base campeonatos, atletas externos, resultados, inscricoes,
duplas, ingressos, arenas, alunos, cobrancas, credenciais, notificacoes,
noticias e demais conteudos de demonstracao.

O site ainda nao deve receber dinheiro real antes da sequencia de migracao e
configuracao descrita abaixo. O arquivo local de ambiente continua apontando a
URL publica para desenvolvimento e o Asaas para Sandbox.

Nenhuma auditoria de codigo garante risco zero. Este documento separa o que foi
corrigido do que ainda depende de configuracao, decisao comercial ou validacao
operacional.

## Correcoes aplicadas

- Corrigidas permissoes que permitiam forjar credenciais, historico de rating,
  inscricoes pagas, duplas, alunos ativos, assinaturas e reservas.
- Role e rating passaram a ser campos de sistema; o usuario nao pode
  promover a propria conta nem escolher o proprio rating via API.
- CPF, nascimento e questionario de nivel foram removidos das consultas
  publicas e migrados para `profiles_private`.
- Codigo de convite de arena e token de convite de dupla deixaram de ser dados
  publicos. Convites abertos agora exigem um token aleatorio separado do UUID
  publico da dupla.
- Corrigidos IDORs em planos, lotes, categorias, chaveamento, pagamentos e
  convidados de campeonato.
- Webhooks Asaas agora validam o token, o ID da cobranca/assinatura e o registro
  interno antes de alterar status.
- Repasses Pix usam reivindicacao atomica contra eventos duplicados. O cron de
  liquidacao agora inclui inscricoes, ingressos de atleta/plateia, mensalidades,
  alugueis e diarias no cartao.
- Checkouts de cartao deixaram de enviar CEP e numero ficticios e passaram a
  exigir os dados reais do titular.
- Consultas publicas de ingresso passaram de query string para POST, com
  `no-store` e rate limit. QR e status privados exigem token de acesso.
- Corrigidos redirecionamentos abertos em login, cadastro e callback de Auth.
- Uploads de imagem/PDF passaram a usar pasta por usuario, limites de tamanho e
  tipos MIME permitidos.
- Adicionados CSP, HSTS, protecao contra iframe, `nosniff`, politica de
  referencia e de permissoes.
- Next.js foi atualizado para 16.2.10; o PostCSS vulneravel foi substituido por
  8.5.10.
- A agenda deixou de usar eventos mockados e passou a consultar campeonatos
  reais. O historico publico de rating foi implementado.
- Corrigida a rota ausente `/arena/[handle]/alunos` e a exclusao completa de
  campeonatos sob as novas permissoes.

## Limpeza executada na base real

- 103 contas de Auth removidas; a conta correspondente a `ADMIN_EMAIL` foi
  preservada.
- 7 campeonatos, 20 inscricoes, 20 duplas, 40 credenciais e 4 partidas
  removidos.
- 1 arena, 32 alunos, 180 cobrancas, 1.428 presencas, 8 turmas e 7 planos/fotos
  removidos.
- Ingressos, categorias, lotes, cupons, notificacoes, noticias, conquistas,
  resultados e rankings externos de demonstracao removidos.
- Seeds explicitamente falsos e credenciais de teste foram retirados do
  repositorio. O script de manutencao ficou em
  `scripts/cleanup-production-data.mjs`, com modo seguro de conferencia por
  padrao e exclusao somente com `--execute`.

## Sequencia obrigatoria do primeiro deploy

> CONCLUIDA em 21/07/2026 (ver secao "Atualizacao 21/07/2026").

1. Fazer um backup/snapshot do Supabase.
2. No SQL Editor, executar `supabase/production-security-hardening.sql`.
3. Fazer o deploy deste codigo e aguardar o status Ready.
4. Imediatamente depois, executar
   `supabase/production-security-hardening-after-deploy.sql`.
5. Confirmar que um usuario comum nao consegue atualizar `role`, `rating`,
   status de pagamento, credenciais ou dados de outra conta.

A etapa 1 cria as colunas e permissoes exigidas pelo codigo novo. A etapa 2
remove os campos pessoais antigos e esconde colunas publicas. Inverter a ordem
pode interromper cadastro, convite, arena e perfil.

## Configuracao externa ainda pendente

| Item | Estado atual | Acao para producao |
| --- | --- | --- |
| `NEXT_PUBLIC_BASE_URL` | desenvolvimento | Definir `https://` com o dominio final |
| `ASAAS_BASE_URL` | Sandbox | Trocar para a API de producao e usar uma chave de producao |
| `ASAAS_WEBHOOK_TOKEN` | presente | Cadastrar o mesmo token no webhook de producao |
| Webhook Asaas | nao validado em producao | Apontar para `https://DOMINIO/api/webhooks/asaas` e habilitar eventos de pagamento confirmado, recebido, estornado e excluido |
| `CRON_SECRET` | presente | Confirmar o cron diario da Vercel e monitorar respostas/falhas |
| Resend | chave presente, remetente de teste | Verificar o dominio, criar SPF/DKIM e definir `RESEND_FROM_EMAIL` |
| Supabase Auth | Site URL, Redirect URLs e CAPTCHA configurados (21/07) | Falta definir politica de senha/MFA do admin |
| DNS/HTTPS | nao verificavel localmente | Configurar dominio, HTTPS e somente depois habilitar HSTS preload |
| Backups/alertas | nao verificavel localmente | Ativar PITR/backups, alertas de erro, logs de webhook e conciliacao financeira |

Nunca copiar a chave Sandbox para producao nem expor `SUPABASE_SERVICE_ROLE_KEY`,
`ASAAS_API_KEY`, `CRON_SECRET` ou o token do webhook no navegador.

## Funcionalidades que ainda nao estavam 100% prontas em 21/07/2026

> Registro historico. Os itens 1, 3, 5 e 7 abaixo foram tecnicamente resolvidos
> na atualizacao de 07/08/2026. A homologacao externa continua pendente.

1. A assinatura paga da propria plataforma para donos de arena esta
   deliberadamente incompleta: a tela mostra preco "A definir" e nao possui
   botao de contratacao. E preciso decidir preco, periodo de teste, inadimplencia
   e cancelamento e entao implementar/testar esse checkout; ou remover essa
   oferta do menu no lancamento.
2. Falta um teste ponta a ponta no Asaas de producao controlada: cobranca de
   baixo valor, cartao recusado, Pix, parcelamento, evento duplicado, estorno,
   timeout, assinatura recorrente e execucao real do cron de repasse.
3. A criacao de cobranca por cartao ainda precisa de uma trava persistente de
   tentativa para cobrir timeout entre a chamada ao Asaas e a gravacao do ID.
   A interface bloqueia clique repetido e os webhooks/repasses sao idempotentes,
   mas uma repeticao de rede nesse intervalo deve ser conciliada antes de operar
   em volume. Uma alternativa e usar o Checkout hospedado/tokenizado do Asaas.
   **Parcialmente melhorado em 21/07/2026**: aluguel de quadra e diária de
   arena pararam de apagar o registro local quando a chamada ao Asaas falha
   por timeout de rede (falha ambígua) — ficam pendentes pro webhook
   reconciliar, em vez de virar cobrança fantasma sem registro. Reserva de
   horário de aluguel também ganhou índice único contra corrida de clique
   duplo. A Asaas não oferece cabeçalho de idempotência nativo em
   `POST /payments` (confirmado na doc oficial) — o restante do item segue
   pendente.
4. ~~A busca de ingressos por CPF + e-mail...~~ **RESOLVIDO em 21/07/2026**:
   `/api/meus-ingressos` agora só manda um código de 6 dígitos de uso único
   pro e-mail informado; o ingresso só é devolvido depois de confirmar esse
   código em `/api/meus-ingressos/verificar`.
5. O CSP usa `unsafe-inline` para compatibilidade com a renderizacao atual. Um
   CSP estrito com nonce deve ser a proxima camada de hardening.
6. ~~Ha termos de uso, mas falta publicar um aviso de privacidade LGPD...~~
   **PARCIALMENTE RESOLVIDO em 21/07/2026**: Política de Privacidade
   publicada em `/privacidade` (finalidades, compartilhamento, retenção,
   direitos do titular) e exportação/exclusão de conta implementadas em
   `/perfil/conta`. Ainda falta: dado de identificação empresarial real nos
   Termos/Privacidade (hoje é um placeholder `[PENDENTE]`, ver
   `PENDENCIAS-V1.md`) e um procedimento formal de resposta a incidentes.
7. Os testes atuais cobrem a logica financeira local, mas nao ha suite E2E para
   cadastro, convite, pagamento, webhook, check-in, painel de organizador e
   arena. Esses fluxos precisam de um roteiro de homologacao antes da abertura.

## Validacoes executadas

Re-executadas em 21/07/2026 depois de mesclar as duas branches de trabalho
(hardening/captcha/recuperação de senha + auditoria de segurança de ponta a
ponta) na árvore final:

- `npm run lint`: aprovado, sem avisos.
- `npx tsc --noEmit`: aprovado.
- `npm test`: 290 de 290 testes aprovados (86 suítes).
- `npm run build`: aprovado no Next.js 16.2.10; 53 páginas geradas.
- `npm audit --omit=dev`: zero vulnerabilidades conhecidas.
- Nova conferencia da base: zero contas a remover alem do admin preservado
  (validado antes da mesclagem; não é reconferido pela mesclagem em si).
