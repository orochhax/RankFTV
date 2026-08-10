# RankFTV — Pendências para V1

## Objetivo atual

V1 = Campeonatos  
Arena = Beta  
Life OS = Fora do escopo

O escopo está congelado. Até a liberação da V1, o trabalho permitido é corrigir,
testar, homologar, documentar e operar com segurança o fluxo já existente de
Campeonatos. Não entram novas funcionalidades, redesign, expansão comercial da
Arena ou transformação das ferramentas pessoais em produto.

Fluxo-alvo da V1:

`cadastro/login → campeonato → categoria/ingresso → pagamento → credencial/QR → check-in → chaveamento/resultados → financeiro/repasse/reembolso`

Contradições encontradas no produto atual:

- a landing do organizador promete boleto, embora o checkout não implemente boleto;
- a Arena se apresenta como produto pronto e promete cobrança recorrente completa,
  embora cancelamento pelo assinante, inadimplência e cadência operacional ainda
  não estejam homologados;
- módulos pessoais continuam no mesmo repositório e no admin, mas não fazem parte
  do release comercial e não podem consumir o orçamento de fechamento da V1.

## Status geral

Percentual anterior: 78%  
Percentual atual estimado: 84% (código local verificado; produção ainda bloqueada pelos P0 manuais)  
Última atualização: 09/08/2026  
Último commit analisado: `8a65983e392a435696f17ab6ff04d868da9a2149`

## Legenda

- [x] Resolvido e verificado
- [ ] Pendente
- [M] Manual — depende de mim/serviço externo
- [B] Bloqueado
- [?] Não verificado
- [P2] Pós-V1

## P0 — Bloqueia lançamento

- [M] Confirmar backup/PITR recuperável do Supabase de produção antes de executar SQL.
- [M] Confirmar e aplicar, em janela sem checkout, as sete migrations de produção
  listadas em **Aplicação controlada das migrations**.
- [M] Validar o backfill de `spectator_ticket_items_backfill_report`; qualquer linha
  `partial` ou `unmigrated` exige decisão individual antes de liberar estoque/estorno.
- [M] Homologar em ambiente descartável toda a matriz financeira de Campeonatos,
  sem apontar testes mutantes para produção.
- [M] Confirmar KYC e as capacidades de Pix, cartão, parcelamento, estorno e
  transferência na conta Asaas de produção.
- [M] Definir a cadência de conciliação financeira. O deploy atual agenda
  `/api/cron/financial-reconciliation` uma vez ao dia por limitação do plano
  Vercel usado; operações ambíguas não podem depender de uma espera de até 24 h.
- [M] Fornecer e revisar os dados empresariais, canal oficial de suporte,
  política de cancelamento/reembolso e textos jurídicos antes da primeira cobrança.
- [M] Configurar e validar domínio/remetente transacional (SPF, DKIM e DMARC).
- [x] Corrigir no webhook a competência de mensalidade derivada do vencimento do
  pagamento, e não do horário em que o webhook chegou.
- [x] Limitar claramente a cobrança recorrente da Arena enquanto ela estiver beta.

## P1 — Necessário para lançamento

### Produto e conteúdo

- [x] Remover a promessa pública de boleto enquanto boleto não existir.
- [x] Identificar publicamente a Arena como beta e não prometer automação financeira
  ainda não homologada.
- [x] Escopo comercial congelado neste documento: V1 = Campeonatos.

### Banco e produção

- [x] Scripts incrementais críticos estão versionados em `supabase/` e possuem
  testes contratuais locais em `lib/production-migrations.test.ts`.
- [x] Ledger financeiro, outbox, ledger de webhook e guardas de cartão possuem RLS,
  revogação para `anon/authenticated` e acesso exclusivo por `service_role` nos SQLs.
- [?] O repositório não usa uma tabela/histórico padrão de migrations do Supabase;
  a equivalência entre arquivos e produção deve ser comprovada pelas consultas do
  runbook, não presumida pelo Git.
- [?] Buckets, limites MIME/tamanho e policies reais do Storage precisam ser
  comparados no painel Supabase.

