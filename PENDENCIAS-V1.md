# Pendências para V1 — RankFTV

Atualizado em 30/09/2026. Este arquivo contém **somente trabalho ainda
pendente**. As entregas concluídas, evidências de homologação e decisões
anteriores permanecem preservadas no histórico do Git, em
`AUDITORIA-PRODUCAO.md` e no `RUNBOOK-PRODUCAO.md`.

## Progresso da V1

`████████████████▎░░░` **82% concluído** — 115 dos 140 marcos P0 originais
foram concluídos; restam 25 marcos atômicos, agrupados abaixo em 24 entradas
acionáveis. O número usa a linha de base anterior à limpeza deste arquivo, para
que remover histórico concluído não faça o progresso parecer voltar a zero.

Ao concluir ou acrescentar um marco P0, atualizar a barra, os números e a data.
P1/P2 não alteram esse percentual.

## P0 — Obrigatório antes de abrir pagamentos reais

### Segurança, autenticação e dados

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
- [ ] Encerrar a validação conjunta, no navegador do Sandbox, de entradas
  válidas e inválidas para login, inscrição, compras e pagamentos. O cadastro
  público foi homologado em 16/09: campos sem usuário ou e-mail bloquearam a
  criação, e a conta Sandbox de teste foi criada. A recuperação pública de
  ingresso foi homologada em 16/09: par inválido
  recebeu resposta neutra; CPF/e-mail válidos entregaram o código por e-mail,
  recuperaram somente a credencial correspondente e o código foi consumido em
  uso único. A implementação com Zod, reautorização e mensagens públicas já
  está no código; falta a evidência funcional completa dos demais fluxos.
- [x] Confirmar a equivalência do schema de produção com o código e aplicar,
  com backup e janela sem checkout, somente migrations já homologadas. Seguir
  a ordem de `RUNBOOK-PRODUCAO.md` e registrar objetos aplicados. Auditoria
  somente-leitura de 29/09 confirmou os objetos financeiros e de credenciais
  principais. Em 30/09, as 26 migrations do runbook foram reconciliadas em
  ordem, incluindo as filas `championship_notice_deliveries` e
  `organizer_financial_notification_deliveries`, funções de claim, hardening de
  perfil e RPCs transacionais de campeonato. O inventário final não encontrou
  tabela ou função ausente, conflito de categoria, backfill incompleto, operação
  financeira pendente ou destinatário em texto puro. Permanece para revisão
  operacional um webhook `PAYMENT_RECEIVED` de 20/08/2026 marcado como `failed`
  após oito tentativas; não foi feito replay sem evidência do provedor.
- [ ] Configurar no ambiente `Production` do GitHub Actions
  `FINANCIAL_RECONCILIATION_URL` e `CRON_SECRET`, após promover o workflow para
  a branch padrão. Em 29/09, a URL fixa foi cadastrada no environment
  `Production`; `CRON_SECRET` continua apenas no nível geral do repositório e
  precisa ser confirmado/movido sem revelar seu valor. O workflow está ativo e as
  dez execuções recentes terminaram com sucesso, porém os intervalos observados
  foram de horas, não dez minutos; corrigir o agendamento ou adotar um executor
  subdiário confiável, mantendo o cron diário da Vercel como contingência.
- [ ] Promover e comprovar os workers de avisos de campeonato e financeiros do
  organizador. Ambos possuem workflow periódico de 15 minutos nesta branch e
  cron diário de contingência na Vercel, mas só serão agendados pelo GitHub após
  entrarem na branch padrão e receberem `CRON_SECRET` no environment protegido.

### Checkout, pagamentos e credenciais

- [ ] Concluir a homologação de reembolso sem conta para Pix e cartão nos
  cenários ainda não cobertos: parcial no cartão, repetição, timeout, saldo
  insuficiente, cobrança inelegível e tentativa do parceiro. Pix e cartão
  integrais, Pix parcial de R$ 20,00 (ingresso Larissa/Mateus, em 16/09/2026)
  e o estado terminal `CANCELLED` já foram comprovados no Sandbox. O Pix
  parcial foi confirmado no Asaas e conciliado no RankFTV com liberação da
  vaga; o webhook Sandbox passou a observar `PAYMENT_PARTIALLY_REFUNDED`.
