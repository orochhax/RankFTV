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

- Estimativas históricas: 78% → 84%. O percentual não foi recalculado por não ter
  fórmula objetiva; a continuidade passa a usar as contagens verificáveis abaixo.
- P0: 5 de 10 itens principais concluídos; 5 manuais ainda abertos.
- Matriz financeira obrigatória: 5 de 16 cenários concluídos.
- Checklist de release: 4 de 17 itens principais concluídos.
- Última atualização: 28/08/2026
- Último commit de código analisado: `a079dd2` (28/08/2026)
- Estado Git-base conferido em 28/08/2026: `origin/master` permanece em `8fd7244`;
  o candidato de código `a079dd2` está documentado para publicação exclusiva em
  `sandbox-homologacao`, nunca diretamente em `master`.

Revisão de continuidade em 28/08/2026:

- O backup lógico manual foi criado e restaurado localmente com sucesso; os
  demais P0 manuais permanecem abertos.
- O candidato de homologação contém todas as correções da V1 até `a079dd2`.
  O último `/api/health` comprovado por evidência foi o release `f10dd67c6452`;
  portanto, o deployment do HEAD atual ainda precisa de novo health check antes
  de ser tratado como candidato aprovado.
- A branch local ainda se chama `master`, mas seu conteúdo corresponde à branch de
  homologação e está mais de 50 commits à frente de `origin/master`. Durante os testes,
  nunca executar `git push origin master`; publicar explicitamente somente com
  `git push origin HEAD:refs/heads/sandbox-homologacao` até a aprovação do release.
- O domínio canônico operacional adotado é `https://www.rankftv.com`. Falta confirmar
  que as variáveis Vercel e as contas/projetos de produção de Supabase Auth,
  Turnstile, Resend e webhook Asaas usam exatamente esse domínio. O Sandbox deve
  continuar limitado ao domínio, redirects e chaves de teste do Preview.
- A configuração atual em `vercel.json` executa a conciliação uma vez ao dia;
  para a meta de 10 minutos é obrigatório configurar um agendador externo
  autenticado ou mudar de plano/configuração antes de abrir pagamentos.

## Legenda

- [x] Resolvido e verificado
- [ ] Pendente
- [M] Manual — depende de mim/serviço externo
- [B] Bloqueado
- [?] Não verificado
- [P2] Pós-V1

## P0 — Bloqueia lançamento

- [x] Confirmar backup recuperável do Supabase de produção antes de executar SQL.
  No plano Free, foi gerado o arquivo atômico `production-consistent.backup` em
  19/08/2026 (1.515.665 bytes; SHA-256
  `612509F0BE5F13971901F5BB65BA2D04032B622B7A3B8D8DCFEF0A0DC7C5E081`).
  O restore local terminou sem erro, recuperou 93 tabelas públicas e confirmou
  `auth.audit_log_entries`. PITR continua indisponível no plano atual.
- [x] Confirmar e aplicar, em janela sem checkout, as sete migrations de produção
  listadas em **Aplicação controlada das migrations**. As três migrations-base
  foram confirmadas em 19/08/2026 por consulta somente leitura: 10/10 verificações
  de colunas, funções, constraints, tabela, RLS e policy retornaram `OK`. As sete
  migrations foram executadas na ordem em 19/08/2026 e todas retornaram
  `Success. No rows returned`. A validação pós-migration confirmou 15/15 objetos
  e 14/14 verificações de RLS/permissões com resultado `OK`.
- [x] Validar o backfill de `spectator_ticket_items_backfill_report`. Concluído em
  19/08/2026: não havia pedidos históricos de plateia; pedidos, itens, relatórios
  `complete`/`partial`/`unmigrated`, pedidos sem relatório e divergências de
  quantidade retornaram zero. Nenhuma decisão ou correção manual foi necessária.
- [M] (testa todo o financeiro sem mexer em dinheiro real) Homologar em ambiente descartável toda a matriz financeira de Campeonatos,
  sem apontar testes mutantes para produção. Em andamento em 20/08/2026: o Supabase
  `RankFTV Sandbox` recebeu somente o schema (92 tabelas públicas na verificação
  inicial e zero registros nas tabelas de domínio verificadas), e uma chave exclusiva do Asaas
  Sandbox foi criada. O Preview da branch `sandbox-homologacao`, agora no commit
  de código `a079dd2`, está isolado de produção. O último health check comprovado foi
  no release `f10dd67c6452`, com aplicação e banco `ok`; o HEAD atual ainda precisa
  ser revalidado. O acesso automatizado
  protegido foi validado com um novo bypass da Vercel; o segredo que apareceu em uma
  evidência foi revogado. O webhook Sandbox usa fila sequencial, token exclusivo e
  somente o endpoint do Preview; o endpoint de produção foi desativado nesse ambiente.
  Cadastro, login e ativação das contas de organizador e comprador/atleta foram
  validados. O campeonato descartável foi criado e publicado com chave Pix. A primeira
  compra de ingresso de atleta foi confirmada manualmente no Asaas Sandbox e o evento
  `PAYMENT_RECEIVED`, após alinhamento do `ASAAS_WEBHOOK_TOKEN` e remoção da penalização
  da fila, atualizou o ingresso para `pago`. A validação somente leitura confirmou uma
  única compra para o pagamento, uma única operação financeira, um único evento
  processado e uma credencial com código/QR. O cenário Pix completo está aprovado;
  no primeiro teste de cartão, o Asaas recusou a requisição porque o checkout não
  enviava o telefone do titular e o campo de número do endereço era ambíguo. O
  formulário foi corrigido no commit `9985fac` para pedir celular com DDD, identificar
  o número da casa, aceitar complemento, consultar rua/bairro/cidade/UF pelo CEP e
  enviar também o IP remoto exigido pelo provedor. O reteste aprovou o cartão, confirmou
  a inscrição e processou o webhook. A consulta de evidência retornou uma única operação
  financeira `confirmed`, uma tentativa aprovada, uma credencial, um evento processado
  e zero colunas destinadas a PAN/CVV. O cartão recusado também foi aprovado: permaneceu
  pendente, sem cobrança, credencial ou webhook, com operação `failed` e tentativa
  `declined`. O commit `08c97f3` passou a escolher a forma de pagamento antes de
  criar a cobrança, eliminando o conflito “já existe cobrança por outro meio” no
  mesmo pedido. Duplicidade forçada, ordenação, timeout, estorno, chargeback, repasses,
  plateia e check-in ainda precisam ser exercitados. A navegação de compras foi
  consolidada em `/minhas-compras`, com abas Atleta e Plateia.
  Após retomar o projeto pausado em 28/08/2026, uma nova consulta encontrou 93 tabelas
  públicas no Sandbox, igualando a contagem do restore. A divergência 92 × 93 ficou
  resolvida sem alteração manual de schema.