### Financeiro de Campeonatos

- [x] Requisições financeiras usam referência externa estável e ledger para evitar
  criação concorrente duplicada (testes contratuais existentes).
- [x] Webhook Asaas possui token, limite de payload, validação de schema, ledger de
  idempotência e ordenação monotônica antes de alterar o domínio.
- [x] Confirmação e estorno de inscrições compartilham a mesma lógica entre webhook
  e conciliação manual.
- [x] Repasse só é final após estado `DONE` do provedor; estado incerto é conciliado
  sem gerar uma nova transferência.
- [x] Executar a suíte automatizada local de ledger, duplicidade, timeout, estorno,
  chargeback, repasse e falha de repasse: 490/490 testes aprovados.
- [M] Executar a homologação sandbox de Pix, cartão, duplicidade, timeout, estorno,
  chargeback e repasse com credenciais/dados descartáveis.
- [?] Validar no Asaas sandbox o comportamento de eventos não exercitados por
  fixture local e comparar interface, provedor e tabelas financeiras.

### Segurança

- [x] Unificar autorização comercial do `/admin` em `profiles.role` (`admin`/`ceo`),
  mantendo `ADMIN_EMAIL` apenas como identidade das ferramentas pessoais.
- [x] Service role está isolada em módulo `server-only` e não usa prefixo público.
- [x] Turnstile está integrado às telas de autenticação e deve ser confirmado no
  domínio final.
- [x] Rate limiting persistente existe para operações críticas previstas nas
  migrations de produção.
- [x] Remover e-mail/PII dos logs de falha do envio transacional e hashear as chaves
  persistidas de rate limit que antes podiam conter IP, CPF ou e-mail.
- [x] CSP por nonce, HSTS, proteção de frame, MIME e Permissions-Policy estão
  configurados e cobertos por testes locais.
- [?] Fazer revisão autenticada das RLS como atleta, organizador, staff, admin e
  usuário sem vínculo no sandbox.

### UX de lançamento

- [x] Corrigir o seletor de persona e o card de destaque para não cortar conteúdo
  em larguras pequenas; verificado visualmente em viewport Chromium 390 × 844.
- [x] Criar fallbacks globais de loading, erro e página não encontrada.
- [?] Validar cadastro, pagamento, credencial, check-in, chaveamento e financeiro
  em celular real e desktop no Preview aprovado.

### E-mail

- [x] Templates locais de convite, inscrição, pagamento e recuperação possuem
  testes de renderização.
- [x] Alertar operacionalmente falhas de envio sem registrar destinatário.
- [?] Confirmar no Supabase Auth os templates e redirects de cadastro, confirmação
  e recuperação de senha do domínio final.
- [M] Publicar DNS e testar entrega conforme **Configuração do e-mail transacional**.

### Jurídico e suporte

- [ ] Remover placeholders jurídicos somente após receber dados verdadeiros; não
  inventar razão social, CNPJ, responsável ou e-mail.
- [M] Revisar Termos, Privacidade, cancelamento/reembolso e fluxo LGPD com apoio
  jurídico/contábil.
- [M] Definir canal de suporte e responsável/SLA para pagamento, ingresso, estorno,
  repasse, segurança e solicitações de titulares.

### Monitoramento

- [x] `/api/health` verifica aplicação e banco sem expor segredo.
- [x] Proxy cria `x-request-id`; eventos operacionais são JSON estruturado e passam
  por sanitização de PII/segredos.
- [x] Falhas graves de webhook, ledger e conciliação geram evento operacional e
  podem acionar `OPERATIONS_ALERT_WEBHOOK_URL`.
- [M] Configurar alerta operacional e monitor externo para `/api/health`.
- [M] Definir quem responde a uma operação financeira pendente ou webhook falho.

### SEO

- [x] Criar `robots.txt` com bloqueio das áreas privadas.
- [x] Criar `sitemap.xml` somente com rotas públicas estáveis.
- [x] Configurar canonical e Open Graph global.
- [x] Definir `noindex` explícito por `X-Robots-Tag` nas áreas privadas.

