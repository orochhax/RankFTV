# Registro de Execuções — RankFTV

Registro permanente de ações técnicas realizadas, evidências e bloqueios. Antes
de iniciar qualquer tarefa, consultar este arquivo, `PENDENCIAS-V1.md`, o Git e
o serviço envolvido. Se houver evidência de conclusão, não repetir a tarefa;
registrar apenas uma revalidação quando ela for necessária.

## 2026-10-01 — Rascunho sem menu operacional e resumo de planos

- Status: concluído em código; pendente apenas da validação remota da PR.
- Mudança: quando um campeonato está em `rascunho`, o cabeçalho contextual
  mostra somente “Prévia pública” e não renderiza o menu Gerenciar, inclusive
  no drawer móvel. Depois da publicação, o menu volta a ser exibido.
- Mudança: a tela de criação concluída passa a exibir ao final um resumo dos
  planos. Ele lista apenas funcionalidades confirmadas e informa que o Elite
  reduz a taxa de serviço cobrada do comprador para 7% no Pix e 9% no cartão,
  contra 8% e 10% no Padrão.
- Transparência: o resumo não promete categoria balanceada, WhatsApp oficial,
  stories, destaque automático ou call com CEO, pois esses itens não estão
  automatizados/disponíveis na V1.

## 2026-10-01 — Merge controlado da PR #25 em `master`

