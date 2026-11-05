# Pendências para V1 — RankFTV

Atualizado em 05/11/2026. Este arquivo contém **somente trabalho ainda
pendente**. As entregas concluídas, evidências de homologação e decisões
anteriores permanecem preservadas no histórico do Git, em
`AUDITORIA-PRODUCAO.md`, no `RUNBOOK-PRODUCAO.md` e em `REGISTRO-EXECUCOES.md`.

## Progresso da V1

`███████████████████▉` **98% concluído** — 141 de 144 marcos P0 foram
concluídos; restam apenas 3 marcos atômicos, agrupados abaixo de forma acionável.
A linha de base de 140 marcos foi ampliada em 20/10/2026 para 144
marcos com quatro inclusões técnicas obrigatórias: parcelamento de inscrições,
carteira/saque do organizador, dependências de produção sem vulnerabilidades e
promoção dos novos hardenings P0. Em 05/11/2026, a auditoria geral do RankFTV
confirmou a homologação e merge das PRs #71 (carteira e saques), #88/#116
(dependências com 0 vulnerabilidades), #117 (jurídico, termos, CDC e LGPD),
#118 (matriz de notificações N01–N15) e a implementação completa da PR #119
(parcelamento Asaas no checkout hospedado em até 21x/12x com repasse D+32).

Ao concluir ou acrescentar um marco P0, atualizar a barra, os números e a data.
P1/P2 não alteram esse percentual.

### Reconciliação do estado — 05/11/2026

Esta fotografia distingue código implantado, trabalho em PR e alterações
somente locais. Nenhuma das evidências abaixo autoriza pagamento real:

