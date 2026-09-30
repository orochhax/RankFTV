# Pendências para V1 — RankFTV

Atualizado em 30/09/2026. Este arquivo contém **somente trabalho ainda
pendente**. As entregas concluídas, evidências de homologação e decisões
anteriores permanecem preservadas no histórico do Git, em
`AUDITORIA-PRODUCAO.md` e no `RUNBOOK-PRODUCAO.md`.

## Progresso da V1

`██████████████████░░` **89% concluído** — 125 dos 140 marcos P0 originais
foram concluídos; restam 15 marcos atômicos, agrupados abaixo em 11 entradas
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
  vaga; o webhook Sandbox passou a observar `PAYMENT_PARTIALLY_REFUNDED`.
- [x] Definir e ensaiar o procedimento do CEO para reembolso Pix não concluído:
  autenticar solicitante pelo link gerencial ou CPF + e-mail + OTP, abrir caso
  auditável e nunca pedir chave Pix, conta bancária ou cartão por e-mail ou
  WhatsApp. Ensaio Sandbox concluído em 16/09/2026 para Rafael Teste Sandbox /
  Diego Teste Sandbox: caso criado, atribuído, registrado como aguardando prova
  e resolvido sem dados financeiros adicionais.
- [ ] Confirmar com o adquirente/processador o escopo PCI/SAQ aplicável ao
  formulário atual de cartão ou migrar para checkout hospedado/tokenização
  direta antes de aceitar cartões reais.

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
  - [x] Configurar alertas de fila acumulada/falha definitiva e manter
    contingência no painel. A migration foi aplicada em produção pela execução
    `36779269155`; a rota administrativa é exclusiva do CEO e os alertas usam
    Better Stack/Slack sem destinatário em texto puro.
  - [x] Homologar no Sandbox pagamento, cancelamento, estorno, evento repetido,
    indisponibilidade temporária e pico, garantindo um aviso por evento. O E2E
    descartável confirmou repetição, reembolso e evento fora de ordem; testes
    de contrato confirmaram backoff nas quatro primeiras falhas e supressão na
    quinta. A carga autenticada ficou dentro dos thresholds.
- [ ] Verificar em produção o domínio/remetente transacional: SPF, DKIM, DMARC
  e entrega em Gmail e Outlook. Em 29/09, DNS público confirmou SPF em
  `send.rankftv.com` e DMARC em monitoramento (`p=none`). Em 30/09,
  `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET` e o segredo dedicado de hash
  foram cadastrados na Vercel Production. Ainda faltam comprovar DKIM e entrega
  real em Gmail e Outlook; a chave disponível do Resend não autoriza consultar
  a API de domínios.

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