- [M] (confirma que a conta pode receber e movimentar dinheiro) Confirmar KYC e as capacidades de Pix, cartão, parcelamento, estorno e
  transferência na conta Asaas de produção.
- [M] (faz pagamentos incertos serem verificados rapidamente) Definir a cadência de conciliação financeira. O deploy atual agenda
  `/api/cron/financial-reconciliation` uma vez ao dia por limitação do plano
  Vercel usado; operações ambíguas não podem depender de uma espera de até 24 h.
- [M] (troca textos genéricos pelos dados reais da empresa) Fornecer e revisar os dados empresariais, canal oficial de suporte,
  política de cancelamento/reembolso e textos jurídicos antes da primeira cobrança.
- [M] (faz os e-mails chegarem como oficiais e confiáveis) Configurar e validar domínio/remetente transacional (SPF, DKIM e DMARC).
- [x] Corrigir no webhook a competência de mensalidade derivada do vencimento do
  pagamento, e não do horário em que o webhook chegou.
- [x] Limitar claramente a cobrança recorrente da Arena enquanto ela estiver beta.

## P1 — Necessário para lançamento

### Produto e conteúdo

- [x] Remover a promessa pública de boleto enquanto boleto não existir.
- [x] Identificar publicamente a Arena como beta e não prometer automação financeira
  ainda não homologada.
- [x] Escopo comercial congelado neste documento: V1 = Campeonatos.
- [x] (evita pedir um nível depois que a categoria já foi escolhida) Desativar na
  V1 a recomendação automática de categoria por questionário. O guard central
  ignora inclusive valores legados ativos no banco, campeonatos novos/editados
  salvam a opção como `false`, o controle foi retirado do organizador e o checkout
  não exige respostas. A validação de gênero continua no servidor.

### Banco e produção

- [x] Scripts incrementais críticos estão versionados em `supabase/` e possuem
  testes contratuais locais em `lib/production-migrations.test.ts`.
- [x] Ledger financeiro, outbox, ledger de webhook e guardas de cartão possuem RLS,
  revogação para `anon/authenticated` e acesso exclusivo por `service_role` nos SQLs.
- [?] (confere se o banco real está igual ao código) O repositório não usa uma tabela/histórico padrão de migrations do Supabase;
  a equivalência entre arquivos e produção deve ser comprovada pelas consultas do
  runbook, não presumida pelo Git.
- [?] (confere quem pode enviar e ver arquivos) Buckets, limites MIME/tamanho e policies reais do Storage precisam ser
  comparados no painel Supabase.
- [M] (evita perder banco e arquivos se algo der errado) Antes de abrir pagamentos, definir uma rotina de backups lógicos periódicos
  no plano Free, guardar ao menos uma cópia independente da máquina do operador e
  proteger separadamente os arquivos dos buckets. O dump do PostgreSQL contém os
  metadados do Storage, não o conteúdo dos objetos armazenados.

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
  chargeback, repasse e falha de repasse: suíte local completa com 607/607 testes
  aprovados em 28/08/2026 (inclui módulos fora do escopo da V1).
- [M] (testa pagamentos falsos do começo ao fim) Executar a homologação sandbox de Pix, cartão, duplicidade, timeout, estorno,
  chargeback e repasse com credenciais/dados descartáveis.
- [?] (confere avisos reais do simulador de pagamentos) Validar no Asaas sandbox o comportamento de eventos não exercitados por
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
- [x] Corrigir a dependência transitiva `nanoid` indicada pelo audit de
  19/08/2026: override atualizado de 3.3.17 para 3.3.18 no commit `696d81c`;
  `npm ci` e `npm run audit:prod` confirmaram zero vulnerabilidades.
- [?] (confere o que cada tipo de usuário pode acessar) Fazer revisão autenticada das RLS como atleta, organizador, staff, admin e
  usuário sem vínculo no sandbox.

### UX de lançamento

- [x] Corrigir o seletor de persona e o card de destaque para não cortar conteúdo
  em larguras pequenas; verificado visualmente em viewport Chromium 390 × 844.
- [x] Criar fallbacks globais de loading, erro e página não encontrada.
- [x] Concluir o pacote de seis melhorias encontrado na homologação dos ingressos:
  navegação principal preservada no checkout/detalhe/reembolso; timeline histórica
  com datas de solicitação, cancelamento e conclusão; confirmação positiva do pedido
  de reembolso sem redirecionamento automático; atualização automática do Pix pelo
  estado persistido; formulário preservado com CPF formatado/normalizado e erro
  localizado; e nome público seguro do atleta sem fallback para e-mail. Implementado
  no commit `a079dd2` e coberto por testes contratuais.
- [?] (testa a jornada completa em celular e computador) Validar cadastro, pagamento, credencial, check-in, chaveamento e financeiro
  em celular real e desktop no Preview aprovado.

### E-mail

- [x] Templates locais de convite, inscrição, pagamento e recuperação possuem
  testes de renderização.
- [x] Alertar operacionalmente falhas de envio sem registrar destinatário.
- [?] (confere os links dos e-mails de acesso e senha) Confirmar no Supabase Auth os templates e redirects de cadastro, confirmação
  e recuperação de senha do domínio final.
- [M] (faz o e-mail oficial chegar sem cair no spam) Publicar DNS e testar entrega conforme **Configuração do e-mail transacional**.

### Jurídico e suporte

- [ ] (coloca os dados reais da empresa nos textos) Remover placeholders jurídicos somente após receber dados verdadeiros; não
  inventar razão social, CNPJ, responsável ou e-mail.
- [M] (garante regras legais claras para todos) Revisar Termos, Privacidade, cancelamento/reembolso e fluxo LGPD com apoio
  jurídico/contábil.