## P2 — Pós-lançamento

- [P2] Produto comercial e roadmap do Life OS, Performance e Carteira em Rota.
- [P2] Redesign visual ou refatoração estética sem impacto operacional.
- [P2] Analytics de produto avançado.
- [P2] Aplicativo nativo, WhatsApp, IA comercial e expansão de ranking.
- [P2] Plataforma de assinatura da própria Arena.
- [P2] Completar inadimplência e ciclo recorrente da Arena depois que houver decisão
  comercial, fiscal, de suporte e homologação específica.

## Arena Beta

- [x] Exibir “Beta” nos pontos públicos de entrada e remover afirmações de produto
  financeiro finalizado.
- [x] Desabilitar por padrão novas assinaturas recorrentes de alunos até existir
  habilitação explícita e homologação separada.
- [P2] Implementar cancelamento self-service preservando `access_until`.
- [P2] Tratar `PAYMENT_OVERDUE` e política de carência/inadimplência.
- [P2] Revisar cancelamento, reativação, cobrança fora de ordem e emissão fiscal.
- [P2] A frequência dos crons de Arena não bloqueia Campeonatos se suas cobranças
  de risco permanecerem desabilitadas.

## Ações manuais minhas

### Backup e confirmação do backup

Motivo: migrations e backfills financeiros não devem ser executados sem caminho
de recuperação comprovado.  
Onde fazer: Supabase de produção, em `Database > Backups` ou `Point in Time Recovery`.  
Passo a passo:

1. Confirmar pelo identificador do projeto que o painel aberto é o de produção.
2. Registrar data/hora e tipo do backup mais recente.
3. Confirmar a janela de retenção e localizar a ação de restauração sem executá-la.
4. Preferencialmente restaurar um backup recente em projeto separado e executar
   uma consulta simples de contagem para provar que o backup é utilizável.
5. Guardar evidência privada; não publicar URL, IDs sensíveis ou credenciais.

O que preciso ter: acesso de administrador ao Supabase e capacidade de backup/PITR.  
Como saber que funcionou: há backup identificável e um procedimento de restore
testado ou oficialmente disponível.  
Evidência que devo trazer para você: data/hora, tipo do backup, janela de retenção
e resultado do teste de restauração, sem segredos.

### Aplicação controlada das migrations

Motivo: o código novo depende de tabelas, RPCs e índices que não podem ser
inferidos como existentes só porque estão no Git.  
Onde fazer: SQL Editor do Supabase de produção, após backup, em janela sem checkout.  
Passo a passo:

1. Confirmar primeiro as migrations-base `harden-ticket-inventory-security.sql`,
   `add-elite-fee-collection.sql` e `add-security-audit-log.sql` conforme o runbook.
2. Aplicar uma por vez, aguardando sucesso antes da próxima, nesta ordem:
   1. `supabase/financial-operations.sql`
   2. `supabase/payment-card-attempt-security.sql`
   3. `supabase/production-spectator-ticket-items.sql`
   4. `supabase/production-order-inventory-release.sql`
   5. `supabase/asaas-webhook-idempotency.sql`
   6. `supabase/production-query-indexes.sql`
   7. `supabase/production-data-retention.sql`
3. Executar as consultas de validação de `RUNBOOK-PRODUCAO.md`.
4. Conferir que tabelas/RPCs existem e que grants de cliente não foram abertos.
5. Conferir o relatório do backfill. Não corrigir linhas ambíguas automaticamente.

O que preciso ter: backup confirmado, acesso ao SQL Editor e janela sem pagamentos.  
Como saber que funcionou: todos os scripts retornam sucesso e todas as consultas
de validação produzem os objetos/contagens esperados.  
Evidência que devo trazer para você: horário e resultado de cada script, saída das
consultas de objetos e relatório agregado/pendente do backfill.

### Rollback e restore de banco

Motivo: rollback de aplicação não desfaz schema nem ledger financeiro.  
Onde fazer: Vercel para rollback da aplicação; Supabase para restore apenas em
incidente confirmado e com aprovação explícita.  
Passo a passo:

1. Em falha de aplicação, interromper abertura de novos pagamentos e promover o
   último deployment aprovado na Vercel.
2. Não apagar migrations, operações financeiras ou eventos de webhook.
3. Diagnosticar se a falha é apenas de aplicação ou se houve corrupção de dados.
4. Para falha de schema/dados, abrir incidente, registrar o horário de corte e
   selecionar backup/PITR anterior ao evento.
5. Restaurar primeiro em projeto separado quando possível e comparar contagens.
6. Só substituir produção com aprovação explícita e plano para reconciliar os
   pagamentos que chegaram depois do ponto restaurado.

O que preciso ter: deployment anterior, backup/PITR e responsável pelo incidente.  
Como saber que funcionou: aplicação volta a responder e banco/Asaas são
reconciliados sem duplicar cobrança ou repasse.  
Evidência que devo trazer para você: timeline, deployment restaurado, ponto do
backup e relatório de conciliação.

### Homologação financeira em sandbox

Motivo: testes locais provam regras, mas não provam a integração real entre UI,
Asaas e banco.  
Onde fazer: Preview conectado exclusivamente a Supabase e Asaas sandbox.  
Passo a passo:

1. Criar contas e campeonato descartáveis.
2. Configurar as variáveis `E2E_*` em ambiente seguro, nunca no Git.
3. Confirmar visualmente que a URL/chaves são de sandbox.
4. Executar a matriz de **Testes obrigatórios antes de abrir pagamentos**.
5. Para cada cenário, comparar UI, Asaas e tabelas/ledger.
6. Não apagar operação ambígua; deixar a conciliação resolver e registrar o tempo.

O que preciso ter: Preview isolado, credenciais sandbox e contas descartáveis.  
Como saber que funcionou: cada cenário tem uma única referência externa e estados
consistentes nos três lados.  
Evidência que devo trazer para você: matriz preenchida com IDs mascarados, status e
horários, além do relatório do Playwright.

### Preparação do Asaas de produção

Motivo: a aplicação não consegue habilitar KYC/capacidades da conta por código.  
Onde fazer: painel/suporte Asaas e variáveis Production da Vercel.  
Passo a passo:

1. Confirmar KYC e habilitação de Pix, cartão, parcelamento, estorno e transferência.
2. Confirmar limites, prazos de liquidação e eventos de chargeback.
3. Cadastrar a URL `https://www.rankftv.com/api/webhooks/asaas` com token exclusivo.
4. Habilitar confirmação, recebimento, estorno, exclusão e chargeback.
5. Remover endpoints antigos de tunnel/sandbox do ambiente de produção.
6. Testar o webhook do painel e confirmar HTTP 2xx e evento sanitizado nos logs.

O que preciso ter: conta Asaas de produção aprovada e secrets de produção.  
Como saber que funcionou: capacidades constam ativas e o webhook autenticado chega
ao deployment correto.  
Evidência que devo trazer para você: lista de capacidades, evento testado e resposta,
sem chave/token/dados pessoais.

### Cadência da conciliação financeira

Motivo: o outbox reagenda em minutos, mas o cron atual da Vercel roda uma vez ao dia.  
Onde fazer: plano/configuração Vercel ou agendador externo autenticado.  
Passo a passo:

1. Escolher Vercel com cron frequente ou agendador confiável que permita `*/10 * * * *`.
2. Manter `CRON_SECRET` privado e enviar `Authorization: Bearer ...`.
3. Chamar somente `/api/cron/financial-reconciliation`.
4. Testar primeiro em Preview e confirmar 200, logs e processamento de fixture pendente.
5. Criar alerta para três falhas consecutivas.

O que preciso ter: agendador com intervalo de 10 minutos e `CRON_SECRET`.  
Como saber que funcionou: execuções aparecem a cada 10 minutos e uma operação de
teste é conciliada no intervalo esperado.  
Evidência que devo trazer para você: histórico das execuções e ID mascarado da
operação conciliada.

