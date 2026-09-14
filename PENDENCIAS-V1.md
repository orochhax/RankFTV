# Pendências para V1 — RankFTV

Atualizado em 14/09/2026. Este arquivo contém **somente trabalho ainda
pendente**. As entregas concluídas, evidências de homologação e decisões
anteriores permanecem preservadas no histórico do Git, em
`AUDITORIA-PRODUCAO.md` e no `RUNBOOK-PRODUCAO.md`.

## Progresso da V1

`██████████████▊░░░░░` **74% concluído** — 103 dos 139 marcos P0 originais
foram concluídos; restam 36 marcos atômicos, agrupados abaixo em 33 entradas
acionáveis. O número usa a linha de base anterior à limpeza deste arquivo, para
que remover histórico concluído não faça o progresso parecer voltar a zero.

Ao concluir ou acrescentar um marco P0, atualizar a barra, os números e a data.
P1/P2 não alteram esse percentual.

## P0 — Obrigatório antes de abrir pagamentos reais

### Segurança, autenticação e dados

- [ ] Aplicar em produção, numa janela controlada e depois da homologação, o
  grant mínimo de `supabase/production-security-20-point-hardening.sql`.
  Repetir a auditoria `supabase/manual-tests/security-posture-check.sql` e o
  Security Advisor em modo somente leitura; registrar qualquer lista não vazia.
  O Sandbox já foi corrigido e revisado.
- [ ] Encerrar a validação conjunta, no navegador do Sandbox, de entradas
  válidas e inválidas para cadastro, login, recuperação, inscrição, compras e
  pagamentos. A implementação com Zod, reautorização e mensagens públicas já
  está no código; falta a evidência funcional completa depois do deploy.
- [ ] Confirmar a equivalência do schema de produção com o código e aplicar,
  com backup e janela sem checkout, somente migrations já homologadas. Seguir
  a ordem de `RUNBOOK-PRODUCAO.md` e registrar objetos aplicados.
- [ ] Configurar no ambiente `production` do GitHub Actions
  `FINANCIAL_RECONCILIATION_URL` e `CRON_SECRET`, após promover o workflow para
  a branch padrão. Confirmar a conciliação a cada dez minutos e manter o cron
  diário da Vercel como contingência.

### Checkout, pagamentos e credenciais

- [ ] Fechar a única corrida ainda não homologada da reserva: pagamento Pix e
  cartão exatamente no limite de expiração. Comprovar no Sandbox que o Asaas é
  consultado antes de liberar a vaga e que não há dupla cobrança, dupla vaga ou
  credencial duplicada. Recarregamento, duas abas, abandono, expiração e os
  pagamentos fora do limite já foram homologados.
- [ ] Completar o pós-pagamento da inscrição de atleta. Os estados reais
  “Aguardando pagamento”, “Pagamento em análise” e “Inscrição confirmada” já
  existem, mas o sucesso ainda precisa mostrar número do pedido, método,
  campeonato, categoria, participantes, e-mails de entrega, ação principal
  “Ver meus ingressos”, instruções de acesso e contato do organizador, sem
  competir com a credencial.
- [ ] Concluir a homologação de reembolso sem conta para Pix e cartão nos
  cenários ainda não cobertos: parcial, repetição, timeout, saldo insuficiente,
  cobrança inelegível e tentativa do parceiro. Pix e cartão integrais e o
  estado terminal `CANCELLED` já foram comprovados no Sandbox.
- [ ] Definir e ensaiar o procedimento do CEO para reembolso Pix não concluído:
  autenticar solicitante pelo link gerencial ou CPF + e-mail + OTP, abrir caso
  auditável e nunca pedir chave Pix, conta bancária ou cartão por e-mail ou
  WhatsApp.
- [ ] Confirmar com o adquirente/processador o escopo PCI/SAQ aplicável ao
  formulário atual de cartão ou migrar para checkout hospedado/tokenização
  direta antes de aceitar cartões reais.

### Operação de campeonatos