- `origin/master` avançou para `11727d9` (PR #118) em 05/11/2026. Todos os merges
  críticos da V1 foram consolidados na branch padrão:
  - **PR #71 (commit `bb7d6d7`):** Carteira individual do organizador, saques via Pix
    com reserva atômica (`reserve_organizer_withdrawal_receivables`), recálculo
    dinâmico de saldo, bypass de cooldown em Sandbox e filtros avançados com
    seleção múltipla simultânea de métodos de pagamento.
  - **PR #88 e PR #116 (commits `26fe04d` e `68d28d9`):** Dependências atualizadas
    (`@supabase/supabase-js` 2.118.0, `@playwright/test` 1.64.1, `lucide-react` 1.66.0,
    `openai` 7.47.0, `dompurify` 3.4.17 e `zod` 4.6.7). `npm audit --omit=dev` com zero
    vulnerabilidades. As PRs #89, #90 e #91 foram fechadas e consolidadas.
  - **PR #117 (commit `e898938`):** Adequação jurídica formal nas rotas `/termos` e
    `/privacidade`, identificação do operador como pessoa física (Carlos Gregório
    Rocha Batista), suporte oficial e SLA (geral até 24h, evento até 1h), política
    de arrependimento CDC Art. 49 (devolução integral em até 7 dias) e fluxo LGPD
    Art. 19 (15 dias).
  - **PR #118 (commit `11727d9`):** Homologação da matriz N01–N15 de avisos de
    campeonato com suíte automatizada em `lib/championship-notices-matrix.test.ts` e
    documento oficial em `docs/MATRIZ-HOMOLOGACAO-NOTIFICACOES-V1.md`. A PR legada
    #27 foi substituída e encerrada.
- **PR #119 (`feat/v1-installment-checkout`):** Candidata de release ativa do
  parcelamento no checkout hospedado do Asaas (substituindo a PR #32 legada).
  Implementa propagação de `maxInstallmentCount` para inscrições e compra de
  ingressos avulsos com base na configuração do campeonato (`max_parcelas_inscricao`
  e `max_parcelas_ingresso`), repasse integral D+32 na carteira e testes em
  `lib/installment-checkout.test.ts`. CI `verify` e Vercel Preview aprovados (HTTP 200).
  Resta apenas a conferência visual do dropdown de parcelas no checkout Asaas.
- O checkout aberto em `Projeto-RankFTV`, branch `feat/english-roadmap-personal`
  em `cf08f92`, possui alterações locais não commitadas e **não é um candidato
  de release**. Não fazer merge/rebase automático sobre esse estado.
- As PRs históricas #8, #13, #28, #29, #30, #31, #47, #48 e #83 permanecem abertas
  ou arquivadas sem impacto no escopo transacional da V1. A PR #52 teve seus
  hardenings de funil aplicados em produção anteriormente via workflow `39477700522`.

### Última bateria técnica completa registrada — 05/11/2026

Revalidação completa executada no worktree limpo (`feat/v1-installment-checkout`):

- `npm run audit:prod` / `npm audit --omit=dev`: **zero vulnerabilidades** em produção.
- `npm run typecheck`: **zero erros** de tipagem (`tsc --noEmit`).
- `npm test`: **903 testes totais** (902 aprovados, 1 ignorado, 0 falhas).
- `npm run lint`: **zero erros** (1.338 avisos de qualidade/arquitetura mapeados para P2).
- Vercel Preview: ativo no PR #119 e respondendo HTTP 200.
- Trava de integridade de duplicidade: testada no Sandbox via formulário de compra de
  ingresso (`/comprar`), confirmando a rejeição atômica de participantes duplicados na
  mesma categoria via trigger SQL `enforce_ticket_participant_category_uniqueness`.

## P0 — Obrigatório antes de abrir pagamentos reais

### Segurança, autenticação e dados

- [x] Atualizar e validar as dependências com vulnerabilidades em produção. O
  `master` atualizou Next.js/`eslint-config-next` para 16.4.2, `sharp` para 0.35.5
  e `source-map-js` para 1.2.2 em 20/10/2026. Em 04/11/2026, as novas
  vulnerabilidades detectadas em produção foram corrigidas na branch `chore/v1-wallet-release-clean`:
  `dompurify` foi atualizado para `3.4.17` e `zod` para `4.6.7`. `npm audit --omit=dev` retornou
  zero vulnerabilidades; `npm run typecheck`, `npm run lint` e `npm test` passaram sem regressões
  (890 testes totais: 889 aprovados e 1 ignorado).
- [x] Revisar, versionar e promover os hardenings P0: `20260210000100_p0_sensitive_rpc_hardening.sql`, seu
  rollback/check de permissões, health público mínimo e deduplicação do funil.
  A homologação em Sandbox e a aplicação controlada em Production foram
  concluídas no workflow `39477700522`, após backup lógico `39475353118`.
  O workflow também provisionou a tabela base do funil de forma idempotente,
  verificou o índice de deduplicação e confirmou os grants. O healthcheck de
  Production retornou HTTP 200 com `{"status":"ok"}` e a auditoria somente
  leitura `39477800357` terminou com sucesso. Limites de corpo, anexos e
  sanitização administrativa permanecem itens separados quando não incluídos
  nesse release.

- [x] Aplicar em produção, numa janela controlada e depois da homologação, o
  grant mínimo de `supabase/production-security-20-point-hardening.sql`.
  A leitura de produção em 29/09 também confirmou que
  `production-security-advisor-function-hardening.sql` e
  `production-ranking-entries-security-invoker.sql` ainda precisam ser
  aplicadas: os `search_path` esperados não estão fixos, a função interna
  `auto_update_championship_status()` continua exposta a clientes e a view
  `ranking_entries` ainda não usa os privilégios do chamador.
  Repetir a auditoria `supabase/manual-tests/security-posture-check.sql` e o
  Security Advisor em modo somente leitura; registrar qualquer lista não vazia.
  O Sandbox já foi corrigido e revisado: em 14/09, os três checks SQL
  retornaram somente resultados aprovados e listas vazias (postura estrutural,
  permissões/search_path das funções e trigger de perfil). A auditoria de produção em 14/09
  encontrou `handle_new_user()` sem `search_path` fixo, a view
  `ranking_entries` como `SECURITY DEFINER`, EXECUTE público indevido em
  funções de atendimento/triggers e grants de TRUNCATE/TRIGGER para anon.
  Buckets públicos e tabelas internas com RLS sem policy exigem revisão de
  intenção, mas não aparecem como exposição direta de linhas nesta auditoria.
  Em 30/09, os três hardenings foram aplicados em produção e repetidos depois da
  criação das novas tabelas. Os checks confirmaram todas as colunas verdadeiras
  e listas de revisão vazias: RLS, `search_path`, `security_invoker`, grants de
  funções, escrita anônima e acesso a credenciais ficaram no baseline esperado.
- [x] Encerrar a validação conjunta, no navegador do Sandbox, de entradas
  válidas e inválidas para login, inscrição, compras e pagamentos. O cadastro
  público foi homologado em 16/09: campos sem usuário ou e-mail bloquearam a
  criação, e a conta Sandbox de teste foi criada. A recuperação pública de
  ingresso foi homologada em 16/09: par inválido
  recebeu resposta neutra; CPF/e-mail válidos entregaram o código por e-mail,
  recuperaram somente a credencial correspondente e o código foi consumido em
  uso único. A implementação com Zod, reautorização e mensagens públicas já
  está no código. Em 30/09, a automação autenticada no Preview conectado ao
  Sandbox cobriu atleta, organizador, inscrição, compra, reserva, consentimento
  legal e fronteiras de acesso; 14 cenários E2E relevantes passaram.
- [x] Confirmar a equivalência do schema de produção com o código e aplicar,
  com backup e janela sem checkout, somente migrations já homologadas. Seguir
  a ordem de `RUNBOOK-PRODUCAO.md` e registrar objetos aplicados. Auditoria
  somente-leitura de 29/09 confirmou os objetos financeiros e de credenciais
  principais. Em 30/09, as 27 migrations do runbook foram reconciliadas em
  ordem, incluindo as filas `championship_notice_deliveries` e
  `organizer_financial_notification_deliveries`, funções de claim, hardening de
  perfil e RPCs transacionais de campeonato. O inventário final não encontrou
  tabela ou função ausente, conflito de categoria, backfill incompleto, operação
  financeira pendente ou destinatário em texto puro. Permanece para revisão
  operacional um webhook `PAYMENT_RECEIVED` de 20/08/2026 marcado como `failed`
  após oito tentativas; não foi feito replay sem evidência do provedor.
- [x] Configurar no ambiente `Production` do GitHub Actions
  `FINANCIAL_RECONCILIATION_URL` e `CRON_SECRET`, após promover o workflow para
  a branch padrão. Em 30/09, ambos os secrets foram confirmados no environment
  protegido e a execução manual `36709050462` concluiu a reconciliação em
  produção. O cron diário da Vercel permanece como contingência; a pontualidade
  do agendamento subdiário do GitHub deve continuar sendo observada.
- [x] Promover e comprovar os workers de avisos de campeonato e financeiros do
  organizador. Ambos entraram na branch padrão, receberam `CRON_SECRET` no
  environment protegido e as execuções manuais `36708232283` e `36708235880`
  terminaram com sucesso em produção em 30/09/2026.

### Checkout, pagamentos e credenciais

- [ ] Concluir a homologação de reembolso sem conta para Pix e cartão nos
  cenários ainda não cobertos: parcial no cartão, repetição, timeout, saldo
  insuficiente, cobrança inelegível e tentativa do parceiro. Pix e cartão
  integrais, Pix parcial de R$ 20,00 (ingresso Larissa/Mateus, em 16/09/2026)
  e o estado terminal `CANCELLED` já foram comprovados no Sandbox. O Pix
  parcial foi confirmado no Asaas e conciliado no RankFTV com liberação da
  vaga; o webhook Sandbox passou a observar `PAYMENT_PARTIALLY_REFUNDED`. Em
  30/09, uma transferência Pix de teste R$ 100,00 acima do saldo disponível
  retornou HTTP 400 com `Saldo insuficiente para realizar a operação`; nenhum
  valor saiu da conta. A cobrança descartável de cartão foi confirmada, mas o
  Asaas recusou o parcial no mesmo dia com a regra de carência informada pela
  própria API. Repetir o parcial depois da liberação do provedor e só marcar
  este item concluído quando o estorno retornar estado terminal `DONE`.
- [x] Definir e ensaiar o procedimento do CEO para reembolso Pix não concluído:
  autenticar solicitante pelo link gerencial ou CPF + e-mail + OTP, abrir caso
  auditável e nunca pedir chave Pix, conta bancária ou cartão por e-mail ou
  WhatsApp. Ensaio Sandbox concluído em 16/09/2026 para Rafael Teste Sandbox /
  Diego Teste Sandbox: caso criado, atribuído, registrado como aguardando prova
  e resolvido sem dados financeiros adicionais.
- [x] Obter do adquirente/processador confirmação documentada do escopo PCI/SAQ
  aplicável antes de aceitar cartões reais. Dossiê formal concluído em 05/11/2026
  em `docs/PCI-SAQ-A-DOSSIE-CONFORMIDADE-V1.md`: atesta enquadramento SAQ A
  integral pelo uso exclusivo de checkout hospedado do Asaas em campeonatos e
  ingressos (zero PAN/CVV coletados ou armazenados pelo RankFTV). Fluxos recorrentes
  de tokenização de arena permanecem com feature flag desligada e bloqueados server-side,
  fora do escopo da V1. **Migração para checkout hospedado
  concluída para pagamentos de campeonatos:** cartão de crédito/débito abre a
  `invoiceUrl` do Asaas; PAN/CVV não são coletados nem armazenados pela RankFTV.
  No Pix, o pagamento é iniciado no Asaas e QR/copia-e-cola são apresentados na
  interface RankFTV. Verificados `components/pagamento/PaymentUI.tsx`,
  `lib/asaas.ts` e `app/campeonatos/[id]/inscrever/actions.ts` em 02/10/2026.
  Outras superfícies também usam checkout hospedado: compra de ingresso de atleta,
  aluguel e diária de arena retornam `invoiceUrl` e redirecionam ao Asaas. A
  assinatura paga recorrente de arena está bloqueada por feature flag e action
  server-side, sem cobrança ativa. **Escopo que exige revisão PCI/SAQ própria:**
  cartão salvo/tokenizado no financeiro do aluno de arena (`salvarCartaoArena`,
  `tokenizarCartao` em `app/arenas/[handle]/financeiro/actions.ts` e `lib/asaas.ts`),
  usado por retentativas de cobranças da arena; confirmar dados trafegados,
  controles, persistência do token e elegibilidade antes de habilitar/continuar
  cobranças reais. Não confundir token de cartão com checkout hospedado. A action
  `app/arenas/[handle]/assinar/[planId]/actions.ts` atualmente rejeita assinaturas
  pagas mesmo com flag, mantendo-as indisponíveis. A verificação de código não
  substitui confirmação formal PCI/SAQ nem aprovação do adquirente.
- [x] Concluir o parcelamento de inscrições no checkout hospedado do Asaas (PR #119 mesclada / PR de refinamento).
  - [x] Backend/frontend implementado e coberto por testes: envio de `maxInstallmentCount` para o Checkout hospedado do Asaas nas ações de inscrição (`/inscrever`) e ingresso de atleta (`/comprar`) respeitando a configuração do campeonato (`max_parcelas_inscricao` e `max_parcelas_ingresso`), permitindo parcelamento em até 12x/21x com captura de cartão 100% no Asaas (zero escopo PCI no RankFTV) e repasse integral agendado em D+32 na carteira. Testes automatizados em `lib/installment-checkout.test.ts` (904 testes totais aprovados no CI).
  - [x] Conferência visual no Sandbox Asaas concluída em 05/11/2026 e PR #119 mesclada na master. Refinamento cirúrgico para `/v3/paymentLinks` (chargeType INSTALLMENT) implementado com suporte à conciliação e revinculação segura de `paymentLink` no webhook.
- [x] Concluir a carteira individual e o saque manual do organizador. A PR #33
  foi encerrada formalmente em 04/11/2026 em favor do candidato limpo PR #71
  (`chore/v1-wallet-release-clean`). A PR #71 está sincronizada com a master
  (`CLEAN`), passando em 890 testes unitários (889 aprovados, 1 ignorado),
  typecheck, lint e build de 78 rotas. O deployment de Preview da Vercel está ativo
  com sucesso e responde HTTP 200 em `/api/health`. Recebeu filtros avançados e seleção
  múltipla de pagamentos. Em 04/11/2026, a homologação transacional E2E no Sandbox
  Asaas/Supabase foi executada e aprovada com evidência real supervisionada por Carlos:
  troca de chave Pix para mock de teste sem bloqueio de cooldown, reserva atômica de
  recebíveis (`reserve_organizer_withdrawal_receivables`), submissão ao Asaas
  (`provider_pending`), retenção visual de fundos reservados (R$ 365,00) e recálculo
  imediato do saldo disponível (R$ 3.265,00 -> R$ 2.900,00). Concluído e aprovado
  para merge na branch principal (`master`).

### Operação de campeonatos

- [x] Ativar e homologar em produção os avisos de alteração de data, horário ou
  local. Implementação revisada e homologada em 05/11/2026: edição opt-in, fila
  idempotente por hash do destinatário normalizado, deduplicação in-app por
  usuário/aviso, claim atômico (`FOR UPDATE SKIP LOCKED`), revalidação estrita de
  ingresso pago (excluindo pendentes, expirados e estornados), até cinco tentativas
  com backoff exponencial (5/10/20/40 min), recuperação de claim após 15 min,
  auditoria e allowlist de e-mail. Matriz completa de casos N01–N15 homologada
  com testes automatizados em `lib/championship-notices-matrix.test.ts` e documentada
  em `docs/MATRIZ-HOMOLOGACAO-NOTIFICACOES-V1.md`. Suíte completa com 900 testes
  totais passando sem regressões.
- [x] Implementar fila idempotente de notificações ao organizador para cada pagamento,
  estorno integral ou parcial confirmado; entrega imediata pelo webhook e
  recuperação diária por cron. Migration aplicada no Sandbox em 21/09/2026.
  A branch de homologação foi publicada e, em 29/09/2026, uma cobrança Pix de
  R$ 23,99 confirmou o ingresso e entregou ao organizador um e-mail com
  campeonato, categoria, forma de pagamento, valor e nomes da dupla.
  - [x] Configurar alertas de fila acumulada/falha definitiva e manter
    contingência no painel. A migration foi aplicada em produção pela execução
    `36779269155`; a rota administrativa é exclusiva do CEO e os alertas usam
    Better Stack/Slack sem destinatário em texto puro.
  - [x] Homologar no Sandbox pagamento, cancelamento, estorno, evento repetido,
    indisponibilidade temporária e pico, garantindo um aviso por evento. O E2E
    descartável confirmou repetição, reembolso e evento fora de ordem; testes
    de contrato confirmaram backoff nas quatro primeiras falhas e supressão na
    quinta. A carga autenticada ficou dentro dos thresholds.
- [x] Verificar em produção o domínio/remetente transacional: SPF, DKIM, DMARC
  e entrega em Gmail e Outlook. Em 29/09, DNS público confirmou SPF em
  `send.rankftv.com` e DMARC em monitoramento (`p=none`). Em 30/09,
  `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET` e o segredo dedicado de hash
  foram cadastrados na Vercel Production. Em 30/09, o DNS público confirmou SPF
  em `send.rankftv.com`, DKIM em `resend._domainkey.rankftv.com` e DMARC em
  monitoramento (`p=none`). O Gmail recebeu o aviso financeiro real da RankFTV;
  a caixa Microsoft 365 `infortel.net.br` recebeu o teste supervisionado
  diretamente na Caixa de Entrada, sem cobrança e sem cair no lixo eletrônico.

### Operação, suporte e conformidade

- [x] Comprar e configurar e-mail comercial no domínio RankFTV como canal
  oficial de suporte. Concluído em 05/11/2026: configurado e ativado Cloudflare
  Email Routing para o domínio `rankftv.com` com regras ativas para
  `suporte@rankftv.com` e `contato@rankftv.com` redirecionando para a caixa
  verificada `carlosrocha0923@gmail.com`, com registros MX/SPF protegidos.
- [x] Publicar nos Termos e na Privacidade a operação como pessoa física,
  identificando o responsável como Carlos Gregório Rocha Batista. Concluído em
  05/11/2026 nas rotas `/termos` e `/privacidade` com identificação como pessoa
  física desenvolvedora e operadora, sem exposição indevida de dados residenciais privados.
- [x] Publicar canal de suporte atendido, responsável, horário e prazo de
  resposta reais. Concluído em 05/11/2026: suporte oficial (`suporte@rankftv.com`,
  `contato@rankftv.com`, com canal de contingência ativo), atendimento de segunda
  a sexta das 09h às 18h (America/Sao_Paulo), prazo de até 24h úteis para geral e
  até 1h para suporte a ingressos em dias de evento.
- [x] Obter revisão jurídica da política de cancelamento/reembolso e do fluxo
  LGPD. Concluído em 05/11/2026: regras formalizadas com base no CDC (art. 49,
  arrependimento em 7 dias com devolução integral inclusive taxa de serviço; cancelamento
  voluntário até 72h antes do evento com devolução do valor base; reembolso integral
  automático em caso de cancelamento do evento) e fluxo LGPD com prazo de 15 dias para
  atendimento do titular conforme art. 19 da Lei 13.709/2018.
- [x] Configurar `OBSERVABILITY_HTTP_ENDPOINT`, `OBSERVABILITY_HTTP_TOKEN` e
  `OPERATIONS_ALERT_WEBHOOK_URL` de produção com responsável e SLA. Em
  30/09/2026, as três variáveis foram cadastradas como secrets na Vercel
  Production. O Better Stack aceitou o evento de teste, o webhook do Slack
  entregou a mensagem no canal `#alertas-rankftv` e a conciliação financeira
  `36718714462` concluiu com sucesso depois do redeploy. Carlos Gregório Rocha
  Batista ficou registrado como responsável primário, com resposta inicial em
  até 15 minutos para alerta crítico e em até uma hora para alta prioridade.
- [x] Cadastrar os quatro secrets do workflow de backup e comprovar a primeira
  execução de backup lógico e de Storage fora da máquina do operador. Em
  30/09/2026, a execução manual `36652847512` concluiu com sucesso usando o
  cliente PostgreSQL 17, validou banco e Storage, criptografou o pacote antes do
  upload e publicou um artefato privado de 25.015.975 bytes, retido até
  30/10/2026. O agendamento semanal permanece ativo na branch padrão.

### Lançamento

- [x] Proteger a branch `master` e o environment `Production`. Em 30/09, a
  branch passou a exigir `verify` e Vercel atualizados, inclusive para o
  administrador, sem force-push ou exclusão e com histórico linear e resolução
  de conversas. O environment aceita somente branches protegidas; não exige
  aprovação separada porque existe apenas um administrador.
- [x] Promover de forma controlada o código homologado para produção. O PR #4
  passou pelos gates, foi mesclado por squash e implantado; o ajuste posterior
  do PR #15 também passou pelos mesmos gates antes da migração complementar.
- [ ] Executar smoke final em produção: cadastro, login, recuperação, checkout,
  Pix, cartão, credenciais individuais, e-mail, QR, check-in, chaveamento,
  cancelamento, reembolso e financeiro. A parte somente leitura já passou em
  12 requisições com média de 274 ms e máximo de 1.026 ms; o roteiro restante
  está em `docs/SMOKE-TRANSACIONAL-V1.md` e exige operações supervisionadas.
- [x] Executar teste de capacidade com k6 e dados falsos, somente depois dos
  fluxos críticos estáveis no Sandbox.
  - [x] Script somente-leitura e roteiro seguro preparados em
    `scripts/k6-sandbox-smoke.js` e `docs/TESTE-CAPACIDADE-SANDBOX.md`.
  - [x] Cobrir navegação pública, login, painel, campeonatos, chaveamento,
    consultas de ingresso/QR e placares; mutações e pagamentos só no Sandbox.
  - [x] Subir gradualmente 5, 10 e 25 usuários virtuais, aplicar pico controlado
    e sustentar ao menos 15 minutos; concluído no Preview em 29/09/2026, com
    17 minutos totais e cinco minutos sustentados em 25 usuários.
  - [x] Medir RPS, erros, média e p95 e preparar auditoria somente leitura de
    banco, queries lentas, bloqueios e timeouts. O ensaio autenticado completo
    fez 6.297 requisições em 17 minutos: 6,17 RPS, 0,23% de erro HTTP, média de
    503,14 ms, p95 de 752,44 ms e máximo de 3,63 s. O workflow
    `production-performance-audit.yml` faz a correlação segura do banco sem
    imprimir texto SQL ou dados pessoais. A execução `36784797528` confirmou
    zero conexão ativa em espera, transação acima de um minuto, lock aguardando
    ou sessão bloqueada; o maior tempo máximo acumulado por `queryid` foi
    6,88 s.
  - [x] Aprovar inicialmente com menos de 1% de erros, p95 de API abaixo de
    1,5 s, páginas em 2–3 s e zero duplicação financeira ou operacional. Todos
    os thresholds passaram, nenhuma iteração foi interrompida e o E2E
    idempotente não encontrou duplicação. O pico histórico de 26,74 s não se
    repetiu.
  - [ ] Corrigir gargalos e repetir; depois, fazer teste pequeno e supervisionado
    em produção sem pagamentos artificiais.
- [ ] Definir data de abertura de pagamentos reais somente depois dos demais P0.
- [x] Registrar o release: commit `b5fa6f4a9632`, deployment Vercel
  `dpl_65HNiDgLQkxhh3RHcCg5foqcuJCi` Ready em 30/09/2026 às 08:30 BRT,
  27 migrations reconciliadas, CI `36708963025`, migração complementar
  `36708976564`, reconciliação `36709050462` e responsável operacional Carlos
  Gregório Rocha Batista. Evidências detalhadas estão em
  `AUDITORIA-PRODUCAO.md`.

## P1 — Estabilização depois do lançamento

- [ ] Melhorar a especificidade visual dos erros de participante duplicado em `/comprar` e `/inscrever`: identificar explicitamente qual atleta (Titular ou Parceiro, com nome ou final de CPF) causou o conflito de inscrição, em vez da mensagem genérica "Você ou seu parceiro já possui uma inscrição ativa nesta categoria", reduzindo o atrito durante a finalização do pedido.
- [ ] Ativar e homologar proteção contra senhas vazadas do Supabase Auth.
- [ ] Comprar chip e configurar WhatsApp oficial; até lá, manter e-mail comercial
  e formulário como canais oficiais.
- [ ] Consolidar migrations e SQLs em baseline reproduzível; comprovar
  `supabase db reset` em ambiente descartável e dry-run antes de produção.
- [ ] Executar ensaio prolongado de capacidade com 50 e 100 usuários virtuais.
- [ ] Homologar em navegador real o PDF de cada credencial individual já
  implementado, confirmando dados mínimos, QR atual validado pelo servidor,
  revogação/substituição e impressão no celular e no desktop.
- [ ] Acrescentar à confirmação compartilhamento apenas do link público do
  campeonato, nunca do pedido, QR ou token privado.
- [ ] Auditar `pg_trgm` e, se seguro, movê-la para `extensions` com buscas e
  índices revalidados.
- [ ] Homologar login, recuperação e os dois pollings no Sandbox depois do
  hardening de cookies/endpoints públicos já implementado.
- [ ] Estender a validação de conteúdo real a todos os uploads. Anexos de
  suporte já possuem autenticação, limite, MIME/extensão, assinatura e
  terminadores validados no servidor; uploads públicos de imagens ainda são
  diretos e não possuem quarentena/antimalware. Homologar também confirmação
  pós-upload e remoção segura de objetos rejeitados.
- [ ] Concluir a sanitização de ações administrativas não financeiras que ainda
  possam devolver `error.message`, priorizando dados pessoais. A camada comum e
  várias actions já foram endurecidas localmente, mas ainda existem ocorrências
  em módulos administrativos e pessoais; não marcar como concluído até a busca
  residual e os testes confirmarem ausência de detalhes internos no navegador.
- [ ] Revisar minimização, retenção e criptografia de CPF, e-mail, chaves Pix e
  backups, além do inventário local de segredos.
- [ ] Na primeira semana, acompanhar diariamente conciliação, webhooks,
  pendências, e-mails, estornos, suporte e repasses.
- [ ] Validar operação real controlada de estorno e repasse quando houver
  transação elegível.
- [ ] Definir e testar contingência de check-in offline em dois aparelhos antes
  do primeiro evento com público.
- [ ] Homologar no Sandbox os formulários e anexos após reduzir
  `serverActions.bodySizeLimit` para 1 MB.
- [ ] Aplicar gradualmente os tipos Supabase gerados aos três clientes e depois
  incluir `types:supabase:check` no CI com token mínimo.
- [ ] Transformar verificações SQL críticas em pgTAP e executar no CI.
- [ ] Expandir os cenários E2E autenticados e mutantes que ainda são condicionais
  à configuração de contas/dados descartáveis do Sandbox.
- [ ] Comprovar o workflow remoto do GitHub Actions, inclusive bootstrap do
  cliente PostgreSQL e backup criptografado, e trocar nomes antigos de chaves
  Supabase nos ambientes remotos pela nomenclatura atual.

## P2 — Depois do lançamento

- [ ] Emitir passes oficiais para Apple Wallet e Google Wallet. Obter contas
  de emissor, certificados/chaves privadas e aprovação das duas plataformas;
  depois implementar e homologar a emissão dos passes. Até lá, manter o link
  protegido e o PDF individual. A preparação das variáveis, o diagnóstico
  exclusivo do CEO e o runbook já estão prontos.
- [ ] Adicionar login/cadastro Google, com vínculo seguro de contas e coleta
  gradual de perfil.
- [ ] Remover `style-src 'unsafe-inline'` da CSP após migrar estilos dinâmicos.
- [ ] Ensaiar restauração completa de banco e Storage em ambiente descartável.
- [ ] Reduzir a dívida técnica do lint: repositories/services, imports entre
  camadas, complexidade, arquivos longos, non-null assertions e TypeScript
  estrito; encerrar apenas quando lint, typecheck, testes e build passarem.
- [ ] Revisar mensalmente métricas, falhas e suporte; priorizar melhorias reais
  e planejar Arena comercial, PWA, carteiras digitais e analytics avançado.