### Configuração do e-mail transacional

Motivo: entrega confiável depende de domínio e DNS externos.  
Onde fazer: Resend, provedor DNS e Vercel Production.  
Passo a passo:

1. Adicionar o domínio de envio no Resend.
2. Publicar exatamente os registros SPF e DKIM fornecidos pelo Resend.
3. Publicar DMARC inicialmente em modo monitorado e definir destinatário autorizado.
4. Aguardar verificação do domínio no Resend.
5. Definir `RESEND_FROM_EMAIL` com endereço do domínio verificado.
6. Fazer novo deploy e testar confirmação, recuperação, convite, inscrição,
   pagamento e OTP.
7. Enviar para Gmail e Outlook; conferir caixa de entrada, spam, remetente e links.

O que preciso ter: acesso ao DNS, conta Resend e caixa Gmail/Outlook.  
Como saber que funcionou: Resend marca o domínio como verificado e os dois provedores
recebem mensagens com links no domínio correto.  
Evidência que devo trazer para você: status SPF/DKIM/DMARC e tabela de entrega por
tipo de e-mail/provedor, sem expor destinatários.

### Dados jurídicos e suporte

Motivo: os arquivos públicos contêm placeholders que não podem ser preenchidos por
inferência.  
Onde fazer: fornecer dados para `app/termos/page.tsx`,
`app/privacidade/page.tsx` e canal público de suporte.  
Passo a passo:

1. Informar nome/razão social, CNPJ quando aplicável e identificação pública válida.
2. Informar e-mail oficial de suporte e de privacidade/DPO, se houver.
3. Definir política de cancelamento, estorno, chargeback e prazo de resposta.
4. Definir responsável e roteiro básico de incidente/LGPD.
5. Revisar os textos completos com profissional jurídico/contábil.

O que preciso ter: dados empresariais verdadeiros e decisão de atendimento.  
Como saber que funcionou: não há `[PENDENTE]`; links e políticas refletem a operação
real e foram aprovados.  
Evidência que devo trazer para você: dados públicos aprovados e versão revisada dos
documentos, sem documentos pessoais desnecessários.

### Segurança do domínio, Auth e Storage

Motivo: redirects, CAPTCHA, buckets e RLS reais dependem dos painéis externos.  
Onde fazer: Supabase Auth/Storage, Cloudflare Turnstile e Vercel.  
Passo a passo:

1. Definir Site URL e callbacks de Production/Preview no Supabase Auth.
2. Autorizar o domínio final no Turnstile e confirmar a chave pública correta.
3. Ativar MFA nas contas administrativas.
4. Revisar buckets de banner, notícia, arena, camisa e avatar: MIME, tamanho,
   leitura, upload e exclusão por papel.
5. Testar cada policy no sandbox como usuário autorizado e não autorizado.

O que preciso ter: acesso aos três provedores e contas de teste por papel.  
Como saber que funcionou: redirects não escapam do domínio, CAPTCHA valida e uploads
indevidos recebem negação.  
Evidência que devo trazer para você: matriz de papel/operação/resultado e prints sem
tokens ou dados pessoais.

## Testes obrigatórios antes de abrir pagamentos

- [ ] Pix criado e aprovado; webhook confirma uma única inscrição/credencial.
- [ ] Cartão aprovado sem armazenar PAN/CVV.
- [ ] Cartão recusado com mensagem segura e sem ativar inscrição.
- [ ] Request duplicado retorna/reconcilia a mesma operação externa.
- [ ] Webhook duplicado é ignorado pelo ledger.
- [ ] Webhook confirmado depois de estorno é ignorado como fora de ordem.
- [ ] Timeout após aceite do provedor fica ambíguo e é conciliado sem nova cobrança.
- [ ] Reembolso aceito só libera inventário no estado correto.
- [ ] Chargeback reverte acesso/estado sem regressão posterior.
- [ ] Repasse Pix chega a `DONE` uma única vez.
- [ ] Repasse de cartão respeita liquidação.
- [ ] Falha de repasse fica pendente/conciliável e gera alerta.
- [ ] Ingresso de plateia com múltiplos tipos reserva e libera estoque corretamente.
- [ ] Fluxo completo de atleta: compra → QR → check-in único.
- [ ] Fluxo completo do organizador: publicar → inscrições → financeiro → reembolso.