- [ ] Homologar manualmente o chaveamento corrigido no painel e na página
  pública, em desktop e mobile: sorteio, vencedores/perdedores, retorno da
  repescagem, semifinais, final, terceiro lugar, pódio e troca de quadra.
- [ ] Homologar na interface a correção e limpeza de placares quando partidas
  posteriores já estão preenchidas, incluindo confirmação de resultados e
  redistribuição de quadras. As regras de cascata já têm testes automatizados.
- [ ] Ativar e homologar em produção os avisos de alteração de data, horário ou
  local. Confirmar destinatários pagos/ativos, deduplicação de e-mail
  compartilhado, retentativas, auditoria e exclusão de pendentes, expirados e
  estornados. A fila e a homologação funcional no Sandbox já existem.
- [ ] Implementar e homologar notificações ao organizador para cada pagamento,
  cancelamento e estorno confirmados.
  - [ ] Persistir entrega em fila idempotente antes do envio, com retentativa
    para `429`/`5xx`, recuperação de worker interrompido e estado auditável.
  - [ ] Configurar e medir limites do Resend em produção, alertar fila
    acumulada/falha definitiva e manter contingência no painel.
  - [ ] Homologar no Sandbox pagamento, cancelamento, estorno, evento repetido,
    indisponibilidade temporária e pico, garantindo um aviso por evento.
- [ ] Verificar em produção o domínio/remetente transacional: SPF, DKIM, DMARC
  e entrega em Gmail e Outlook. O Resend e o webhook já foram homologados no
  Sandbox.

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
- [ ] Configurar `OBSERVABILITY_HTTP_ENDPOINT`, `OBSERVABILITY_HTTP_TOKEN` e
  `OPERATIONS_ALERT_WEBHOOK_URL` de produção com responsável e SLA.
- [ ] Cadastrar os quatro secrets do workflow de backup e comprovar a primeira
  execução agendada de backup lógico e de Storage fora da máquina do operador.
  O workflow, o snapshot inicial e a cópia externa já existem.

### Lançamento

- [ ] Promover de forma controlada o código homologado para produção, revisando
  diff, credenciais, URLs, redirects, webhooks e rollback. Não promover esta
  branch de homologação diretamente.
- [ ] Executar smoke final em produção: cadastro, login, recuperação, checkout,
  Pix, cartão, credenciais individuais, e-mail, QR, check-in, chaveamento,
  cancelamento, reembolso e financeiro.
- [ ] Executar teste de capacidade com k6 e dados falsos, somente depois dos
  fluxos críticos estáveis no Sandbox.
  - [ ] Cobrir navegação pública, login, painel, campeonatos, chaveamento,
    consultas de ingresso/QR e placares; mutações e pagamentos só no Sandbox.
  - [ ] Subir gradualmente 5, 10 e 25 usuários virtuais, aplicar pico controlado
    e sustentar ao menos 15 minutos; interromper se houver risco.
  - [ ] Medir RPS, erros, média e p95, banco, queries lentas, bloqueios,
    timeouts Vercel e falhas externas.
  - [ ] Aprovar inicialmente com menos de 1% de erros, p95 de API abaixo de
    1,5 s, páginas em 2–3 s e zero duplicação financeira ou operacional.
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

- [ ] Adicionar login/cadastro Google, com vínculo seguro de contas e coleta
  gradual de perfil.
- [ ] Remover `style-src 'unsafe-inline'` da CSP após migrar estilos dinâmicos.
- [ ] Ensaiar restauração completa de banco e Storage em ambiente descartável.
- [ ] Reduzir a dívida técnica do lint: repositories/services, imports entre
  camadas, complexidade, arquivos longos, non-null assertions e TypeScript
  estrito; encerrar apenas quando lint, typecheck, testes e build passarem.
- [ ] Revisar mensalmente métricas, falhas e suporte; priorizar melhorias reais
  e planejar Arena comercial, PWA, carteiras digitais e analytics avançado.