- [x] Definir e ensaiar o procedimento do CEO para reembolso Pix não concluído:
  autenticar solicitante pelo link gerencial ou CPF + e-mail + OTP, abrir caso
  auditável e nunca pedir chave Pix, conta bancária ou cartão por e-mail ou
  WhatsApp. Ensaio Sandbox concluído em 16/09/2026 para Rafael Teste Sandbox /
  Diego Teste Sandbox: caso criado, atribuído, registrado como aguardando prova
  e resolvido sem dados financeiros adicionais.
- [x] Migrar os pagamentos únicos por cartão para o checkout hospedado do
  Asaas antes de aceitar cartões reais: inscrições e ingressos, aluguel e
  diária não recebem PAN, validade ou CVV no RankFTV. A migration
  `hosted-arena-card-checkout.sql` foi aplicada em Produção em 30/09/2026.
- [x] Remover da V1 a captura de cartão e a criação de assinatura recorrente
  pela plataforma. A assinatura paga permanece bloqueada, e o comprador nunca
  informa PAN/CVV ao RankFTV. Manter `ARENA_RECURRING_PAYMENTS_ENABLED=0` até
  existir checkout recorrente hospedado homologado em uma entrega posterior.

### Operação de campeonatos

- [ ] Ativar e homologar em produção os avisos de alteração de data, horário ou
  local. Confirmar destinatários pagos/ativos, deduplicação de e-mail
  compartilhado, retentativas, auditoria e exclusão de pendentes, expirados e
  estornados. A fila e a homologação funcional no Sandbox já existem.
- [x] Implementar fila idempotente de notificações ao organizador para cada pagamento,
  estorno integral ou parcial confirmado; entrega imediata pelo webhook e
  recuperação diária por cron. Migration aplicada no Sandbox em 21/09/2026.
  A branch de homologação foi publicada e, em 29/09/2026, uma cobrança Pix de
  R$ 23,99 confirmou o ingresso e entregou ao organizador um e-mail com
  campeonato, categoria, forma de pagamento, valor e nomes da dupla.
  - [ ] Configurar e medir limites do Resend em produção, alertar fila
    acumulada/falha definitiva e manter contingência no painel.
  - [ ] Homologar no Sandbox pagamento, cancelamento, estorno, evento repetido,
    indisponibilidade temporária e pico, garantindo um aviso por evento.
- [ ] Verificar em produção o domínio/remetente transacional: SPF, DKIM, DMARC
  e entrega em Gmail e Outlook. Em 29/09, DNS público confirmou SPF em
  `send.rankftv.com`, DKIM e DMARC em monitoramento (`p=none`). Em 30/09, a
  Vercel Production confirmou a presença de `RESEND_FROM_EMAIL`,
  `RESEND_WEBHOOK_SECRET` e `EMAIL_EVENT_HASH_SECRET`; falta comprovar a
  entrega ponta a ponta no Gmail e Outlook e revisar a política DMARC.

### Operação, suporte e conformidade

- [ ] Comprar e configurar e-mail comercial no domínio RankFTV como canal
  oficial de suporte.
- [ ] Publicar nos Termos e na Privacidade a operação como pessoa física,
  identificando o responsável como Carlos Gregório Rocha Batista, após validação
  jurídica dos dados que precisam ser públicos.
- [ ] Publicar canal de suporte atendido, responsável, horário e prazo de
  resposta reais.
- [ ] Obter revisão jurídica da política de cancelamento/reembolso e do fluxo
  LGPD.
- [x] Configurar observabilidade e alertas operacionais em Production. Em
  30/09/2026, a Vercel confirmou `OBSERVABILITY_HTTP_ENDPOINT`,
  `OBSERVABILITY_HTTP_TOKEN` e `OPERATIONS_ALERT_WEBHOOK_URL`; o Better Stack
  recebeu logs e o Slack recebeu o alerta de teste. Responsável: Carlos
  Gregório Rocha Batista. SLA: crítico em até 15 minutos; alta prioridade em
  até 1 hora.
