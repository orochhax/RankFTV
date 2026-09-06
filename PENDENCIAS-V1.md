# Pendências para V1 — RankFTV

Atualizado em 06/09/2026. Este arquivo acompanha as pendências de lançamento
e as entregas recentes, distinguindo implementação de homologação e publicação.
Evidências complementares ficam em `AUDITORIA-PRODUCAO.md`, no histórico do Git
e nos deploys de homologação.

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

### Chaveamento — atualização de 06/09/2026

- [x] Implementar cadastro manual de duplas e sorteio aleatório pelo organizador.
- [x] Configurar o total de quadras e uma única quadra principal na página de
  chaveamento do painel, com distribuição automática e alteração manual da
  quadra de cada partida.
- [x] Exibir identificação da quadra, número do jogo, placar e destaque azul
  para a dupla vencedora; a página pública também mostra pontos por set.
- [x] Corrigir a repescagem conforme a referência enviada: duas duplas
  classificam pela chave superior e duas pela repescagem; as quatro disputam
  semifinais cruzadas na chave principal, seguidas de final única e disputa
  de terceiro lugar. Não há final externa nem final de reset nesse modelo.
- [x] Integrar o pódio ao resultado da final principal e da disputa de terceiro.
- [x] Separar as fases da repescagem em colunas no painel.
- [x] Refazer a demonstração da Copa Bahia, categoria Aprendiz, com 16 duplas e
  30 jogos: 14 de classificação superior, 12 de repescagem, duas semifinais,
  uma final e uma disputa de terceiro lugar.
- [x] Proteger a edição e a limpeza de placares: quando o vencedor de uma
  partida muda, os participantes, placares, pódio e ratings dependentes são
  invalidados em cascata antes da nova propagação.
- [x] Validar a coerência entre o placar geral e os pontos de cada set, tanto
  no formulário quanto no servidor, recusando sets empatados, incompletos ou
  com contagem de vencedores diferente do resultado informado.
- [x] Unificar a apresentação do painel e da página pública: ambos usam os
  mesmos cards, conectores, pontos por set, destaque do vencedor e organização
  da chave principal e repescagem; somente o painel adiciona a edição ao clique.
- [x] Corrigir a redistribuição automática para reservar a quadra principal às
  decisões da chave principal e tratar repescagem e terceiro lugar como jogos
  secundários; a escolha manual por partida continua disponível.
- [x] Refazer PNG e PDF a partir dos dados do chaveamento completo, incluindo
  repescagem, terceiro lugar, pódio, quadras e pontos por set, com vencedores
  em azul como no site. PDF vetorial, sem captura de tela, e PNG com dimensões
  ajustadas aos limites de imagem. Desenhos testados de 8 até 256 duplas;
  arquivos PNG e PDF de 16 e 256 duplas gerados para validação técnica.
- [x] Homologar automaticamente os cruzamentos da repescagem para 8, 16, 32,
  64, 128 e 256 duplas: origem de cada vaga, primeira derrota, eliminação na
  repescagem, retorno cruzado às semifinais, final, terceiro lugar, numeração
  e distribuição de quadras. Capacidades diferentes exibem imediatamente a
  mensagem com as seis quantidades aceitas.
- [x] Executar `npm run typecheck`, a suíte de 708 testes e o build de produção,
  todos aprovados na validação de 06/09/2026. Isso não substitui a homologação
  manual dos fluxos completos.
- [x] Executar auditoria de dependências sem vulnerabilidades conhecidas, lint
  sem erros e Playwright local com cinco cenários aprovados e nove cenários
  condicionais ignorados por falta de credenciais/dados E2E dedicados.

A demonstração que usava o banco de produção foi removida em 06/09/2026 após a
aprovação visual. Os links abaixo agora mostram a categoria preservada sem os
dados falsos. A publicação do código atualizado no domínio público ainda precisa
ser confirmada. O formato com repescagem aceita 8, 16, 32, 64, 128 ou 256
duplas; outras quantidades são recusadas com mensagem explícita. Detalhamento
funcional em `docs/design/LOGICA-CHAVEAMENTO-V1.md`.