- [M] (define quem ajuda o cliente e em quanto tempo) Definir canal de suporte e responsável/SLA para pagamento, ingresso, estorno,
  repasse, segurança e solicitações de titulares.

### Monitoramento

- [x] `/api/health` verifica aplicação e banco sem expor segredo.
- [x] Proxy cria `x-request-id`; eventos operacionais são JSON estruturado e passam
  por sanitização de PII/segredos.
- [x] Falhas graves de webhook, ledger e conciliação geram evento operacional e
  podem acionar `OPERATIONS_ALERT_WEBHOOK_URL`.
- [M] (avisa quando o site ou banco estiver com problema) Configurar alerta operacional e monitor externo para `/api/health`.
- [M] (define quem resolve falhas de pagamento) Definir quem responde a uma operação financeira pendente ou webhook falho.

### SEO

- [x] Criar `robots.txt` com bloqueio das áreas privadas.
- [x] Criar `sitemap.xml` somente com rotas públicas estáveis.
- [x] Configurar canonical e Open Graph global.
- [x] Definir `noindex` explícito por `X-Robots-Tag` nas áreas privadas.

## P2 — Pós-lançamento

- [P2] (planeja os produtos que ficam para depois) Produto comercial e roadmap do Life OS, Performance e Carteira em Rota.
- [P2] (melhora a aparência depois que o essencial estiver pronto) Redesign visual ou refatoração estética sem impacto operacional.
- [P2] (mede como as pessoas usam o produto) Analytics de produto avançado.
- [P2] (adiciona canais e recursos futuros) Aplicativo nativo, WhatsApp, IA comercial e expansão de ranking.
- [P2] (recomenda a categoria antes da escolha) Reconstruir o motor de categoria:
  coletar respostas dos dois atletas antes da seleção, calcular o nível da dupla e
  exigir faixa explícita para categorias personalizadas. Só então reativar o guard
  nos fluxos de visitante, autenticado e convite.
- [P2] (permite vender assinaturas da Arena no futuro) Plataforma de assinatura da própria Arena.
- [P2] (trata atrasos e cobranças recorrentes da Arena) Completar inadimplência e ciclo recorrente da Arena depois que houver decisão
  comercial, fiscal, de suporte e homologação específica.

## Arena Beta

- [x] Exibir “Beta” nos pontos públicos de entrada e remover afirmações de produto
  financeiro finalizado.
- [x] Desabilitar por padrão novas assinaturas recorrentes de alunos até existir
  habilitação explícita e homologação separada.
- [P2] (deixa o aluno cancelar sozinho sem perder o período pago) Implementar cancelamento self-service preservando `access_until`.
- [P2] (decide o que acontece quando a mensalidade atrasa) Tratar `PAYMENT_OVERDUE` e política de carência/inadimplência.
- [P2] (evita erros no ciclo das mensalidades) Revisar cancelamento, reativação, cobrança fora de ordem e emissão fiscal.
- [P2] (mantém a Arena beta sem bloquear a V1) A frequência dos crons de Arena não bloqueia Campeonatos se suas cobranças
  de risco permanecerem desabilitadas.

## Ações manuais minhas

### Backup e confirmação do backup

Status: [x] concluído em 19/08/2026 por backup lógico manual, pois o plano Free
não oferece backup/PITR pelo painel. O arquivo atômico foi restaurado em banco
Docker isolado; ownership e grants gerenciados pela plataforma foram omitidos
somente no teste local, porque dependem das roles internas de um projeto Supabase.

Motivo: migrations e backfills financeiros não devem ser executados sem caminho
de recuperação comprovado.  
Onde foi feito: dump remoto por `pg_dump` executado em container Docker e restore
em PostgreSQL Supabase isolado na máquina local. Não foi usado o painel de Backups.
Evidência registrada:

1. Arquivo:
   `C:\Users\carlo\Documents\RankFTV-backup-2026-08-19\production-consistent.backup`.
2. Formato: dump lógico atômico/custom criado em uma única execução de `pg_dump`.
3. Tamanho: 1.515.665 bytes; horário: 19/08/2026 15:13:36.
4. SHA-256:
   `612509F0BE5F13971901F5BB65BA2D04032B622B7A3B8D8DCFEF0A0DC7C5E081`.
5. Restore local: concluído sem erro com `pg_restore --no-owner --no-privileges`;
   recuperou 93 tabelas de `public` e confirmou `auth.audit_log_entries`.
6. Os dumps separados `roles.sql`, `schema.sql` e `data.sql` foram preservados
   como evidência auxiliar, mas o arquivo custom consistente é o backup principal.

Limites conhecidos:

- este backup representa somente o estado do banco no horário acima; não permite
  recuperar um segundo/minuto posterior como PITR;
- não existe restauração automática ou com um clique no plano atual;
- o teste local não recriou ownership/grants das roles internas da plataforma;
- o dump preserva metadados do Storage, mas não os arquivos dos buckets;
- a restauração em um projeto Supabase real ainda não foi ensaiada porque o plano
  atual já utiliza o limite de dois projetos;
- se houver gravações que precisem ser preservadas depois de 15:13:36, gerar novo
  dump atômico imediatamente antes das migrations. Não tratar o arquivo antigo
  como ponto atual de recuperação.

Como saber que esta etapa funcionou: o arquivo tem hash registrado e seu schema e
dados foram restaurados e consultados em banco isolado. Isso comprova recuperação
lógica, mas não equivale a PITR nem a restore de produção gerenciado pelo Supabase.

### Aplicação controlada das migrations

Motivo: o código novo depende de tabelas, RPCs e índices que não podem ser
inferidos como existentes só porque estão no Git.  
Onde fazer: SQL Editor do Supabase de produção, após backup, em janela sem checkout.  
Passo a passo:

1. [x] Confirmar primeiro as migrations-base `harden-ticket-inventory-security.sql`,
   `add-elite-fee-collection.sql` e `add-security-audit-log.sql` conforme o runbook.
   Concluído em 19/08/2026: as 10 verificações retornaram `OK`.