Comandos locais mínimos:

```text
npm run audit:prod
npm run lint
npm run typecheck -- --incremental false
npm test
npm run build
npm run test:e2e
```

Os E2E mutantes só podem ser habilitados em sandbox descartável com
`E2E_ASAAS_MUTATION_TESTS=1` e `E2E_CARD_GUARD_MUTATION_TESTS=1`.

## Checklist de release

- [x] Escopo V1 congelado em Campeonatos; Arena beta; ferramentas pessoais fora.
- [x] Código, lint, tipos, testes, audit e build verdes no estado local candidato.
- [ ] Preview usa Supabase/Asaas sandbox e o mesmo commit que será promovido.
- [ ] Backup/PITR confirmado e restauração conhecida.
- [ ] Migrations e backfill validados com evidência.
- [ ] RLS/Auth/Storage testados por papel.
- [ ] Matriz financeira automatizada e sandbox aprovada.
- [ ] KYC/capacidades/webhook Asaas de produção confirmados.
- [ ] Conciliação financeira frequente e alertada.
- [ ] Termos, Privacidade, suporte e política de reembolso aprovados.
- [ ] Resend/DNS e entrega Gmail/Outlook aprovados.
- [ ] Health check e alertas monitorados.
- [ ] Smoke mobile/desktop do fluxo completo aprovado.
- [ ] Commit, deployment, horário, migrations e responsáveis registrados.
- [ ] Plano de rollback de aplicação e restore de banco disponível.
- [ ] Pagamentos reais continuam fechados até todos os P0 acima estarem concluídos.

## Últimas alterações feitas pela IA

- arquivo: `PENDENCIAS-V1.md`
  - problema: não existia uma fonte única para o fechamento da V1;
  - alteração: escopo congelado, backlog priorizado, procedimentos manuais, testes
    obrigatórios e checklist de release registrados;
  - motivo: separar trabalho local verificável de ações externas/irreversíveis;
  - teste executado: revisão estrutural do documento;
  - resultado: arquivo criado com exatamente três tarefas ativas ao final.

- arquivos: `lib/asaas-webhook-core.ts`, `lib/asaas-webhook-core.test.ts` e
  `app/api/webhooks/asaas/route.ts`
  - problema: a competência recorrente usava o mês de chegada do webhook;
  - alteração: competência e acesso passaram a depender de `payment.dueDate` válido;
  - motivo: impedir mensalidade no mês errado quando o webhook atrasar ou virar o mês;
  - teste executado: testes unitários de competência, schema e chargeback;
  - resultado: aprovado dentro da suíte de 490 testes.

- arquivos: `lib/release-flags.ts`, `.env.example` e rota/action de
  `app/arenas/[handle]/assinar/[planId]`
  - problema: a Arena beta permitia criar novas assinaturas pagas sem ciclo completo homologado;
  - alteração: cobrança recorrente fechada por padrão e liberada somente com
    `ARENA_RECURRING_PAYMENTS_ENABLED=1`; plano gratuito permanece disponível;
  - motivo: impedir risco recorrente da Arena de bloquear Campeonatos;
  - teste executado: teste contratual do guard, TypeScript, lint e build;
  - resultado: aprovado; rota mostra estado Beta indisponível e action falha fechada.

- arquivos: `components/painel/PainelLandingClient.tsx`,
  `components/home/PersonaSwitcher.tsx`, `components/home/DestaquesCarousel.tsx`,
  `app/arenas/page.tsx` e `SubscriptionPaymentUI.tsx`
  - problema: promessa de boleto, cancelamento inexistente, Arena tratada como pronta
    e conteúdo mobile apertado/cortado;
  - alteração: textos alinhados ao beta, promessas removidas e layout mobile ajustado;
  - motivo: comunicar o produto real sem redesign;
  - teste executado: teste contratual de copy, build e captura Chromium 390 × 844;
  - resultado: opções, título e status visíveis sem corte na inspeção local.