- Status: concluído no GitHub. A PR #25 (`V1: checkout hospedado e workers
  financeiros`) foi mesclada por squash em `master` no commit `255a85e6`.
- Evidência: os três checks obrigatórios estavam aprovados antes do merge:
  CI/verify, Vercel e Vercel Preview Comments; a PR não tinha conflitos.
- Resultado de V1: checkout de cartão hospedado pelo Asaas passou a integrar
  `master`. O RankFTV não recebe PAN ou CVV nos fluxos de campeonato, aluguel,
  diária ou assinatura. A pendência PCI correspondente foi marcada concluída
  em `PENDENCIAS-V1.md`.
- Evidência de deploy: em 01/10/2026, a listagem da Vercel mostrou o deployment
  `V1: checkout hospedado...`, commit `255a85e`, ambiente `Production` e estado
  `Ready` (53 s). A abertura pública de campeonatos também respondeu
  normalmente. Nenhum segredo foi exibido nem alterado.
- Limite: não houve teste financeiro em produção; o smoke transacional continua
  sendo uma etapa supervisionada própria.

## 2026-10-01 — Resolução de conflitos da PR #25 com `master`

- Status: concluído localmente e pendente de validação remota após o envio da
  resolução para a própria PR; nenhum merge para `master` foi feito.
- Escopo: a resolução ocorreu no worktree isolado
  `C:\Users\SnyX\Documents\Projeto-RankFTV-pr25-merge`. As alterações não
  relacionadas que estavam abertas no worktree principal foram preservadas e
  não foram modificadas.
- Feito: todos os conflitos de integração foram resolvidos. Foi incorporada a
  versão atual de `master` para os alertas operacionais, workflows, smoke de
  produção somente leitura, documentação operacional e executor k6 com sessão
  efêmera. Os fluxos de checkout de cartão, schemas e testes de pagamento da
  PR foram preservados para impedir qualquer reintrodução de PAN ou CVV no
  RankFTV; o cartão continua exclusivamente no checkout hospedado do Asaas.
- Correção adicional: removido um import sem uso em
  `SubscriptionPaymentUI.tsx`. O guard de reserva do Sandbox foi corrigido
  para não depender de `.env.sandbox.local`, um arquivo local ignorado pelo
  Git e ausente no CI; quando o arquivo existir, ele continua sendo validado.
- Validação local: `npm audit --omit=dev --audit-level=high` aprovou sem
  vulnerabilidades; lint e typecheck aprovaram (permanecem avisos legados);
  `npm test` aprovou 806/806 testes. `next build` ficou impedido nesta máquina
  por falha de rede ao obter a fonte Inter do Google Fonts, após chegar ao
  bundler. Os E2E locais foram interrompidos porque o worktree isolado não
  recebeu configuração pública do Supabase; segredos não foram copiados. A
  Preview da Vercel da PR já havia concluído com sucesso antes desta resolução.
- Próxima evidência obrigatória: enviar a resolução, aguardar os checks remotos
  `verify` e Vercel e só então decidir sobre o merge, respeitando a proteção
  da branch `master`.

## 2026-10-01 — Validação remota da resolução da PR #25

- Status: concluído. O commit de resolução `482f179` foi enviado para
  `feat/refund-policy-homologation`; o GitHub passou a classificar a PR #25
  como `MERGEABLE`, sem conflitos.
- Evidência: workflow CI `36860832203` aprovado em 3 min 58 s, com auditoria
  de dependências, lint, typecheck, 806 testes unitários/contrato, build e
  testes Playwright aprovados. Os testes de navegador reportaram 30 aprovados
  e 55 cenários financeiros ignorados por configuração segura.
- Observações não bloqueantes: permanecem avisos legados de lint e um aviso de
  depreciação do Node 20 em actions do GitHub; não houve falha de qualidade,
  segurança ou teste. A PR permanece aberta e nenhum merge foi executado.

## 2026-10-01 — Ampliação do teste de capacidade V1

- Status: concluído no Sandbox/Preview; a correlação de infraestrutura continua
  pendente como item próprio no checklist.
- Escopo: somente Sandbox/Preview, exclusivamente GETs; sem pagamentos,
  inscrições, contas reais ou dados financeiros.
- Feito: o k6 passou a cobrir home, listagem de campeonatos, arenas, notícias,
  login, cadastro, detalhes do campeonato, categorias, chaveamento e placar.
  O executor autenticado cria sessões efêmeras, sem imprimir ou persistir
  cookies.
- Evidência: a primeira amostra pública de 14 requisições teve p95 de 1,76 s
  por uma resposta isolada de 2,22 s. A repetição autenticada, em 01/10/2026,
  aprovou 32/32 checks, 0% de erros e p95 geral de 773,76 ms.
- Evidência principal: perfil autenticado de 17 minutos em
  `rank-ftv-git-sandbox-homologacao-devcarlosrochas-projects.vercel.app`, com
  rampa até 25 VUs e cinco minutos sustentados, concluiu 6.497 requisições
  (6,37 RPS), 12.994/12.994 checks, 0% de falhas e 0 interrupções. Média
  420,71 ms; p95 geral 669,19 ms; p95 público 448,08 ms; p95 de campeonato
  411,58 ms; p95 autenticado 756,81 ms; máximo 2,27 s.
- Artefatos locais ignorados pelo Git: `.codex-artifacts/k6-authenticated-smoke-2026-10-01.json`
  e `.codex-artifacts/k6-authenticated-capacity-2026-10-01.json`.
- Revalidação do executor após refatoração: smoke autenticado aprovou 28/28
  checks, 0% de falhas e p95 geral de 716,32 ms; a checagem sintática e o lint
  dos scripts não apresentaram erros nem avisos.
- Limite: não foram feitas mutações, pagamentos ou inscrições. A análise de
  banco, queries lentas, bloqueios, Vercel e serviços externos exige acesso às
  métricas correspondentes e permanece explicitamente pendente.

## 2026-10-01 — Verificação de secrets dos workers P0

- Status: concluído, sem alteração de segredo.
- Evidência: a listagem segura do GitHub Environment `Production` confirmou a
  existência de `FINANCIAL_RECONCILIATION_URL` e `CRON_SECRET` em 01/10/2026.
  Nenhum valor foi exibido, copiado ou registrado.
- Resultado: o bloqueio remanescente é promover os workflows para a branch
  padrão e comprovar sua execução periódica; não é mais o cadastro dos secrets.

## 2026-10-01 — Smoke E2E não financeiro no Sandbox

- Status: concluído parcialmente, dentro do escopo não financeiro.
- Evidência: `scripts/test-e2e-sandbox.ps1` preparou a conta descartável de
  atleta e executou Playwright contra o Preview/Sandbox. Resultado: 40 testes
  aprovados em Chromium, Firefox, WebKit e versões mobile, em 59 segundos.
- Cobertura aprovada: CSP, robots/sitemap, bloqueio de admin anônimo, layout
  de login em viewport estreito, compras do atleta e painel do organizador;
  também rejeitou token e schema inválidos de webhook antes de tocar estado
  financeiro.
- Limite: 45 cenários mutantes foram deliberadamente ignorados porque a
  execução manteve `E2E_ASAAS_MUTATION_TESTS=0`,
  `E2E_CARD_GUARD_MUTATION_TESTS=0` e
  `E2E_CHECKOUT_MUTATION_TESTS=0`. A homologação completa de compra,
  pagamento, cancelamento e estorno continua pendente e não foi repetida.

## 2026-10-01 — Versionamento da entrega de capacidade

- Status: concluído. O commit `544736d` (`test: ampliar carga autenticada no
  sandbox`) foi enviado para `feat/refund-policy-homologation`, na PR #25.
- Evidência remota no momento da consulta: Preview da Vercel aprovado; a PR
  permaneceu aberta com um check ainda pendente e estado de merge `DIRTY`.
  Nenhum merge ou promoção foi executado.

## 2026-09-30 — Checkout hospedado e hardening de V1

- Status: concluído e versionado na PR #25.
- Evidências principais: checkout hospedado do Asaas para cartão, sem PAN/CVV
  no RankFTV; migration `supabase/hosted-arena-card-checkout.sql` aplicada em
  Production; observabilidade Better Stack/Slack e backup verificados.
- Verificação de código: typecheck, build e testes automatizados passaram no
  ciclo de 30/09. Para detalhes, consultar commits `7c26636`, `2db8e5a`,
  `0949d3f`, `cc19773`, `f3417c3` e `b4aea09`.