2. [x] Aplicar uma por vez, aguardando sucesso antes da próxima, nesta ordem:
   1. [x] `supabase/financial-operations.sql`
   2. [x] `supabase/payment-card-attempt-security.sql`
   3. [x] `supabase/production-spectator-ticket-items.sql`
   4. [x] `supabase/production-order-inventory-release.sql`
   5. [x] `supabase/asaas-webhook-idempotency.sql`
   6. [x] `supabase/production-query-indexes.sql`
   7. [x] `supabase/production-data-retention.sql`
   Concluído em 19/08/2026: todas retornaram `Success. No rows returned`.
3. [x] Executar as consultas de validação de `RUNBOOK-PRODUCAO.md`.
   Concluído em 19/08/2026: 15/15 tabelas e funções esperadas retornaram `OK`.
4. [x] Conferir que tabelas/RPCs existem e que grants de cliente não foram abertos.
   Concluído em 19/08/2026: 14/14 verificações confirmaram RLS nas tabelas,
   `anon=false`, `authenticated=false` e `service_role=true`.
5. [x] Conferir o relatório do backfill. Concluído em 19/08/2026: a base não tinha
   pedidos históricos de plateia; `partial`, `unmigrated`, pedidos sem relatório e
   divergências normalizadas retornaram zero. Nenhuma correção foi necessária.
6. [M] Tratar separadamente a migration adicionada depois desse lote,
   `supabase/production-participant-category-uniqueness.sql`:
   1. [x] Executar no Sandbox a auditoria somente leitura de participantes repetidos
      e ingressos ativos sem categoria. A primeira auditoria em 28/08/2026 encontrou
      93 tabelas públicas, zero ingressos ativos sem categoria e 3 chaves de
      identidade repetidas. Após as decisões e o estorno conciliado, uma auditoria
      resumida retornou zero/zero, mas a checagem de segurança da própria migration
      encontrou uma chave de identidade ainda repetida. Ela foi localizada pela
      auditoria integral e decidida antes da aplicação; a verificação final da
      migration não encontrou conflito.
    2. [x] Decidir individualmente qual pedido manter, cancelar ou estornar; não
       alterar diretamente uma compra paga sem reconciliar o Asaas. Em 28/08/2026,
       o cartão recusado `6538f1f8…` foi cancelado (`estornado`, sem cobrança Asaas
       e estoque liberado) e o Pix pendente `55f211f2…` teve a cobrança primeiro
       cancelada no Asaas Sandbox e depois foi encerrado no RankFTV (`estornado`,
       cobrança histórica preservada e estoque liberado). Mantém-se o cartão pago
       `2068be9c…`; o Pix pago `6859a023…`, que não tinha estorno viável no Asaas,
       foi encerrado como `expirado` no RankFTV e teve o estoque liberado. Não é
       candidato a repasse porque o cron só seleciona ingressos `pago`.
   3. [x] Aplicar e comprovar no Sandbox: a migration retornou `Success. No rows
      returned` em 28/08/2026. A validação posterior confirmou 7/7 objetos (três
      funções, dois triggers e dois índices). O teste descartável com `ROLLBACK`
      também passou: bloqueou comprador e parceiro repetidos na mesma categoria,
      bloqueou o cruzamento checkout/equipe, permitiu categoria diferente e liberou
      nova compra depois de `expirado`, sem chamar o Asaas nem manter dados de teste.
   4. [ ] Somente depois da homologação, gerar backup atual de produção e aplicar em
      janela sem checkout. O próprio SQL deve abortar se encontrar conflito legado.

O que preciso ter: backup confirmado, acesso ao SQL Editor e janela sem pagamentos.  
Como saber que funcionou: todos os scripts retornam sucesso e todas as consultas
de validação produzem os objetos/contagens esperados.  
Evidência que devo trazer para você: horário e resultado de cada script, saída das
consultas de objetos e relatório agregado/pendente do backfill.

### Rollback e restore de banco

Motivo: rollback de aplicação não desfaz schema nem ledger financeiro.  
Onde fazer: Vercel para rollback da aplicação. No plano Free, uma recuperação de
banco usa o dump lógico manual em ambiente isolado ou em um projeto Supabase de
destino compatível; não existe PITR/restauração pelo painel disponível.
Passo a passo:

1. Em falha de aplicação, interromper abertura de novos pagamentos e promover o
   último deployment aprovado na Vercel.
2. Não apagar migrations, operações financeiras ou eventos de webhook.
3. Diagnosticar se a falha é apenas de aplicação ou se houve corrupção de dados.
4. Para falha de schema/dados, abrir incidente, pausar checkouts e crons, registrar
   o horário de corte e preservar um dump do estado afetado para investigação.
5. Escolher um dump lógico anterior ao incidente e restaurá-lo primeiro em banco
   isolado. Se a recuperação exigir um projeto Supabase, obter capacidade para um
   projeto de destino compatível antes de alterar a produção.
6. Validar schema, dados, extensões, Auth, RLS, grants, funções, triggers e Storage;
   copiar/restaurar separadamente os objetos dos buckets quando necessário.
7. Só substituir ou reconstruir produção com aprovação explícita e plano para
   reconciliar no Asaas tudo o que ocorreu depois do horário do dump.

O que preciso ter: deployment anterior, dump lógico íntegro, destino de restore e
responsável pelo incidente. PITR só passa a fazer parte do plano se for contratado
e habilitado antes do incidente.
Como saber que funcionou: aplicação volta a responder e banco/Asaas são
reconciliados sem duplicar cobrança ou repasse.  
Evidência que devo trazer para você: timeline, deployment restaurado, hash/horário
do dump utilizado, validações pós-restore e relatório de conciliação.

### Homologação financeira em sandbox

Status: [M] em andamento, revisado em 28/08/2026. O Supabase descartável começou
com 92 tabelas públicas e zero registros nas tabelas de domínio verificadas. Após
retomar o projeto pausado, a nova consulta retornou 93 tabelas públicas, igual à
contagem do restore da produção; a divergência de schema ficou encerrada. A mesma
auditoria encontrou zero ingresso ativo sem categoria e 3 chaves de identidade
repetidas, que exigem decisão individual antes da migration. Conta e chave exclusivas
do Asaas Sandbox foram confirmadas, e nenhuma
credencial foi adicionada ao `.env.local` que aponta para produção.