- arquivos: `lib/supabase/roles.ts`, `app/layout.tsx` e páginas comerciais de `app/admin/`
  - problema: Proxy aceitava `profiles.role`, mas páginas exigiam `ADMIN_EMAIL`;
  - alteração: `profiles.role` tornou-se a fonte única do admin comercial; módulos
    pessoais continuam restritos ao dono/CEO e são ocultos para admin delegado;
  - motivo: evitar autorização divergente entre navegação, Proxy, páginas e actions;
  - teste executado: teste contratual, TypeScript, E2E de acesso anônimo e build;
  - resultado: aprovado.

- arquivos: `lib/email/send.ts`, `lib/arena-notify.ts`, `lib/audit.ts`,
  `lib/rate-limit.ts`, `lib/rate-limit-core.ts`, action de lotes e checkout de atleta
  - problema: logs diretos podiam incluir destinatário, identificador ou erro bruto;
  - alteração: eventos passaram pela sanitização estruturada; chaves do rate limit
    passaram a persistir somente SHA-256 estável;
  - motivo: reduzir exposição de PII e manter alerta operacional útil;
  - teste executado: testes de logging/PII e digest do rate limit, lint e build;
  - resultado: aprovado.

- arquivos: `app/loading.tsx`, `app/error.tsx`, `app/global-error.tsx` e
  `app/not-found.tsx`
  - problema: não havia fallback global para carregamento, falha inesperada ou 404;
  - alteração: estados acessíveis com retry, orientação de pagamento e navegação segura;
  - motivo: evitar tela quebrada/silenciosa em fluxos críticos;
  - teste executado: TypeScript, lint e build Next.js 16.3.0;
  - resultado: aprovado; `/_not-found` consta no build.

- arquivos: `app/robots.ts`, `app/sitemap.ts`, `app/layout.tsx`, `proxy.ts`,
  `lib/seo-config.test.ts` e `e2e/security-and-access.spec.ts`
  - problema: robots/sitemap/OG/canonical/noindex estavam ausentes;
  - alteração: superfície pública indexável e áreas privadas marcadas `noindex, nofollow`;
  - motivo: indexar descoberta sem expor telas autenticadas;
  - teste executado: testes unitários, E2E dedicado e build;
  - resultado: aprovado; `/robots.txt` e `/sitemap.xml` foram gerados estaticamente.

- arquivo: `app/convite/[teamId]/AceitarConviteViaLink.tsx`
  - problema: navegação interna usava `window.location.href` e gerava aviso do Next;
  - alteração: passou a usar `router.replace`;
  - motivo: navegação compatível com o App Router;
  - teste executado: lint final;
  - resultado: aprovado sem erros ou avisos.

Validação final desta execução:

- `npm run audit:prod`: 0 vulnerabilidades;
- `npm run lint`: aprovado, 0 erros e 0 avisos;
- `npm run typecheck -- --incremental false`: aprovado;
- `npm test`: 490/490 aprovados, 0 ignorados;
- `npm run build`: aprovado, 56 páginas geradas, incluindo robots/sitemap/404;
- `PORT=3012 npm run test:e2e`: 5 aprovados e 9 ignorados por ausência deliberada
  de credenciais sandbox; nenhum cenário mutante foi executado;
- inspeção mobile local: Chromium 390 × 844 aprovado para seletor e destaque.

## Próximas 3 tarefas

1. Confirmar backup/PITR, aplicar as sete migrations na ordem e trazer as consultas
   de validação e o relatório do backfill.
2. Criar Preview totalmente descartável e executar a matriz financeira sandbox,
   incluindo a decisão/configuração da conciliação a cada 10 minutos.
3. Fornecer dados jurídicos e canal de suporte, concluir KYC/webhook Asaas e
   configurar domínio Resend com SPF, DKIM, DMARC, Gmail e Outlook.