Links locais para revisão:

- [Painel do organizador](http://localhost:3000/painel/campeonatos/61212887-0228-4fcb-9f45-016f0399b01e/chaveamento)
- [Página pública](http://localhost:3000/campeonatos/61212887-0228-4fcb-9f45-016f0399b01e/chaveamento)

## P0 — Obrigatório antes de abrir pagamentos reais

- [ ] Homologar manualmente o chaveamento corrigido no painel e na página
  pública, em desktop e mobile: sorteio, encaminhamento de vencedores e
  perdedores, retorno da repescagem às semifinais, final, terceiro lugar,
  pódio e troca manual de quadra.
- [ ] Validar correção e limpeza de placares com partidas posteriores já
  preenchidas, confirmação dos resultados e redistribuição de quadras no
  formato com repescagem. As regras de invalidação em cascata e redistribuição
  já têm testes automatizados; falta a homologação manual da interface.
- [x] Revisar os cruzamentos intermediários da repescagem contra a referência
  enviada e testar as quantidades de duplas suportadas, incluindo a mensagem
  apresentada para quantidades ainda não suportadas. A simulação integral de
  cada formato foi aprovada em 06/09/2026.
- [x] Homologar os downloads PNG/PDF pelos botões do painel no navegador,
  incluindo a repescagem. Conferência manual aprovada em 05/09/2026: o
  chaveamento completo foi exportado sem cards cortados e com o conteúdo e o
  visual esperados.
- [x] Remover os dados e resultados fictícios da Copa Bahia após a aprovação
  visual, preservando inscrições e participantes reais. Em 06/09/2026 foram
  removidos 15 ingressos fake, 15 participantes derivados, 30 eventos de
  credencial e 30 partidas; a dupla real, a categoria e o campeonato foram
  preservados. Um backup lógico verificável foi criado imediatamente antes.
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
- [ ] Ativar e homologar em produção o alerta automático quando data, horário
  ou local de um campeonato mudar. Cada atleta com ingresso pago e ativo deve
  receber mensagem destacada com valor anterior e novo; e-mail compartilhado
  não pode gerar duplicata idêntica. Excluir pedidos pendentes, expirados e
  estornados, com idempotência, retentativa e auditoria.
  - [x] Implementar fila sem e-mail em texto puro, deduplicação por aviso e
    destinatário, notificação interna, revalidação do ingresso pago no envio,
    idempotência no provedor, auditoria e até cinco tentativas. Migration e cron
    periódico estão prontos; falta aplicar e testar em Production.
- [ ] Verificar o domínio/remetente transacional de produção, incluindo SPF,
  DKIM e DMARC, e confirmar entrega em Gmail e Outlook. O webhook Resend e suas
  métricas já foram homologados no Sandbox, mas precisam de configuração e
  evidência separadas em Production.
- [x] Confirmar no Supabase Auth de produção os templates, Site URL, Redirect
  URLs, política de senha, CAPTCHA e MFA da conta CEO.
  - [x] Definir `https://www.rankftv.com` como Site URL e manter somente
    `https://www.rankftv.com/auth/callback` na lista de Redirect URLs.
  - [x] Revisar os templates de e-mail usados por cadastro e recuperação.
    - [x] Personalizar e salvar o template `Confirm signup`.
    - [x] Personalizar e salvar o template `Reset password`.
    - [x] Testar em produção a entrega e o destino do link de recuperação.
    - [x] Concluir a troca de senha e validar um novo login com a conta de teste.
    - [x] Testar em produção o cadastro, a confirmação do e-mail e o destino
      após a confirmação.
  - [x] Confirmar a política de senha de produção.
  - [x] Ativar e testar o CAPTCHA nos fluxos públicos de autenticação.
  - [x] Habilitar TOTP no projeto e cadastrar MFA principal e de contingência
    na conta CEO.
- [x] Configurar monitor externo e alertas para
  `https://www.rankftv.com/api/health`.
  - [x] Monitor externo no UptimeRobot a cada cinco minutos, exigindo
    `"status":"ok"`, com estado `Up` e notificação por e-mail testada.
- [x] Definir quem responde a operação financeira pendente, reembolso
  cancelado, webhook falho e repasse recusado, e por qual canal será alertado.
  - [x] Carlos Gregório Rocha Batista será o responsável inicial, com alerta
    temporário no e-mail pessoal cadastrado nos serviços e prazo máximo de 24
    horas; migrar para os canais oficiais depois de adquiri-los e testar a
    entrega. Procedimento detalhado na seção 5.1 de `RUNBOOK-PRODUCAO.md`.
- [ ] Configurar `OBSERVABILITY_HTTP_ENDPOINT`, `OBSERVABILITY_HTTP_TOKEN` e
  `OPERATIONS_ALERT_WEBHOOK_URL` de produção com responsável e SLA.
- [ ] Criar rotina periódica de backup lógico e de objetos do Storage, mantendo
  cópia fora da máquina do operador. O ensaio de restauração foi adiado para P2.
  - [x] Implementar workflow semanal e manual com `pg_dump` 17, exportação de
    todos os buckets, listagem `pg_restore`, checksums SHA-256 e artefato externo
    retido por 30 dias. Falta cadastrar os três secrets e comprovar a primeira
    execução agendada.
  - [x] Gerar snapshot lógico inicial de produção antes das migrations em
    `C:\Users\SnyX\Documents\RankFTV-Backups\production-20260904-213423-pre-migrations`,
    com `schema.sql`, `data.sql`, `database.dump`, checksums SHA-256 válidos e
    leitura do arquivo customizado confirmada pelo `pg_restore` (1.451 itens).
  - [x] Baixar os 30 objetos dos cinco buckets de produção para a subpasta
    `storage`, preservando os caminhos originais; validar os 23.669.825 bytes e
    todos os hashes SHA-256 contra `storage-manifest.json`.
  - [x] Guardar uma cópia do ZIP completo fora da máquina do operador,
    confirmado manualmente pelo responsável em 04/09/2026.
- [ ] Conferir buckets reais do Supabase: acesso, policies, limites de tamanho
  e tipos MIME permitidos.
  - [x] Remover o bucket legado e vazio `page-banners`, não utilizado pelo
    código atual.
  - [x] Confirmar limites e tipos MIME de `arenas`, `noticias`, `page-images`,
    `regulamentos` e `avatars`.
  - [x] Remover três policies legadas duplicadas de `avatars` e testar upload,
    leitura após recarregamento e substituição da imagem pela conta de teste.
  - [x] Auditar as expressões das 20 policies restantes e confirmar aderência
    às regras de proprietário, administrador e leitura pública do código.
  - [x] Tratar o bucket privado `support-attachments` junto à
    equivalência de migrations.
    - [x] Registrar na consulta anterior que `support_cases`,
      `support_case_attachments`, `priority`, `sla_due_at` e o bucket ainda não
      existiam ausentes em produção; a migration dependente não foi aplicada
      isoladamente naquele estado.
    - [x] Revalidar em 06/09/2026 que as três tabelas, as duas colunas e o
      bucket privado agora existem, com limite de 5 MB e MIME restrito a JPEG,
      PNG, WebP e PDF. O acesso aos objetos ocorre apenas pelo servidor; não há
      policy direta de `storage.objects` para `anon` ou `authenticated`.
- [ ] Confirmar a equivalência do schema de produção com o código e aplicar,
  com backup e janela sem checkout, somente as migrations homologadas que
  ainda estiverem ausentes. Seguir a ordem de `RUNBOOK-PRODUCAO.md`.
  - [x] Inventariar as tabelas e confirmar que os objetos principais das
    migrations 1 a 6 existem; os objetos esperados das migrations 7 a 13 estão
    ausentes. A função `purge_rankftv_operational_data`, da migration 14, já
    existe fora de ordem e não deve ser executada antes da correção controlada
    do schema.
  - [x] Atualizar o inventário após as intervenções recentes no banco. Em
    06/09/2026 foram confirmadas as tabelas e funções das migrations 7 a 13,
    suporte/anexos, colunas de quadras, participantes manuais e repescagem.
    Permanecem ausentes somente os três objetos da nova fila de avisos:
    `championship_notice_deliveries`, `championship_notices.dedupe_key` e
    `notifications.source_notice_id`.
- [ ] Configurar no ambiente `production` do GitHub Actions os secrets
  `FINANCIAL_RECONCILIATION_URL` e `CRON_SECRET`, após promover o workflow para
  a branch padrão. Validar a conciliação a cada dez minutos e manter o cron
  diário da Vercel como contingência.
- [x] Registrar o plano de rollback da aplicação. A seção 6 de
  `RUNBOOK-PRODUCAO.md` cobre pausa de checkouts/crons, reimplantação compatível,
  preservação de ledgers, correção para frente e conciliação com o processador.
  O ensaio de restore lógico permanece adiado para P2 por decisão do responsável.
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

- [ ] Executar ensaio de restauração em ambiente descartável, incluindo banco
  e Storage. Adiado para depois da V1 por decisão do responsável em 04/09/2026;
  o arquivo customizado foi validado pelo `pg_restore`, mas não houve
  restauração completa.

### Dívida técnica do ESLint — opção A adiada

Baseline medido em 03/09/2026 antes do burndown da opção B: 1.223 avisos em
359 arquivos. A opção B corrige agora somente mudanças mecânicas e de baixo
risco; os refactors arquiteturais abaixo não bloqueiam o lançamento e devem ser
executados gradualmente, sempre com lint, typecheck, testes e build.

Após a opção B, foram eliminados os 70 avisos mecânicos identificados (regex,
imports duplicados, remoção dinâmica tipada, saída operacional direta,
`finally` inseguro e export anônimo). O baseline restante é de 1.153 avisos em
352 arquivos, todos cobertos pelas tarefas abaixo.

- [ ] Criar uma camada de repositories/services e remover os 219 acessos
  diretos a dados identificados em 176 arquivos, começando pelos fluxos de
  autenticação, pagamentos, reembolsos e permissões.
- [ ] Corrigir os 89 imports entre camadas identificados em 83 arquivos sem
  transformar a exceção atual em relaxamento permanente da configuração.
- [ ] Reduzir as 314 ocorrências de complexidade em 199 arquivos, as 173
  funções com excesso de statements e os avisos relacionados a profundidade,
  callbacks e quantidade de parâmetros, preservando comportamento e contratos.
- [ ] Dividir gradualmente os 67 arquivos ainda acima de 350 linhas e as 99
  funções acima do orçamento, usando lotes pequenos e commits independentes.
- [ ] Substituir as 165 non-null assertions em 56 arquivos por validações ou
  estreitamento de tipos explícitos, priorizando primeiro código executado em
  produção e deixando fixtures/testes por último.
- [ ] Encerrar a dívida somente quando `npm run lint` chegar a zero avisos e
  `npm run typecheck`, `npm test` e `npm run build` passarem na mesma revisão.

- [ ] Revisar mensalmente métricas, falhas e chamados de suporte para ajustar
  SLA, textos, política operacional e alertas.
- [ ] Priorizar melhorias com dados reais e com a matriz de
  `PESQUISA-CONCORRENTES.md`: lista de espera, operação por quadra, placar ao
  vivo, comunicação de mudanças e relatórios para organizador/patrocinador.
- [ ] Planejar Arena comercial, aplicativo/PWA ampliado, carteiras digitais,
  analytics avançado e demais módulos fora do escopo da V1.