O Preview isolado usa a branch `sandbox-homologacao`, cujo remoto está em `600b420`
(acompanhamento de estorno em tela ampla para desktop).
O último health check comprovado por evidência foi o release `f10dd67c6452`, com
aplicação e banco `ok`; falta repetir o health check no deployment do HEAD atual. O
bypass de proteção foi validado e o segredo exposto durante a homologação foi
revogado/substituído. O bypass vigente permanece restrito e deve ser removido ao
final. `Site URL`, redirects do Auth e chaves de teste do Turnstile foram limitados
ao Preview, sem reutilizar as credenciais CAPTCHA de produção.

O webhook exclusivo do Asaas Sandbox está com token independente, fila ativa e
envio sequencial, apontando somente para o Preview; o endpoint de produção foi
desativado no Sandbox. A entrega real foi comprovada por Pix e cartão aprovado:
ambos tiveram evento financeiro processado, atualizaram o domínio e criaram credencial.
O cartão recusado ficou corretamente sem provider ID, cobrança, webhook, credencial
  ou ativação. Portanto, a entrega básica do webhook está aprovada; duplicação,
  ordenação tardia, estorno e chargeback continuam pendentes. Em 28/08/2026, dois
  pedidos legados pendentes da massa de teste foram encerrados com validação de
  inventário: cartão recusado sem cobrança e Pix pendente após exclusão da cobrança
  no Asaas. O próximo cenário é o estorno controlado do Pix pago.

Em 28/08/2026, o estorno controlado do Pix pago `6859a023…` foi solicitado pelo
RankFTV. A operação financeira ficou em `provider_created`, enquanto o ingresso
permanece `pago`, com estoque e repasse ainda bloqueados. Esse é o estado seguro
enquanto o Asaas não confirmar o reembolso: não repetir a solicitação; conferir o
status do provedor e deixar webhook/conciliação concluir a transição para `estornado`.
O Preview também passou a tratar esse estado como “Estorno solicitado”, e não como
erro nem como ingresso confirmado: bloqueia um novo pedido de cancelamento pela
interface e mantém o acompanhamento na própria tela do ingresso. Em 28/08/2026,
a tela passou a mostrar uma linha do tempo com a data/hora real da solicitação e um
card de prazos: Pix depende da confirmação/provedor e cartão pode levar até 10 dias
úteis para constar na fatura. O bloqueio de check-in no servidor ainda deve ser
validado separadamente antes de ser dado como concluído.

Em 28/08/2026, esse acompanhamento foi ajustado para o desktop: ocupa a largura
disponível, deixa o andamento à esquerda e os prazos em um card vertical à direita;
no celular, os blocos continuam em uma coluna. A timeline usa uma coluna própria
para linha e marcadores, evitando bolinhas desalinhadas do texto.

Em 28/08/2026, a consulta do estorno do Pix `6859a023…` mostrou que a operação
interna estava em `provider_created`, porém a cobrança permanecia `RECEIVED` e sem
erro do provedor. Foi identificada uma lacuna no adaptador: o Asaas mantém a cobrança
Pix como recebida enquanto o estado do estorno fica em `refunds` (`PENDING`/`DONE`).
O código passou a acompanhar essa lista, manter a vaga bloqueada em `PENDING` e só
finalizar o domínio em `DONE`; a correção ainda precisa ser validada no Preview com
esse mesmo cenário, sem criar uma segunda solicitação.

Em 28/08/2026, a investigação no Asaas confirmou que esse Pix não serve para provar
o estorno ponta a ponta: a cobrança havia sido marcada como recebida pela ação manual
do Sandbox, sem uma liquidação Pix real. As tentativas de estorno chegaram a
`AWAITING_CRITICAL_ACTION_AUTHORIZATION`, e a devolução gerada apareceu no Asaas como
uma transferência Pix de R$ 108,00 com status `Falhou` e mensagem “Falha ao processar
a transferência”; depois disso, `refunds` voltou a `null`. O RankFTV manteve o
ingresso `pago`, sem liberar estoque ou repasse, que é o comportamento seguro. Não
repetir o estorno nessa cobrança. Para homologar o caso, criar uma nova cobrança Pix
descartável e pagá-la pelo QR Code a partir de uma segunda conta Asaas Sandbox com
saldo e chave Pix, antes de solicitar uma única devolução.

Após decisão explícita para limpeza apenas do Sandbox, o ingresso manual antigo
`6859a023…` foi encerrado como `expirado` pela RPC de liberação, que retornou `true`
e preencheu `inventory_released_at`. A cobrança histórica `pay_g178ostlktfqlltr`
permanece preservada e nenhum novo estorno foi solicitado. O campo
`repasse_status` permaneceu `pendente`, mas não há repasse executável: o cron de
repasse seleciona somente ingressos com `status_pagamento='pago'`; o registro
expirado fica fora dessa seleção.

Ainda em 28/08/2026, uma nova compra Pix real de R$ 23,99 foi paga pela segunda
conta Sandbox e o Asaas registrou `pay_r3j64v55ldo38nmt` como `RECEIVED`, vinculado
ao ingresso `ce094d96…`. A tela permaneceu pendente porque a fila do webhook estava
penalizada por sete reentregas de um evento antigo de cartão: ele apontava para uma
parcela que não correspondia mais ao `asaas_payment_id` guardado no ingresso e o
endpoint respondia `409`. O endpoint foi corrigido para auditar essa divergência,
preservar o bloqueio de confirmação do domínio e responder `200`/ignorado ao Asaas;
assim o evento antigo não bloqueia a fila e eventos válidos posteriores continuam
exigindo vínculo exato. Lint, TypeScript, 599 testes e build passaram localmente.
O deploy Preview foi concluído e a fila do webhook Preview foi reativada. Em
28/08/2026, o Asaas reenviou com HTTP `200` o evento `PAYMENT_RECEIVED` do pagamento
novo; a resposta do RankFTV foi `{"ok":true,"tipo":"atleta_ticket","status":"pago"}`.
Logo, a confirmação Pix real ponta a ponta está aprovada. Manter o webhook de
produção desativado no Asaas Sandbox: ele não deve receber eventos de teste. A
devolução única de R$ 23,99 foi então autorizada no evento crítico do Asaas e o painel
do provedor passou a mostrar “Cobrança estornada” para `pay_r3j64v55ldo38nmt`; a tela
do RankFTV também passou a mostrar o ingresso cancelado. A verificação final após a
reconciliação confirmou o domínio em `estornado`, `inventory_released_at` preenchido,
`repasse_status=estornado`, operação de refund `refunded/REFUNDED`, data de conclusão
e nenhum erro registrado. O cenário de estorno Pix real está concluído.

