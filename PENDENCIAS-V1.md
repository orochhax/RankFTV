# Pendências para V1 — RankFTV

Atualizado em 03/09/2026. Este arquivo mantém somente tarefas abertas. O que já
foi implementado ou homologado está registrado em `AUDITORIA-PRODUCAO.md`, no
histórico do Git e nos deploys de homologação.

## Estado atual da homologação

O checkout de atleta, as duas credenciais individuais, a opção de compartilhar
o e-mail da dupla, a recuperação por CPF + e-mail + OTP, a troca protegida de
titularidade, a correção assistida pelo CEO, a auditoria, o webhook de entrega
de e-mail e o bloqueio de exclusão de categoria com histórico foram testados no
Sandbox.

O reembolso ainda não está homologado de ponta a ponta. No teste de 03/09, a
solicitação integral de R$ 108,00 foi criada e passou pela autorização crítica,
mas o processador encerrou a tentativa como `CANCELLED`. O RankFTV agora trata
esse estado como falha terminal assistida: não repete a devolução, não cancela o
ingresso, não libera a vaga e mostra o caso no painel do CEO. Ainda falta obter
uma confirmação `DONE` em teste controlado e fechar o procedimento humano para
uma devolução não concluída.

## P0 — Obrigatório antes de abrir pagamentos reais

- [ ] Comprar e configurar um e-mail comercial no domínio do RankFTV para ser
  o canal oficial de suporte.
- [ ] Comprar um novo chip e configurar o WhatsApp oficial de suporte.
- [ ] Publicar nos Termos e na Privacidade a operação como pessoa física,
  identificando o responsável como `Carlos Gregório Rocha Batista`, sem CNPJ,
  após validar juridicamente quais dados pessoais precisam ficar públicos.
- [ ] Publicar nos canais oficiais o atendimento disponível 24 horas por dia,
  responsável e prazo de resposta de até 24 horas.
- [ ] Obter revisão jurídica da política de cancelamento/reembolso e do fluxo
  LGPD. A implementação considera cancelamento integral até sete dias da
  compra, parcial depois disso até 72 horas antes do evento e bloqueio após
  check-in ou início do campeonato; cancelamento do evento, alteração
  relevante, duplicidade e falha da plataforma continuam sujeitos a análise.
- [ ] Concluir a homologação de reembolso sem conta para Pix e cartão. O teste
  deve terminar com estado confirmado no processador, atualização automática
  no RankFTV, invalidação dos QRs e liberação de estoque exatamente uma vez.
  Cobrir reembolso integral, parcial, repetição, timeout, saldo insuficiente,
  cobrança inelegível, estado `CANCELLED` e tentativa do parceiro.
- [ ] Definir e ensaiar o procedimento do CEO para um reembolso Pix não
  concluído. Autenticar o solicitante pelo link gerencial ou recuperação com
  CPF + e-mail + OTP, abrir caso com motivo e auditoria e usar formulário
  seguro para qualquer dado adicional. Nunca pedir conta/chave Pix por e-mail
  ou WhatsApp nem fazer transferência automática. Para cartão, nunca pedir
  dados bancários.
- [ ] Confirmar com o adquirente/processador o escopo PCI/SAQ aplicável ao
  formulário atual de cartão ou migrar para checkout hospedado/tokenização
  direta antes de aceitar cartões reais.
- [ ] Verificar, implementar e testar o alerta automático quando data, horário
  ou local de um campeonato mudar. Cada atleta com ingresso pago e ativo deve
  receber mensagem destacada com valor anterior e novo; e-mail compartilhado
  não pode gerar duplicata idêntica. Excluir pedidos pendentes, expirados e
  estornados, com idempotência, retentativa e auditoria.
- [ ] Verificar o domínio/remetente transacional de produção, incluindo SPF,
  DKIM e DMARC, e confirmar entrega em Gmail e Outlook. O webhook Resend e suas
  métricas já foram homologados no Sandbox, mas precisam de configuração e
  evidência separadas em Production.
- [ ] Confirmar no Supabase Auth de produção os templates, Site URL, Redirect
  URLs, política de senha, CAPTCHA e MFA da conta CEO.
- [ ] Configurar monitor externo e alertas para
  `https://www.rankftv.com/api/health`.
- [ ] Definir quem responde a operação financeira pendente, reembolso
  cancelado, webhook falho e repasse recusado, e por qual canal será alertado.
- [ ] Configurar `OBSERVABILITY_HTTP_ENDPOINT`, `OBSERVABILITY_HTTP_TOKEN` e
  `OPERATIONS_ALERT_WEBHOOK_URL` de produção com responsável e SLA.
- [ ] Criar rotina periódica de backup lógico, guardar uma cópia fora da
  máquina do operador, incluir objetos do Storage e executar um ensaio de
  restauração.
- [ ] Conferir buckets reais do Supabase: acesso, policies, limites de tamanho
  e tipos MIME permitidos.
- [ ] Confirmar a equivalência do schema de produção com o código e aplicar,
  com backup e janela sem checkout, somente as migrations homologadas que
  ainda estiverem ausentes. Seguir a ordem de `RUNBOOK-PRODUCAO.md`.
- [ ] Configurar no ambiente `production` do GitHub Actions os secrets
  `FINANCIAL_RECONCILIATION_URL` e `CRON_SECRET`, após promover o workflow para
  a branch padrão. Validar a conciliação a cada dez minutos e manter o cron
  diário da Vercel como contingência.
- [ ] Registrar o plano de rollback da aplicação e ensaiar o restore lógico em
  um projeto Supabase controlado.
- [ ] Promover de forma controlada o código homologado para produção, revisando
  diff, credenciais, URLs, redirects, webhooks e plano de rollback. Não promover
  a branch de homologação diretamente sem essa conferência.
- [ ] Executar smoke final em produção: cadastro, login, recuperação, checkout,
  Pix, cartão, credenciais individuais, e-mail, QR, check-in, chaveamento,
  cancelamento, reembolso e financeiro.
- [ ] Definir a data de abertura dos pagamentos reais somente após concluir os
  demais itens P0.
- [ ] Registrar o release: commit, deployment, horário, migrations executadas,
  evidências e responsáveis.

## P1 — Necessário para estabilizar o lançamento

- [ ] Acompanhar diariamente, na primeira semana, conciliações, webhooks,
  pagamentos pendentes, e-mails, estornos, suporte e repasses.
- [ ] Validar uma operação real controlada de estorno e uma de repasse quando
  houver transações elegíveis, sem criar cobranças apenas para teste.
- [ ] Definir a contingência de check-in sem conexão e testá-la em dois
  aparelhos antes do primeiro evento com público.

## P2 — Depois do lançamento e com pessoas usando

- [ ] Revisar mensalmente métricas, falhas e chamados de suporte para ajustar
  SLA, textos, política operacional e alertas.
- [ ] Priorizar melhorias com dados reais e com a matriz de
  `PESQUISA-CONCORRENTES.md`: lista de espera, operação por quadra, placar ao
  vivo, comunicação de mudanças e relatórios para organizador/patrocinador.
- [ ] Planejar Arena comercial, aplicativo/PWA ampliado, carteiras digitais,
  analytics avançado e demais módulos fora do escopo da V1.