- [x] Cadastrar os quatro secrets do workflow de backup e comprovar a primeira
  execução de backup lógico e de Storage fora da máquina do operador. Em
  30/09/2026, a execução manual `36652847512` concluiu com sucesso usando o
  cliente PostgreSQL 17, validou banco e Storage, criptografou o pacote antes do
  upload e publicou um artefato privado de 25.015.975 bytes, retido até
  30/10/2026. O agendamento semanal permanece ativo na branch padrão.

### Lançamento

- [ ] Proteger a branch `master` e o environment `Production` de acordo com a
  política operacional escolhida. Em 29/09, ambos estavam sem regras de
  proteção; definir checks obrigatórios (`verify` e Vercel), impedir merge com
  checks falhando e decidir se haverá aprovação humana sem bloquear o único
  administrador do repositório.
- [ ] Promover de forma controlada o código homologado para produção, revisando
  diff, credenciais, URLs, redirects, webhooks e rollback. Não promover esta
  branch de homologação diretamente.
- [ ] Executar smoke final em produção: cadastro, login, recuperação, checkout,
  Pix, cartão, credenciais individuais, e-mail, QR, check-in, chaveamento,
  cancelamento, reembolso e financeiro.
- [ ] Executar teste de capacidade com k6 e dados falsos, somente depois dos
  fluxos críticos estáveis no Sandbox.
  - [x] Script somente-leitura e roteiro seguro preparados em
    `scripts/k6-sandbox-smoke.js` e `docs/TESTE-CAPACIDADE-SANDBOX.md`.
  - [ ] Cobrir navegação pública, login, painel, campeonatos, chaveamento,
    consultas de ingresso/QR e placares; mutações e pagamentos só no Sandbox.
  - [x] Subir gradualmente 5, 10 e 25 usuários virtuais, aplicar pico controlado
    e sustentar ao menos 15 minutos; concluído no Preview em 29/09/2026, com
    17 minutos totais e cinco minutos sustentados em 25 usuários.
  - [ ] Medir RPS, erros, média e p95, banco, queries lentas, bloqueios,
    timeouts Vercel e falhas externas. A camada HTTP já foi medida: 6,57 RPS,
    0% de erro, média de 356,36 ms e p95 de 463,65 ms em 6.715 requisições;
    falta correlacionar banco, Vercel e o outlier máximo de 26,74 s.
  - [ ] Aprovar inicialmente com menos de 1% de erros, p95 de API abaixo de
    1,5 s, páginas em 2–3 s e zero duplicação financeira ou operacional. Os
    critérios HTTP públicos passaram; autenticação, rotas operacionais e
    ausência de duplicação ainda precisam de evidência própria.
  - [ ] Corrigir gargalos e repetir; depois, fazer teste pequeno e supervisionado
    em produção sem pagamentos artificiais.
- [ ] Definir data de abertura de pagamentos reais somente depois dos demais P0.
- [ ] Registrar o release: commit, deployment, horário, migrations, evidências
  e responsáveis.

## P1 — Estabilização depois do lançamento

- [ ] Ativar e homologar proteção contra senhas vazadas do Supabase Auth.
- [ ] Comprar chip e configurar WhatsApp oficial; até lá, manter e-mail comercial
  e formulário como canais oficiais.
- [ ] Consolidar migrations e SQLs em baseline reproduzível; comprovar
  `supabase db reset` em ambiente descartável e dry-run antes de produção.
- [ ] Executar ensaio prolongado de capacidade com 50 e 100 usuários virtuais.
- [ ] Permitir baixar cada credencial individual em PDF com dados mínimos e QR
  validado pelo servidor.
- [ ] Acrescentar à confirmação compartilhamento apenas do link público do
  campeonato, nunca do pedido, QR ou token privado.
- [ ] Auditar `pg_trgm` e, se seguro, movê-la para `extensions` com buscas e
  índices revalidados.
- [ ] Homologar login, recuperação e os dois pollings no Sandbox depois do
  hardening de cookies/endpoints públicos já implementado.
- [ ] Validar conteúdo real de uploads no servidor, incluindo assinatura de
  imagem/PDF, confirmação pós-upload e avaliação de quarentena/antimalware.
- [ ] Revisar ações administrativas não financeiras que ainda possam devolver
  `error.message`, priorizando dados pessoais.
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