O restore não havia recriado o trigger sobre `auth.users`; ele foi reinstalado, o
perfil faltante recuperado e o procedimento ficou versionado em
`supabase/sandbox-restore-auth-profile-trigger.sql`. Cadastro, login, conta de
organizador, painel vazio, chave Pix única, publicação do campeonato e conta
compradora/atleta foram validados. A recomendação de categoria foi desativada na V1
no commit `7184956` e os checkouts posteriores confirmaram o fluxo sem questionário.

O commit `08c97f3` corrigiu a ordem do pagamento para escolher Pix/cartão antes de
criar uma cobrança. O commit `1d02bcf` preparou a regra única de participante por
campeonato + categoria. Depois da decisão individual sobre o conflito legado, a
migration foi aplicada no Sandbox; os objetos foram conferidos e o teste SQL
descartável aprovou comprador, parceiro, proteção entre os dois fluxos, categoria
diferente e liberação após estado terminal. A prova visual bloqueou a segunda compra
e a consulta confirmou somente um pedido e uma cobrança. Produção ainda exige backup
atual e janela sem checkout antes de receber essa migration posterior.

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

- [x] (testa um Pix completo e uma credencial para a cobrança) Pix criado e aprovado; webhook
  confirmou uma única compra/credencial em 20/08/2026. A consulta no Sandbox retornou
  `pago`, vínculo Asaas e credencial válidos, uma compra, uma operação financeira e um
  evento `PAYMENT_RECEIVED` processado.
- [x] (testa cartão aprovado sem guardar dados proibidos) Cartão aprovado em 20/08/2026:
  inscrição `pago`, cobrança `CREDIT_CARD` vinculada, credencial criada, uma operação
  `confirmed`, uma tentativa aprovada, um webhook processado e zero colunas destinadas
  a PAN/CVV no schema público do Sandbox.
- [x] (testa cartão recusado sem liberar a inscrição) Cartão recusado em 20/08/2026
  com mensagem segura: o pedido permaneceu `pendente`, sem inscrição, check-in,
  cobrança Asaas, provider ID, webhook ou credencial liberada. A única operação ficou
  `failed` e a única tentativa ficou `declined`.
- [ ] (garante que dois cliques não criem duas cobranças) Request duplicado retorna/reconcilia a mesma operação externa.
- [x] (impede a mesma pessoa de comprar duas vezes a mesma categoria) Antes do commit
  `1d02bcf`, o fluxo com conta bloqueava o campeonato inteiro e o checkout rápido
  permitia pedidos distintos com o mesmo CPF. O código agora permite categorias
  diferentes e reserva no máximo uma vaga por atleta/categoria, cobrindo comprador,
  parceiro, os dois fluxos e concorrência antes da chamada ao Asaas. Estorno/expiração
  libera nova inscrição preservando o histórico. Em 28/08/2026, os pedidos legados
  foram auditados e decididos, a migration foi aplicada no Sandbox e o teste SQL
  descartável confirmou comprador, parceiro, os dois fluxos, categoria diferente e
  liberação depois de estado terminal. A prova visual posterior, na categoria
  `Teste duplicidade`, bloqueou a segunda tentativa com a mensagem de inscrição
  ativa; a consulta retornou exatamente 1 pedido criado/ativo e 1 cobrança/ID Asaas.
  Nenhum pagamento nem dado de teste adicional foi criado.
- [ ] (não processa duas vezes o mesmo aviso de pagamento) Webhook duplicado é ignorado pelo ledger.
- [ ] (impede que um aviso atrasado desfaça um estorno) Webhook confirmado depois de estorno é ignorado como fora de ordem.
- [ ] (garante que uma demora não gere outra cobrança) Timeout após aceite do provedor fica ambíguo e é conciliado sem nova cobrança.
- [x] (devolve vaga e cupom somente após o reembolso) Estorno Pix real concluído em
  28/08/2026: a cobrança `pay_r3j64v55ldo38nmt` de R$ 23,99 foi paga por uma segunda
  conta Sandbox, confirmada por webhook e estornada após autorização crítica. O banco
  confirmou ingresso `estornado`, `inventory_released_at` preenchido,
  `repasse_status=estornado` e operação de refund `refunded/REFUNDED`, sem erro.
- [ ] (remove o acesso após uma contestação do pagamento) Chargeback reverte acesso/estado sem regressão posterior.
- [ ] (garante que o repasse Pix aconteça uma só vez) Repasse Pix chega a `DONE` uma única vez.
- [ ] (só repassa cartão depois de o dinheiro estar liberado) Repasse de cartão respeita liquidação.
- [ ] (guarda o repasse com erro para tentar novamente) Falha de repasse fica pendente/conciliável e gera alerta.
- [ ] (testa vários tipos de ingresso no mesmo pedido) Ingresso de plateia com múltiplos tipos reserva e libera estoque corretamente.
- [ ] (testa o atleta da compra até a entrada) Fluxo completo de atleta: compra → QR → check-in único.
- [ ] (testa o organizador da publicação ao reembolso) Fluxo completo do organizador: publicar → inscrições → financeiro → reembolso.

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
`E2E_ASAAS_MUTATION_TESTS=1` ou `E2E_CARD_GUARD_MUTATION_TESTS=1`. Além da flag
estrita, o executor exige `E2E_DISPOSABLE_SANDBOX=RANKFTV_DISPOSABLE_SANDBOX`,
uma `E2E_BASE_URL` da branch `sandbox-homologacao` na Vercel e
`E2E_SANDBOX_SUPABASE_PROJECT_REF` igual ao projeto presente em
`NEXT_PUBLIC_SUPABASE_URL`. Domínio ou referência conhecidos de produção bloqueiam
o teste antes de qualquer mutação. O bypass protegido da Vercel é enviado por header
quando `VERCEL_AUTOMATION_BYPASS_SECRET` está disponível, sem colocá-lo na URL.

## Checklist de release

- [x] Escopo V1 congelado em Campeonatos; Arena beta; ferramentas pessoais fora.
- [x] Código, lint, tipos, testes, audit e build verdes no estado local candidato.
- [ ] (publica uma cópia segura do site ligada somente a testes) A branch do Preview
  usa Supabase/Asaas Sandbox e o candidato de código está em `a079dd2`, mas o deployment desse HEAD ainda
  precisa responder ao health check antes de virar candidato aprovado.
- [x] Backup lógico manual confirmado e restauração local comprovada; PITR não
  está disponível no plano atual.
- [ ] (mantém banco e arquivos protegidos por cópias regulares) Rotina periódica, cópia independente e backup dos objetos do Storage definidos.
- [x] As sete migrations de 19/08/2026 e o backfill de plateia foram aplicados e
  validados em produção com evidência.
  - [x] A migration posterior de unicidade por participante/categoria foi auditada,
    aplicada e homologada no Sandbox; produção ainda exige backup atual e janela sem
    checkout.
- [ ] (confere que cada usuário vê somente o que deve) RLS/Auth/Storage testados por papel.
- [ ] (confirma todos os cenários de pagamento no simulador) Matriz financeira automatizada e sandbox aprovada.
- [ ] (confirma que a conta real pode cobrar, estornar e repassar) KYC/capacidades/webhook Asaas de produção confirmados.
- [ ] (verifica pagamentos pendentes rapidamente e avisa falhas) Conciliação financeira frequente e alertada.
- [ ] (deixa regras legais, reembolso e ajuda ao cliente prontos) Termos, Privacidade, suporte e política de reembolso aprovados.
- [ ] (garante que os e-mails oficiais não caiam no spam) Resend/DNS e entrega Gmail/Outlook aprovados.
- [ ] (acompanha se o site está funcionando e avisa problemas) Health check e alertas monitorados.
- [ ] (testa o fluxo principal em celular e computador) Smoke mobile/desktop do fluxo completo aprovado.
- [ ] (anota o que foi publicado, quando e por quem) Commit, deployment, horário, migrations e responsáveis registrados.
- [ ] (define como voltar o site e recuperar o banco após falha) Plano de rollback da aplicação e restore lógico em Supabase real disponível.
- [ ] (impede cobranças antes de resolver todos os bloqueios) Pagamentos reais continuam fechados até todos os P0 acima estarem concluídos.

## Últimas alterações feitas pela IA

- arquivos: shell, checkout de atleta, detalhes de atleta/plateia, cards de compras,
  modal e timeline de estorno, polling de pagamento e helpers/testes no commit
  `a079dd2`, em 28/08/2026
  - navegação: checkout, detalhes e reembolso mantêm sidebar no desktop e navegação
    móvel, inclusive o atalho de **Minhas compras**;
  - reembolso: solicitação aceita usa confirmação positiva e permanece no próprio
    ingresso; a timeline conserva solicitação, cancelamento/liberação e confirmação
    financeira com as datas disponíveis, além do prazo específico de Pix ou cartão;
  - Pix: atleta e plateia consultam somente o pedido protegido pelo token, refletem
    automaticamente o estado confirmado pelo banco e param em qualquer estado final;
  - formulário: todos os dados preenchidos ficam preservados após erro, CPF aceita
    máscara ou 11 dígitos, é normalizado no servidor e o primeiro campo inválido recebe
    mensagem local, destaque e foco;
  - identificação: novas entradas recusam e-mail como nome e registros históricos
    usam `Atleta não informado`, sem expor e-mail como identificação visual;
  - verificação: auditoria com zero vulnerabilidades, lint, TypeScript,
    `git diff --check`, 607/607 testes, build de produção e E2E seguro aprovados.

- arquivos: escolha de pagamento e criação de cobrança do ingresso de atleta no
  commit `08c97f3`, em 20/08/2026
  - problema: o pedido podia ganhar uma cobrança Pix antes de o usuário informar que
    pagaria por cartão, causando “já existe cobrança por outro meio”;
  - alteração: a forma é escolhida antes da criação; Pix cria cobrança imediatamente
    e cartão aguarda os dados completos do titular;
  - resultado: Pix e cartão foram aprovados separadamente no Asaas Sandbox.

- arquivos: guardas E2E e configuração Playwright no commit `5609652`, em 20/08/2026
  - problema: testes mutantes financeiros precisavam falhar fechados fora do ambiente
    descartável, inclusive diante de variável ou URL configurada incorretamente;
  - alteração: execução exige flags estritas, domínio da branch de homologação e
    project ref do Supabase Sandbox; produção conhecida é bloqueada antes da mutação;
  - resultado: proteção coberta pela suíte local; segredos continuam fora do Git.

- arquivos: telas de cancelamento e histórico em `Minhas compras`, commit `a1129bc`,
  em 28/08/2026
  - problema: ao cancelar um ingresso a tela permanecia no checkout, sem confirmação;
    o histórico ocultava o item e não distinguia cancelamento simples de estorno pago;
  - alteração: redireciona para `Minhas compras` com aviso de sucesso, abre o histórico
    automaticamente e mostra “Estorno solicitado” ou “Estorno confirmado” conforme a
    operação financeira registrada;
  - teste executado: TypeScript, lint e `git diff --check` aprovados; falta validar
    visualmente no Preview depois do deploy.
  - correção posterior local: um item já cancelado ainda renderizava os campos de
    cartão/Pix ao ser aberto. As telas de atleta e plateia agora bloqueiam qualquer
    novo pagamento e exibem somente o aviso de cancelamento e o link ao histórico.
    O modal também confirma visualmente o cancelamento antes do redirecionamento.
  - evolução posterior: o commit `a079dd2` removeu o redirecionamento automático e
    passou a manter o acompanhamento completo na própria tela do ingresso.

- arquivos: `supabase/production-participant-category-uniqueness.sql`, teste SQL
  descartável, actions dos dois fluxos de inscrição e helper de erro no commit
  `1d02bcf`, em 20/08/2026
  - problema: uma mesma pessoa podia gerar pedidos distintos na mesma categoria e o
    fluxo autenticado, ao mesmo tempo, bloqueava categorias diferentes;
  - alteração: regra única por campeonato + categoria, cobrindo comprador, parceiro,
    conta, checkout rápido e concorrência antes de qualquer chamada ao Asaas;
  - liberação: estorno/expiração preserva o histórico e devolve a possibilidade de
    inscrição naquela categoria;
  - teste executado: migration e cenários funcionais em restauração local descartável,
    596 testes, lint, TypeScript, build e `git diff --check`;
  - resultado: aprovado localmente; auditoria dos pedidos existentes e aplicação no
    Supabase Sandbox ainda pendentes.

- arquivos: `package.json` e `package-lock.json` em 19/08/2026
  - problema: a conferência da documentação revelou uma vulnerabilidade alta no
    `nanoid` 3.3.17, dependência transitiva do PostCSS;
  - alteração: override restrito para a correção compatível 3.3.18;
  - teste executado: `npm ci --ignore-scripts`, `npm ls nanoid`,
    `npm run audit:prod`, E2E seguro e build de produção;
  - resultado: zero vulnerabilidades, `nanoid@3.3.18`, 5 E2E aprovados, 9
    corretamente ignorados sem credenciais/flags mutantes e build aprovado no
    commit `696d81c`.

- arquivos: `lib/release-flags.ts`, formulários/actions de campeonato e inscrição,
  perfil, `DOCUMENTACAO.md`, `README.md` e `PENDENCIAS-V1.md` em 19/08/2026
  - problema: o produto chamava de recomendação um questionário respondido depois
    da escolha da categoria; categorias personalizadas usavam uma faixa aberta e
    não podiam receber uma sugestão confiável;
  - alteração: recurso fechado por guard central na V1, controle removido da criação
    e edição, questionário retirado do checkout, gravações novas forçadas para
    `false` e rota/action antiga protegidas; gênero permanece obrigatório;
  - decisão futura: coletar as respostas dos dois atletas antes da categoria e
    exigir uma faixa/equivalência de nível nas categorias personalizadas;
  - teste executado: 576 testes, teste contratual do guard, TypeScript, lint sem
    avisos, build de produção Next.js 16.3.0 e `git diff --check`;
  - resultado: aprovado no commit `7184956`; os checkouts de Pix e cartão posteriores
    confirmaram o fluxo do Preview sem o questionário.

- arquivo: `PENDENCIAS-V1.md` em 19/08/2026
  - problema: as instruções detalhadas e o checklist ainda pressupunham backup/PITR
    pelo painel, embora o plano Free tenha exigido um backup lógico local;
  - alteração: evidência do dump e restore registrada, limitações separadas e fluxo
    de recuperação adaptado para dump lógico, Storage e ausência de PITR;
  - teste executado: conferência das referências a backup/restore e `git diff --check`;
  - resultado: backup pré-migration concluído; rotina periódica e restore em um
    projeto Supabase real permanecem explicitamente pendentes.

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

Validação do candidato inicial (registro histórico; reexecutar antes do release):

- `npm run audit:prod`: 0 vulnerabilidades;
- `npm run lint`: aprovado, 0 erros e 0 avisos;
- `npm run typecheck -- --incremental false`: aprovado;
- `npm test`: 490/490 aprovados, 0 ignorados;
- `npm run build`: aprovado, 56 páginas geradas, incluindo robots/sitemap/404;
- `PORT=3012 npm run test:e2e`: 5 aprovados e 9 ignorados por ausência deliberada
  de credenciais sandbox; nenhum cenário mutante foi executado;
- inspeção mobile local: Chromium 390 × 844 aprovado para seletor e destaque.

Verificação posterior em 19/08/2026:

- `npm test`: 576/576 aprovados, 0 falhos, 0 ignorados;
- `npm run lint`, `npm run typecheck -- --incremental false` e `npm run build`:
  aprovados após a desativação do motor de categoria;
- `npm run audit:prod`: zero vulnerabilidades após atualizar o `nanoid` para
  3.3.18;
- `npm run test:e2e`: 5 aprovados e 9 ignorados por ausência deliberada de
  credenciais/flags mutantes; nenhum teste destrutivo foi executado.

Verificação do estado `1d02bcf` em 20/08/2026:

- `npm test`: 596/596 aprovados, 0 falhos, 0 ignorados;
- `npm run lint`: aprovado, 0 erros e 0 avisos;
- `npm run typecheck`: aprovado;
- `npm run build`: aprovado, incluindo as 56 páginas estáticas/dinâmicas esperadas;
- migration de unicidade e teste funcional aprovados em restauração local descartável,
  com rollback da massa de teste;
- `git diff --check`: aprovado antes do commit;
- `npm run audit:prod`: reconfirmado em 28/08/2026 com zero vulnerabilidades;
- o E2E completo do deployment `1d02bcf` ainda deve ser reexecutado depois de aplicar
  a migration no Sandbox; nenhum teste mutante foi apontado para produção.

Verificação do pacote de UX `a079dd2` em 28/08/2026:

- `npm run audit:prod`: zero vulnerabilidades;
- `npm run lint`: aprovado, 0 erros e 0 avisos;
- `npm run typecheck`: aprovado;
- `npm test`: 607/607 aprovados, 0 falhos e 0 ignorados;
- `npm run build`: aprovado no Next.js 16.3.0, com todas as rotas geradas;
- `npm run test:e2e`: 5 aprovados e 9 ignorados por ausência deliberada de
  credenciais/flags mutantes; nenhum teste financeiro destrutivo foi executado;
- `git diff --check`: aprovado.

## Próximas 3 tarefas

1. [x] No Sandbox, não repetir o estorno do Pix simulado `6859a023…`: o Pix real
   substituto (`pay_r3j64v55ldo38nmt`) foi pago, estornado e conciliado até
   `refunded/REFUNDED`, com estoque liberado e repasse estornado.
2. [x] No Sandbox, aplicar e homologar
   `supabase/production-participant-category-uniqueness.sql`: os objetos e os cinco
   comportamentos de proteção foram confirmados em teste descartável com `ROLLBACK`.
3. Continuar a matriz financeira pelo request duplicado: comprovar que dois envios
   equivalentes retornam/reconciliam a mesma operação e não criam segunda cobrança.
   Em seguida, testar webhook duplicado, evento fora de ordem, timeout, chargeback,
   repasses, plateia e check-in; em paralelo, fechar conciliação, KYC,
   jurídico/suporte e e-mail DNS.

Ponto exato de retomada: no Sandbox, exercitar o cenário financeiro de request
duplicado sem gerar uma segunda cobrança no Asaas.
