# Pendências para V1 — RankFTV

Atualizado em 14/09/2026. Este arquivo acompanha as pendências de lançamento
e as entregas recentes, distinguindo implementação de homologação e publicação.
Evidências complementares ficam em `AUDITORIA-PRODUCAO.md`, no histórico do Git
e nos deploys de homologação.

## Progresso da V1

`██████████████▋░░░░░` **73% concluído** — 102 de 139 itens P0 marcados como
feitos; faltam 37. A conta inclui todos os itens e subitens da seção P0
(obrigatórios antes de abrir pagamentos reais) e exclui P1/P2, classificados
neste arquivo como estabilização ou evolução depois do lançamento.

Atualizar esta barra e os números sempre que um item ou subitem P0 mudar de
estado ou uma nova pendência P0 for adicionada/removida. Recalcular como
itens P0 concluídos ÷ total de checkboxes P0, arredondado para baixo; atualizar
também a data no início do arquivo. Itens P1/P2 não alteram o percentual da V1.

## Estado atual da homologação

O checkout de atleta, as duas credenciais individuais, a opção de compartilhar
o e-mail da dupla, a recuperação por CPF + e-mail + OTP, a troca protegida de
titularidade, a correção assistida pelo CEO, a auditoria, o webhook de entrega
de e-mail e o bloqueio de exclusão de categoria com histórico foram testados no
Sandbox.

O reembolso Pix integral foi homologado de ponta a ponta em 08/09. Uma compra
real entre duas contas Sandbox foi paga, autorizada pelo webhook e estornada
integralmente: o Asaas confirmou `DONE`, devolveu R$ 23,99 à conta pagadora e a
conciliação marcou o ingresso como estornado, invalidou o uso dos QRs e liberou
a vaga uma única vez. O RankFTV também mantém o tratamento seguro do estado
`CANCELLED`: não repete a devolução, não cancela o ingresso e não libera a vaga.
Ainda falta fechar o procedimento humano para
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
- [x] Executar `npm run typecheck`, a suíte de 715 testes e o build de produção,
  todos aprovados na validação de 06/09/2026. Isso não substitui a homologação
  manual dos fluxos completos.
- [x] Executar auditoria de dependências sem vulnerabilidades conhecidas, lint
  sem erros e Playwright local com cinco cenários aprovados e nove cenários
  condicionais ignorados por falta de credenciais/dados E2E dedicados.
  Em 08/09/2026, com a aplicação local conectada ao Sandbox, a nova execução
  mult navegador aprovou 25 cenários públicos/de segurança; 45 cenários
  autenticados ou destrutivos foram ignorados por não haver contas E2E
  dedicadas nem autorização de mutações no arquivo local de segredos.

A demonstração que usava o banco de produção foi removida em 06/09/2026 após a
aprovação visual. Os links abaixo agora mostram a categoria preservada sem os
dados falsos. A publicação do código atualizado no domínio público ainda precisa
ser confirmada. O formato com repescagem aceita 8, 16, 32, 64, 128 ou 256
duplas; outras quantidades são recusadas com mensagem explícita. Detalhamento
funcional em `docs/design/LOGICA-CHAVEAMENTO-V1.md`.

Links locais para revisão:

- [Painel do organizador](http://localhost:3000/painel/campeonatos/61212887-0228-4fcb-9f45-016f0399b01e/chaveamento)
- [Página pública](http://localhost:3000/campeonatos/61212887-0228-4fcb-9f45-016f0399b01e/chaveamento)

### Auditoria técnica e gestão de credenciais — 06/09/2026

O projeto usa Node.js/TypeScript, Next.js/React, Supabase/PostgreSQL, Asaas,
Resend, OpenAI, Vercel e Playwright; não há aplicação Python neste repositório.
A revisão contra a documentação oficial confirmou 730 testes aprovados,
`typecheck` aprovado e zero vulnerabilidades conhecidas nas dependências de
produção. Os ajustes encontrados foram distribuídos abaixo entre P0, P1 e P2.
Em 08/09/2026, a auditoria complementar dos 20 controles de segurança foi
registrada em `docs/AUDITORIA-SEGURANCA-20-PONTOS.md`.

As credenciais locais seguem a matriz documentada em
`docs/SEGREDOS-E-AMBIENTES.md`: `.secrets.local` é um inventário local
confidencial em texto puro e não é
carregado pela aplicação; `.env.local` contém apenas o ambiente usado pelo app
local; `.env.sandbox.local` sobrescreve somente as credenciais do Sandbox pelo
script dedicado. Os três arquivos permanecem fora do Git. Credenciais recebidas
pelo responsável devem ser salvas sem repetir seus valores em logs, respostas,
commits ou evidências.

## Definição fechada do lançamento comercial da V1

O RankFTV só será considerado lançado quando estiver apto a receber campeonatos
e pagamentos reais, sem limitar a operação a uma vitrine, pré-cadastro ou apenas
Pix. No lançamento, o organizador deve conseguir criar, publicar e administrar
o campeonato, acompanhar inscrições e financeiro, operar chaveamento, placares
e check-in e tratar cancelamentos e reembolsos. O atleta deve conseguir se
inscrever como visitante ou autenticado, pagar por Pix ou cartão, receber sua
credencial individual e acessar o suporte.

Uma eventual página pública de divulgação ou cadastro antecipado antes disso é
pré-lançamento e não encerra a V1. Para abrir oficialmente, devem estar
homologados: checkout e reserva temporária; Pix e cartão; credenciais e e-mails;
QR e check-in; reembolso; painel do organizador; chaveamento; conciliação;
políticas e suporte; banco, backup, observabilidade, capacidade, deploy e smoke
de produção.

Depois do lançamento podem entrar conveniências e evolução do produto, como
login com Google, WhatsApp oficial, ingresso em PDF, compartilhamento social,
testes de estresse ampliados, check-in offline antes do primeiro evento que o
exija, refactors arquiteturais, pgTAP, tipagem estrita e os demais itens P1/P2
que não alterem a segurança ou a correção financeira do fluxo lançado.

## P0 — Obrigatório antes de abrir pagamentos reais

- [ ] Executar no Sandbox a auditoria somente de leitura dos controles de banco
  em `supabase/manual-tests/security-posture-check.sql`, revisar toda lista não
  vazia e o Security Advisor do Supabase. Aplicar primeiro no Sandbox o grant
  mínimo de `supabase/production-security-20-point-hardening.sql`; somente após
  homologação, repetir migration e verificação em produção.
  - [x] Executar a primeira auditoria no Sandbox. Em 08/09/2026, ela confirmou
    RLS nas tabelas expostas, mas encontrou `TRUNCATE`/`TRIGGER` concedidos a
    `anon`, acesso anônimo a `credentials`, uma função sem `search_path` fixo e
    funções `SECURITY DEFINER` herdando `EXECUTE` de `PUBLIC`.
  - [x] Aplicar no Sandbox a migration ampliada de hardening e repetir a
    auditoria corrigida. Em 08/09/2026, os seis controles retornaram `true` e as
    quatro listas de revisão retornaram vazias. A única função `SECURITY
    DEFINER` permitida para `anon` nesse check é a RPC pública e somente de
    leitura `list_public_arena_cards`.
  - [x] Corrigir o erro `security_definer_view` apontado pelo Security Advisor
    para `public.ranking_entries`. A view não é consultada pelo código atual,
    mas antes de ativar `security_invoker` é necessário auditar RLS, policies e
    grants das três tabelas de origem para não interromper um consumidor legado.
    - [x] Confirmar no Sandbox que `external_athletes`, `external_results` e
      `external_tournaments` existem, têm RLS ativo, policy pública de leitura e
      grants de `SELECT` para `anon` e `authenticated`.
    - [x] Aplicar a migration de `security_invoker`, repetir a auditoria SQL e
      executar novamente o Security Advisor. Em 08/09/2026, a view preservou
      acesso para `anon`/`authenticated`, a auditoria retornou sete verificações
      verdadeiras e cinco listas vazias, e o Advisor passou a exibir zero erros.
  - [ ] Concluir a revisão dos 33 warnings e 15 sugestões restantes do Security
    Advisor. A exportação dos 33 warnings foi classificada em 08/09/2026:
    - [x] Auditar as 26 advertências de RPCs `SECURITY DEFINER`: uma é a leitura
      pública limitada `list_public_arena_cards` e as outras 25 são RPCs
      autenticadas intencionais. Todas têm checagem interna de identidade,
      propriedade ou papel e grants compatíveis; não revogar em bloco.
    - [x] Aplicar no Sandbox
      `supabase/production-security-advisor-function-hardening.sql` e executar
      `supabase/manual-tests/security-advisor-function-hardening-check.sql`.
      Isso fixa o `search_path` das cinco funções apontadas, retira a função de
      cron da API de clientes e fecha os grants anônimos herdados das quatro
      RPCs de orçamento pessoal. Em 08/09/2026, as seis verificações retornaram
      `true` e `revisar_funcoes` retornou `[]`.
    - [x] Classificar o aviso da extensão `pg_trgm` como P1: não há exposição
      ativa comprovada e movê-la sem auditar dependências pode quebrar nomes
      não qualificados. A organização do schema não bloqueia o P0.
    - [x] Classificar as 15 sugestões restantes. Em 08/09/2026, a consulta
      direta pelo MCP confirmou que todas correspondem a tabelas internas com
      RLS ativo e nenhuma policy: `anon` e `authenticated` não possuem DML,
      enquanto `service_role` mantém o acesso necessário. Não criar policies
      de cliente apenas para eliminar sugestões informativas do Advisor.

- [x] Rotacionar a chave secreta elevada do projeto Sandbox que foi transmitida
  durante a configuração, atualizar `.secrets.local` e `.env.sandbox.local` e
  invalidar a chave anterior. Confirmar que nenhuma chave de produção foi
  reutilizada no Sandbox.
  - [x] Nova chave criada, salva localmente fora do Git e validada com um cliente
    Supabase executado no servidor em 07/09/2026. A chave antiga foi excluída no
    painel e a rotação foi confirmada pelo responsável.
- [x] Padronizar desenvolvimento, CI e backup em Node.js 24 LTS. O projeto
  declara Node 24 em `package.json` e `.nvmrc`; CI e backup usam a mesma versão.
  Em 07/09/2026, Node 24.19.0 aprovou lint sem erros, typecheck, 715 testes,
  build de produção e a matriz Playwright disponível.
- [x] Tornar atômicas as alterações compostas de campeonato antes do uso real.
  Edição de campeonato, categorias e aviso de mudança, além da exclusão com
  dependências, devem executar em transação/RPC e reverter integralmente quando
  qualquer etapa falhar. Cobrir sucesso e rollback com testes automatizados.
  - [x] Implementar a RPC transacional da edição, integrar a Server Action e
    adicionar verificações automatizadas e um teste manual que sempre termina
    em rollback.
  - [x] Homologar uma edição real pelo painel. Em 08/09/2026, a alteração foi
    salva pela RPC, persistiu após recarregar, gerou o aviso esperado aos
    atletas e a restauração do valor original também foi confirmada.
  - [x] Tornar também atômica a exclusão completa do campeonato e homologar seu
    rollback separadamente, sem usar campeonatos reais. Em 08/09/2026, a RPC, a
    integração da Server Action e o bloqueio de campeonatos com histórico de
    compra foram validados no Sandbox, incluindo o rollback integral.
    - [x] Confirmar no Sandbox a existência da função, bloqueio de `anon`, acesso
      de `authenticated`/`service_role` e os três guards da transação.
    - [x] Reaplicar a versão corrigida da RPC e repetir o rollback. Em 08/09/2026,
      os três SQLs retornaram sucesso: função existente, permissões corretas,
      transação protegida e `rollback_integral_confirmado = true`. A ausência de
      `championship_category_waitlist` continua coberta pela tarefa de
      equivalência de schema antes do lançamento.
- [ ] Concluir, em revisão conjunta, a validação em runtime dos argumentos não
  confiáveis das Server Actions e Route Handlers críticos com schemas Zod,
  reautorizar o usuário junto ao recurso e não devolver mensagens internas do
  banco ou do provedor ao navegador.
  - [x] Endurecer no código autenticação, papéis, edição de campeonato,
    check-in, reembolso, inscrição autenticada, compras de atleta e plateia,
    pagamentos por cartão, assinatura, aluguel, diária, cartão salvo, troca e
    cancelamento de ingresso, recuperação de credencial e lista de espera.
    Os schemas recusam campos extras e formatos inválidos; ratings e flags de
    elegibilidade não são mais aceitos do cliente, os planos da Arena são
    vinculados ao `handle` persistido e falhas do provedor recebem mensagem
    pública neutra. O trigger de criação de perfil também valida os metadados
    no PostgreSQL e foi aplicado e verificado no Sandbox em 08/09/2026.
  - [x] Executar testes automatizados, TypeScript, lint e build após o
    endurecimento: 742 testes aprovados, `typecheck` e build de produção
    aprovados e lint sem erros em 08/09/2026.
  - [ ] Homologar no navegador, após deploy no Sandbox, cadastro, login,
    redefinição, inscrição, compras e pagamentos com entradas válidas e
    inválidas. Esta etapa conjunta fecha o item sem usar cobranças reais.
    - [x] Corrigir no Sandbox o retorno da recuperação iniciada no ambiente
      local. Em 08/09/2026, os logs mostraram que o código enviou
      `http://localhost:3000/auth/callback?next=/recuperar-senha/atualizar`, mas
      o Auth substituiu o destino pela Site URL porque o localhost não estava
      na allowlist. `http://localhost:3000/**` foi adicionado e confirmado pela
      Management API, preservando a URL publicada do Sandbox.
    - [x] Solicitar um novo link e concluir a troca usando uma senha diferente
      da atual. Em 08/09/2026, o primeiro link abriu corretamente a tela local
      e criou uma sessão válida, mas o Supabase recusou a alteração com
      `same_password`; a interface foi corrigida para explicar esse caso em vez
      de informar incorretamente que o link expirou. Um novo link permitiu a
      troca, e o login posterior na conta de atleta foi aprovado. Em 09/09/2026,
      após alinhar a chave secreta do Turnstile do Sandbox, a recuperação foi
      repetida com CAPTCHA, a senha do organizador foi alterada e o novo login
      foi concluído.
    - [x] Oferecer somente à conta autenticada a opção de preencher o atleta 1
      com nome, e-mail, CPF, WhatsApp, gênero e camisa disponíveis no próprio
      perfil, mantendo os campos editáveis e o fluxo de visitante inalterado.
    - [x] Homologar no navegador a proteção contra inscrição duplicada por
      categoria. Em 08/09/2026, a tentativa pela mesma conta em uma categoria
      com compra paga ativa foi recusada antes de criar uma nova cobrança.
    - [x] Homologar no Sandbox o checkout Pix de uma dupla pela conta de atleta:
      preenchimento do próprio perfil, segundo atleta, revisão mobile, reserva
      da vaga e cobrança única de R$ 324 para valor-base de R$ 300. A confirmação
      simulada foi processada pelo webhook, resultando em um pagamento
      confirmado, duas credenciais individuais e dois envios de credencial.
    - [x] Confirmar que cada link recebido abre somente a credencial individual
      correspondente. Em 08/09/2026, já foram aprovadas no navegador a mudança
      da tela de pendente para paga e a chegada de dois e-mails separados, um
      para cada atleta. A chave antiga do Supabase ainda presente no Preview
      causou HTTP 401 nas primeiras entregas do webhook; ela foi substituída e
      o Preview do Sandbox foi republicado. Os dois links foram abertos e cada
      um mostrou exclusivamente a credencial do atleta correspondente.
    - [x] Homologar no celular o check-in individual das duas credenciais e o
      bloqueio de reutilização. Em 08/09/2026, o organizador confirmou os dois
      atletas separadamente; a segunda leitura do primeiro QR foi recusada como
      check-in já realizado. A conferência direta no Sandbox confirmou os dois
      registros `checked_in`, atribuídos ao Organizador Sandbox, e exatamente um
      evento de check-in persistido para cada credencial. A mesma sequência foi
      repetida em 09/09/2026 após a entrega real das credenciais por Gmail e
      iCloud: ambos os slots ficaram presentes e a leitura repetida continuou
      idempotente, sem duplicar check-in.
    - [x] Exigir aceite explícito dos Termos de Uso e da Política de
      Privacidade nos três checkouts de campeonato: atleta visitante, atleta
      autenticado e plateia. A validação também ocorre no servidor, e cada
      pedido novo registra data e versões aceitas. Estrutura aplicada no
      Sandbox e cobertura automatizada adicionada em 08/09/2026.
    - [x] Homologar no navegador que os três checkouts não avançam sem o aceite
      e que os links abrem separadamente os Termos e a Privacidade.
      - [x] Atleta visitante: em 09/09/2026, o navegador bloqueou o botão sem
        criar cobrança e exibiu a validação para marcar o aceite. Após o aceite,
        foi criada uma única cobrança Pix pendente de R$ 108 no Sandbox; ela não
        será paga e expirará normalmente, liberando a reserva.
      - [x] Atleta autenticado: em 14/09/2026, a tentativa sem aceite ficou na
        revisão, focou o checkbox obrigatório e não criou cobrança. Termos e
        Privacidade abriram em diálogos separados; a reserva fictícia foi
        liberada ao final. Fluxo aprovado em Chromium, Firefox, WebKit e nos
        perfis móveis de Chromium e WebKit.
      - [x] Plateia: em 14/09/2026, a tentativa sem aceite ficou no formulário
        e focou o checkbox obrigatório, sem criar pedido ou cobrança. Termos e
        Privacidade abriram em páginas separadas nos mesmos cinco perfis E2E.

- [ ] Implementar e homologar uma validade curta para a reserva de vagas no
  checkout, calculada e persistida pelo servidor. A reserva deve ser criada
  atomicamente assim que o usuário escolher a categoria e clicar em “Continuar
  com esta categoria”; somente depois do sucesso a etapa de participantes será
  aberta e o cronômetro começará. Vincular a reserva a um identificador seguro
  do checkout, inclusive para visitante sem conta, impedindo que atualizar a
  página, voltar uma etapa ou abrir outra aba crie reservas duplicadas. Reservar
  inicialmente por 15 minutos; ao escolher Pix, alinhar a expiração da cobrança
  e do QR ao tempo restante da mesma reserva, sem iniciar uma nova contagem.
  Exibir cronômetro sincronizado com o horário do servidor, avisar quando
  faltarem 5 minutos e 1 minuto e, ao expirar, liberar lote, cupom e vaga
  exatamente uma vez, oferecendo “Tentar reservar novamente”. Antes de liberar
  uma tentativa que possa ter sido paga no último instante, consultar e
  reconciliar o estado da cobrança no Asaas. Atualizar a tela em outras
  abas/dispositivos sem reiniciar a contagem e cobrir concorrência,
  recarregamento, abandono, pagamento no limite e execução repetida do job.
  - [x] Implementar a reserva atômica de 15 minutos no servidor ao clicar em
    “Continuar com esta categoria”, vinculada a cookie seguro com apenas o hash
    persistido. A mesma reserva é reutilizada sem reiniciar o prazo, ocupa o
    lote e a capacidade da categoria e é consumida ao criar o ingresso.
  - [x] Aplicar a estrutura no Sandbox e comprovar em transação com rollback a
    criação, a idempotência, a contagem única do lote e a devolução exata do
    estoque. Concluído em 09/09/2026.
  - [x] Exibir o cronômetro sincronizado com o servidor no cadastro e na tela de
    pagamento, com avisos de 5 e 1 minuto, além de integrar a limpeza ao job de
    conciliação executado a cada dez minutos.
  - [x] Antes de liberar um ingresso pendente expirado, reconciliar a cobrança
    no Asaas; confirmar o ingresso se o pagamento já caiu ou cancelar a
    cobrança pendente antes de devolver a vaga. Em caso de incerteza, manter o
    estoque reservado e gerar alerta operacional.
  - [ ] Homologar no navegador do Sandbox os cenários completos de Pix e cartão,
    incluindo recarregamento, duas abas, abandono, expiração e pagamento no
    último instante. A automação do navegador já está conectada; falta isolar e
    concluir somente a corrida de pagamento exatamente no limite do prazo.
    - [x] Automação repetível em 14/09/2026: Chromium, Firefox, WebKit e seus
      perfis móveis preservaram o mesmo ID e o mesmo vencimento ao recarregar,
      abrir uma segunda aba e retornar à categoria. O banco confirmou uma única
      reserva ativa e a liberação repetida manteve o mesmo estado e horário.
    - [x] Reserva criada ao avançar da categoria e preservada após recarregar a
      página, sem reiniciar os 15 minutos. Validado manualmente em mobile em
      09/09/2026; a conferência direta no banco confirmou exatamente uma
      reserva ativa e uma vaga ocupada.
    - [x] Sincronização do cronômetro entre duas abas. A segunda aba inicialmente
      reutilizava o horário antigo armazenado pelo navegador; o contador passou
      a consultar a hora atual do servidor sem cache ao abrir e foi aprovado
      manualmente em 09/09/2026.
    - [x] Troca de categoria sem duplicar a reserva. O banco confirmou somente
      uma reserva ativa, agora vinculada à nova categoria, e o contador foi
      corrigido para usar o mesmo relógio do banco sem ultrapassar 15:00.
    - [x] Expiração antes da criação da cobrança: alerta crítico abaixo de um
      minuto, modal central de prazo encerrado com confirmação por botão e
      retorno à escolha da categoria. A limpeza idempotente marcou a reserva
      como `expired` e confirmou zero reservas ativas na categoria em
      09/09/2026.
    - [x] Criação de cobrança Pix após a revisão: o ingresso pendente preservou
      o prazo original, a reserva foi convertida exatamente uma vez e o banco
      confirmou cobrança, QR, copia e cola e operação financeira `PENDING` com
      referência idempotente. Validado no Sandbox em 09/09/2026.
    - [x] Expiração depois da criação do Pix: ao zerar, a tela aguardou a
      conferência no provedor, removeu o QR Code e apresentou o histórico como
      ingresso cancelado sem cobrança. O banco confirmou o ingresso como
      `expirado`, liberação idempotente do estoque, nenhuma reserva ativa e a
      operação financeira `cancelled` com estado `DELETED` no Asaas. Validado
      manualmente no Sandbox em 09/09/2026. Duas consultas adicionais ao status
      mantiveram o mesmo horário de liberação e uma única operação financeira,
      confirmando que recarregar a página não devolve o estoque novamente.
    - [x] Confirmação de pagamento Pix no Asaas Sandbox: a cobrança passou para
      `RECEIVED`, o webhook confirmou o ingresso como `pago`, concluiu a
      operação financeira como `confirmed` e manteve exatamente duas
      credenciais, uma por atleta. Durante a homologação foi identificado e
      corrigido apenas no Sandbox um código vencido de liberação da proteção da
      Vercel; a fila do webhook foi reativada e permaneceu ativa. Validado em
      09/09/2026. A tela final também foi aprovada manualmente, mostrando a
      confirmação e somente o QR individual do comprador neste link privado.
      Em 09/09/2026, uma segunda compra Pix de R$ 324,00 foi confirmada com
      endereços reais distintos (Gmail e iCloud). O webhook manteve exatamente
      duas credenciais e o reenvio controlado foi aceito duas vezes pelo Resend,
      sem nova cobrança nem duplicação de credencial. A homologação revelou que
      o Next local descartava `RESEND_API_KEY` durante a carga do ambiente; o
      inicializador do Sandbox agora preserva essa chave somente em
      desenvolvimento, sem fallback em produção. A chegada e a abertura foram
      confirmadas manualmente no celular: cada caixa recebeu seu próprio link e
      cada link abriu somente a credencial do atleta correspondente.
    - [x] Confirmação de pagamento por cartão no Asaas Sandbox: cobrança única
      de R$ 60,50 aprovada como `CONFIRMED`, ingresso marcado como `pago`,
      operação financeira `confirmed` em uma tentativa e exatamente duas
      credenciais individuais. O estoque permaneceu ocupado e nenhum dado
      sensível do cartão foi gravado nos metadados. A homologação também
      identificou que o caractere `$` inicial do token do Asaas era expandido
      pelo carregador de `.env` do Next; o inicializador do Sandbox agora
      preserva a chave somente no processo local, sem criar fallback em
      produção. Validado manualmente e no banco em 09/09/2026.

- [ ] Redesenhar e homologar o checkout de inscrição de atleta com divulgação
  progressiva em três etapas, preservando os dados preenchidos ao avançar,
  editar, recarregar ou retornar para uma etapa anterior:
  - [x] Implementar no código as três etapas progressivas, seus resumos
    recolhidos e as ações de editar/trocar sem descartar os dados enquanto o
    checkout permanece aberto. O build e os testes automatizados passaram em
    09/09/2026; persistência dos campos após recarregar e homologação visual
    completa continuam nos itens abaixo.
  - [x] Corrigir o checkout por cartão e a identidade de quem compra para
    terceiros: a escolha `cartao` agora é aceita pela validação e uma conta
    logada só é vinculada como atleta quando o CPF privado do perfil coincide
    com o CPF do atleta 1. Conflitos corrigíveis de participante também
    preservam a reserva até o prazo original. Cobertura automatizada e
    verificação de tipos aprovadas em 09/09/2026.
  - [x] Fazer o inicializador local do Sandbox carregar os segredos privados e
    recusar a inicialização se Supabase ou Asaas não apontarem para ambientes
    de teste. Quando a chave dedicada de fingerprint estiver vazia, o Sandbox
    deriva uma chave HMAC estável sem exibir nem persistir dados do cartão;
    produção continua exigindo configuração própria.
  - [x] Tornar observável a falha ao criar ou localizar o pagador do checkout
    por cartão. A interface deixou de exibir o texto técnico genérico e agora
    orienta uma nova tentativa; o evento operacional registra somente código,
    status do provedor e ID interno do ingresso, sem nome, CPF, e-mail ou dados
    do cartão. Conexão, credencial, consulta de cliente e cobrança completa no
    Asaas Sandbox foram validadas em 09/09/2026.
  - [x] Etapa 1 — Categoria: exibir categoria, gênero, quantidade de vagas,
    preço e taxa, com ação específica “Continuar com esta categoria”. Depois de
    concluída, recolher a etapa e mostrar um resumo com check, categoria, tipo
    da dupla e ação “Trocar”. A quantidade restante combina no servidor o
    limite da categoria, o lote vigente, inscrições autenticadas, ingressos e
    reservas ativas.
  - [x] Etapa 2 — Participantes: permitir preenchimento pela conta, coletar os
    dados dos dois atletas, camisa e gênero e deixar explícito qual e-mail
    receberá cada credencial individual, incluindo a opção consciente de usar
    o mesmo e-mail. Depois de concluída, recolher a etapa e mostrar os dois
    nomes com check e ação “Editar”. Os dados digitados ficam somente na
    `sessionStorage` da aba e voltam após recarregar enquanto a reserva real
    estiver válida; expirado o prazo, o rascunho é descartado.
  - [x] Etapa 3 — Revisão e pagamento: reunir categoria, nomes e e-mails, cupom,
    Pix ou cartão, valores, taxas, Termos de Uso e Política de Privacidade em
    cards, com botão final específico “Pagar com Pix” ou “Pagar com cartão”.
  - [x] Manter durante o checkout um resumo minimizado no rodapé com total e
    quantidade de atletas; “Ver resumo” deve abrir a composição de categoria,
    inscrição, taxa, cupom, forma de pagamento e total sem cobrir o campo em
    foco nem o botão principal e respeitando a área segura do celular.
  - [x] Exibir nas etapas 2 e 3 o cronômetro da reserva real iniciada ao concluir
    a etapa 1, conforme o item anterior, sem contador meramente visual, e validar
    acessibilidade, teclado, foco, mensagens de erro e funcionamento em mobile
    e desktop. Em 14/09/2026, os campos passaram a ter rótulos associados e os
    resumos, o aceite obrigatório e os documentos foram aprovados nos cinco
    perfis Playwright de desktop e mobile.
  - [ ] Criar o pós-pagamento com estados distintos e verdadeiros: “Aguardando
    pagamento” para Pix criado, “Pagamento em análise” quando o processador não
    tiver confirmado e “Inscrição confirmada” somente após confirmação. No
    sucesso, exibir número do pedido, método de pagamento, campeonato, categoria,
    participantes, e-mails de entrega, ação principal “Ver meus ingressos”,
    instruções curtas de acesso e contato do organizador, sem anúncios ou
    ofertas competindo com a credencial.

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
- [ ] Publicar nos Termos e na Privacidade a operação como pessoa física,
  identificando o responsável como `Carlos Gregório Rocha Batista`, sem CNPJ,
  após validar juridicamente quais dados pessoais precisam ficar públicos.
- [ ] Publicar um canal eletrônico de suporte realmente atendido, o responsável,
  o horário real de atendimento e o prazo de resposta praticável. Não anunciar
  atendimento humano 24 horas se apenas o formulário permanecer disponível.
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
  - [x] Pix integral dentro de sete dias: em 08/09/2026, uma nova cobrança
    Sandbox de R$ 23,99 foi paga por uma segunda conta Asaas. O webhook de
    autorização respondeu HTTP 200 com `{"status":"APPROVED"}` e o estorno
    terminou como `DONE`. O saldo da conta pagadora voltou de R$ 75,02 para
    R$ 99,01. Após a conciliação, o ingresso foi marcado como `estornado`, os
    QRs deixaram de aceitar check-in e o estoque foi liberado exatamente uma
    vez. A primeira tentativa `CANCELLED` continua registrada como cenário
    terminal seguro.
    - [x] Bloquear atomicamente o check-in desde a criação da operação de
      reembolso até seu desfecho. A proteção foi aplicada e comprovada no
      Sandbox em 08/09/2026: o ingresso permaneceu pago e com estoque reservado,
      mas as duas credenciais recusaram check-in enquanto o estorno estava
      pendente. Falha/cancelamento do estorno reativa o acesso; confirmação o
      invalida definitivamente.
    - [x] Estado terminal `CANCELLED`: tentativa encerrada pelo Asaas foi
      conciliada em 08/09/2026 sem cancelar o ingresso, sem liberar estoque e
      sem deixar as credenciais bloqueadas. Nenhum comprovante de devolução foi
      emitido pelo provedor.
  - [x] Cartão integral dentro de sete dias: em 09/09/2026, a compra Sandbox de
    R$ 60,50 foi cancelada pelo link privado do comprador. O Asaas confirmou
    uma única devolução com estado `DONE`, a cobrança original passou para
    `REFUNDED`, o ingresso para `estornado` e as operações de pagamento e
    reembolso para `refunded`, ambas em uma tentativa. O banco preservou as duas
    credenciais no histórico, bloqueadas pelo estado terminal do ingresso,
    manteve ambos os check-ins falsos e registrou uma única liberação de
    estoque. A tela mobile apresentou corretamente solicitação, confirmação e
    cancelamento, além do prazo de crédito na fatura.
  - [x] Configurar e homologar o mecanismo seguro de autorização do Asaas para
    reembolsos Pix iniciados pela API. Em produção, a automação deve aprovar
    somente solicitações que coincidam com uma operação de reembolso pendente,
    persistida e validada no RankFTV; qualquer divergência deve ser recusada.
    Endpoint implementado, publicado e homologado em Preview em 08/09/2026, com
    validação do token, ID/estado do estorno no Asaas, cobrança, valor e ausência
    de check-in. O Asaas registrou HTTP 200, resposta `APPROVED` e status de saque
    `Aprovado`. Uma segunda compra entre contas Sandbox concluiu o estorno como
    `DONE`, confirmando o mecanismo de autorização de ponta a ponta.
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
  - [x] Aplicar e validar a estrutura no projeto Sandbox em 06/09/2026. As
    tabelas e colunas existem, os três índices foram criados, o RLS está ativo,
    `anon`/`authenticated` não possuem acesso direto e `service_role` possui a
    permissão necessária. O envio funcional foi homologado em 07/09/2026 com
    alteração controlada do local, mensagem contendo o valor anterior e o novo
    e recebimento confirmado pelo responsável.
  - [x] Exigir HMAC com segredo de pelo menos 32 caracteres em produção e
    remover o fallback para SHA-256 simples, falhando de forma segura quando o
    segredo não estiver configurado.
  - [x] Implementar reivindicação atômica das entregas com estado `processing`,
    `FOR UPDATE SKIP LOCKED` e recuperação de execução abandonada após 15
    minutos. Migration aplicada e verificada no Sandbox em 07/09/2026:
    `claimed_at`, função de claim e permissões retornaram `true`; `anon` e
    `authenticated` não executam a função, enquanto `service_role` executa.
    Falta homologar o comportamento funcional e aplicar em Production.
  - [x] Criar worker de até 50 entregas por execução e workflow a cada 15
    minutos, além do processamento imediato. Falta cadastrar o secret no
    GitHub e homologar conjuntamente volume acima de 50, retentativa,
    deduplicação e fila acumulada.
  - [x] Restringir no Sandbox os e-mails dessa homologação a uma allowlist
    explícita. Entregas para outros destinatários ficam como `suppressed`, sem
    contato com o Resend; produção continua irrestrita quando a variável não
    está configurada. Regra e testes adicionados em 07/09/2026.
  - [x] Avisar o organizador na confirmação de salvamento, somente quando houver
    alteração de data ou local, que será enviado e-mail e notificação a todos
    os atletas com inscrição paga e ativa.
  - [x] Não exibir o histórico desses avisos nas páginas públicas ou de
    ingresso. Quem ainda não se inscreveu vê diretamente os dados vigentes; os
    atletas afetados continuam recebendo o comunicado por e-mail e notificação.
- [ ] Implementar e homologar notificações transacionais ao organizador para
  cada inscrição/ingresso com pagamento confirmado e para cada cancelamento ou
  estorno confirmado. Esses avisos devem usar o Resend, sem consumir o limite
  de e-mails do Supabase Auth, e incluir identificação do campeonato, categoria
  ou tipo de ingresso e valor, sem expor dados desnecessários do comprador.
  - [ ] Persistir cada entrega em fila antes do envio, com chave idempotente por
    evento e destinatário, retentativa para `429`/`5xx`, recuperação de worker
    interrompido e estado final auditável; nenhuma falha do provedor pode fazer
    o evento financeiro ser repetido ou desaparecer silenciosamente.
  - [ ] Configurar e medir os limites reais do plano Resend de produção, alertar
    fila acumulada/falha definitiva e manter também uma notificação no painel do
    organizador como contingência.
  - [ ] Homologar no Sandbox pagamento, cancelamento, estorno, evento repetido,
    indisponibilidade temporária e pico de inscrições, comprovando exatamente
    um aviso por evento confirmado.
- [ ] Verificar o domínio/remetente transacional de produção, incluindo SPF,
  DKIM e DMARC, e confirmar entrega em Gmail e Outlook. O webhook Resend e suas
  métricas já foram homologados no Sandbox, mas precisam de configuração e
  evidência separadas em Production.
  - [x] Substituir no Sandbox o SMTP padrão limitado do Supabase Auth pelo
    Resend, usando remetente `noreply@rankftv.com`, domínio autorizado e limite
    de 30 mensagens por hora. A configuração e a permanência da allowlist do
    localhost foram confirmadas pela Management API em 08/09/2026.
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
    retido por 30 dias. Falta cadastrar os quatro secrets e comprovar a primeira
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
- [x] Conferir buckets reais do Supabase: acesso, policies, limites de tamanho
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
  - [x] Usar a geração de tipos contra o Sandbox para localizar migrations
    presentes no repositório mas ausentes no banco. Em 08/09/2026 foram
    aplicadas via MCP, de forma idempotente, as estruturas de alertas
    operacionais, funil público, banners da home, operação de quadras, dupla
    eliminação, lista de espera e melhorias dos casos de suporte. O contrato
    foi regenerado depois das aplicações. A verificação remota confirmou os
    oito objetos/colunas e o bloqueio de DML anônimo nas quatro tabelas
    internas. Isso não substitui a equivalência e a janela controlada ainda
    necessárias em produção.
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
- [ ] Executar teste conjunto de capacidade antes de iniciar anúncios. Começar
  somente depois que os fluxos críticos estiverem estáveis e homologados no
  Sandbox, usando k6 e dados falsos identificados para limpeza posterior.
  - [ ] Simular navegação pública, login, painel, campeonatos, chaveamento,
    consultas de ingresso/QR e placares; pagamentos e outras mutações devem
    atingir exclusivamente o Sandbox.
  - [ ] Subir a carga de lançamento gradualmente por 5, 10 e 25 usuários
    virtuais, executar um pico controlado e manter a carga por pelo menos 15
    minutos. Interromper automaticamente se a taxa de erros ou a pressão nos
    serviços ficar insegura. O ensaio prolongado com 50 e 100 usuários fica no
    P1, antes de ampliar campanhas pagas.
  - [ ] Medir requisições por segundo, erros, latência média e p95, conexões e
    uso do banco, queries lentas, bloqueios, timeouts da Vercel e falhas dos
    provedores externos.
  - [ ] Usar como critério inicial menos de 1% de erros, p95 das APIs abaixo de
    1,5 segundo, páginas principais abaixo de 2 a 3 segundos e nenhuma
    duplicação de pagamento, inscrição, check-in ou placar. Ajustar o limite
    final após medir a infraestrutura real.
  - [ ] Corrigir os gargalos encontrados e repetir o teste até aprovação. Só
    depois fazer um teste pequeno e supervisionado em produção, sem pagamentos
    artificiais, antes da campanha de anúncios.
- [ ] Definir a data de abertura dos pagamentos reais somente após concluir os
  demais itens P0.
- [ ] Registrar o release: commit, deployment, horário, migrations executadas,
  evidências e responsáveis.

## P1 — Necessário para estabilizar o lançamento

- [ ] Ativar e homologar a proteção contra senhas vazadas do Supabase Auth
  (`Have I Been Pwned`) depois de confirmar o comportamento de cadastro,
  redefinição e troca de senha no Sandbox.
- [ ] Comprar um novo chip e configurar o WhatsApp oficial do RankFTV. Até essa
  implantação, manter no lançamento o e-mail comercial e o formulário como
  canais oficiais, com horário e prazo de resposta verdadeiros.
- [ ] Consolidar as migrations e SQLs operacionais em um baseline reproduzível,
  sem depender da ordem manual em que os arquivos foram aplicados. Comprovar
  `supabase db reset` em ambiente descartável e executar um dry-run documentado
  antes de usar o processo em produção.
- [ ] Executar, antes de ampliar campanhas pagas, o ensaio prolongado de
  capacidade com 50 e 100 usuários virtuais por 30 a 60 minutos, mantendo os
  mesmos limites de erro, latência e integridade financeira definidos no P0.
- [ ] Permitir baixar cada credencial individual em PDF. Incluir somente nome do
  campeonato, data e hora, local, categoria ou tipo de ingresso, participante,
  referência do pedido, QR e código curto de contingência; não exibir CPF,
  e-mail completo nem outros dados desnecessários. Cada atleta deve receber seu
  próprio arquivo, e o QR deve continuar validado pelo servidor para respeitar
  check-in, cancelamento e reembolso.
- [ ] Acrescentar à confirmação uma ação de compartilhamento que envie apenas o
  link público do campeonato, nunca o pedido, a credencial, o QR ou o token de
  acesso. Avaliar também um bloco discreto com outros campeonatos do mesmo
  organizador, sempre abaixo das instruções e ações essenciais da compra.
- [ ] Auditar dependências de `pg_trgm` e, se compatível, mover a extensão do
  schema `public` para `extensions`, qualificando chamadas explícitas antes da
  mudança e repetindo testes de busca e índices.
- [ ] Endurecer cookies e endpoints públicos na auditoria dos 20 pontos.
  - [x] Marcar cookies Supabase como `Secure` em produção, enviar o token do
    polling de ingresso no corpo de `POST`, adicionar rate limit ao polling de
    ingresso, credencial e CEP e impedir que o download de workspace devolva
    erros internos.
  - [ ] Homologar login, recuperação e os dois pollings no Sandbox após o deploy
    deste código.
- [ ] Validar conteúdo real dos uploads no servidor, sem confiar apenas no MIME
  declarado pelo navegador. Conferir assinatura de imagens/PDF, confirmar o
  objeto após signed upload e avaliar quarentena/antimalware para PDFs.
- [ ] Reduzir gradualmente respostas administrativas que ainda devolvem
  `error.message`, começando pelas ações financeiras e pelas que manipulam dados
  pessoais. Registrar o detalhe somente na observabilidade sanitizada.
  - [x] Impedir que as ações financeiras críticas devolvam diretamente a
    mensagem do Asaas ou erros internos de persistência ao navegador.
  - [ ] Revisar as ações administrativas não financeiras restantes, priorizando
    as que manipulam dados pessoais.
- [ ] Revisar minimização, retenção e eventual criptografia em nível de campo
  para CPF, e-mail, chaves Pix e outros dados sensíveis; concluir a criptografia
  verificável dos backups exportados e proteger o inventário local de segredos.

- [ ] Acompanhar diariamente, na primeira semana, conciliações, webhooks,
  pagamentos pendentes, e-mails, estornos, suporte e repasses.
- [ ] Validar uma operação real controlada de estorno e uma de repasse quando
  houver transações elegíveis, sem criar cobranças apenas para teste.
- [ ] Definir a contingência de check-in sem conexão e testá-la em dois
  aparelhos antes do primeiro evento com público.
- [x] Reduzir `serverActions.bodySizeLimit` de 8 MB para 1 MB. Typecheck e build
  foram aprovados; falta apenas a homologação manual dos formulários e anexos
  no Sandbox antes do deploy.
- [ ] Gerar e versionar os tipos TypeScript do schema Supabase, tipar os três
  clientes (`browser`, sessão e administrativo) e automatizar a verificação de
  divergência dos tipos no CI.
  - [x] Gerar e versionar `lib/supabase/database.types.ts` a partir do Sandbox,
    fixar a CLI Supabase como dependência de desenvolvimento e criar os comandos
    `types:supabase:generate` e `types:supabase:check`. A checagem local confirmou
    que o arquivo está sincronizado em 08/09/2026.
  - [ ] Corrigir gradualmente os conflitos reais revelados ao aplicar o tipo
    gerado aos três clientes e só então tornar essa tipagem obrigatória. Há
    nulabilidade/JSON dinâmico e consultas genéricas antigas que ainda não
    satisfazem o contrato estrito, portanto os clientes continuam sem o generic
    para preservar o build da V1.
  - [ ] Adicionar `types:supabase:check` ao CI depois de cadastrar um token de
    automação com o menor escopo possível; não reutilizar automaticamente o
    token pessoal amplo salvo na máquina.
- [x] Preparar a migração gradual de `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
  `SUPABASE_SERVICE_ROLE_KEY` para a nomenclatura atual de chave publicável e
  secreta. Clientes, scripts e exemplos preferem os nomes novos e mantêm
  compatibilidade temporária; falta trocar os nomes nos ambientes remotos.
- [ ] Transformar as verificações SQL mais críticas em pgTAP sob
  `supabase/tests/database`: RLS, grants, funções `security definer`, constraints
  financeiras, estoque, ingresso, reembolso e chaveamento. Executar
  `supabase test db` no CI.
- [x] Ampliar o Playwright para Chromium e Firefox desktop, WebKit/Safari,
  Android e iPhone. Em 06/09/2026, 25 cenários passaram nos cinco projetos;
  faltam contas/dados exclusivos do Sandbox para retirar os 45 `skip` dos
  fluxos mutantes e autenticados.
- [x] Endurecer o GitHub Actions: fixar actions por SHA completo, habilitar
  atualização controlada dessas referências e revisar permissões mínimas dos
  workflows. Criptografar o backup no próprio job antes do upload do artefato e
  testar a abertura da cópia criptografada. Dependabot foi configurado para
  npm e Actions. Ainda falta comprovar o workflow remoto e substituir ou fixar
  de forma verificável o bootstrap do cliente PostgreSQL.
- [x] Restringir `images.remotePatterns` ao hostname exato do projeto Supabase
  configurado no ambiente, sem wildcard compartilhado.
- [x] Centralizar a autenticação dos crons em helper único, com comparação
  segura e respostas uniformes, e documentar quais rotas aceitam somente GET da
  Vercel e quais também precisam de disparo manual.
- [x] Validar a fronteira de proxy usada pelo rate limit e extrair o IP somente
  de headers garantidos pela hospedagem, impedindo que o cliente escolha a chave
  de limitação ao enviar `x-forwarded-for` diretamente. Em produção, o código
  prioriza `x-vercel-forwarded-for`; os fallbacks permanecem apenas para outros
  ambientes e testes locais.

## P2 — Depois do lançamento e com pessoas usando

- [ ] Adicionar login e cadastro com Google depois do lançamento. Começar pelo
  botão OAuth `Continuar com Google` e, após homologação, avaliar o Google One
  Tap personalizado. Adaptar o primeiro acesso para coletar `username`, gênero
  e aceite dos documentos que não vierem do Google; solicitar CPF, telefone e
  nascimento somente na ativação como organizador. Homologar vinculação segura
  com contas existentes, redirects e callback no Sandbox e em Production.
- [ ] Remover a exceção `style-src 'unsafe-inline'` da CSP depois de migrar os
  estilos dinâmicos de React/Recharts para uma estratégia compatível com nonce.

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

O perfil adicional `npm run lint:types`, executado na auditoria de 06/09/2026,
encontrou 3.712 avisos e zero erros. Esse número usa regras tipadas mais amplas
e não substitui o baseline de 1.153 avisos do lint principal.

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
- [ ] Depois de gerar os tipos do banco e reduzir os `any`, habilitar de forma
  gradual `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` e
  `noImplicitReturns`, corrigindo cada lote com testes antes de avançar.
- [ ] Encerrar a dívida somente quando `npm run lint` chegar a zero avisos e
  `npm run typecheck`, `npm test` e `npm run build` passarem na mesma revisão.

- [ ] Revisar mensalmente métricas, falhas e chamados de suporte para ajustar
  SLA, textos, política operacional e alertas.
- [ ] Priorizar melhorias com dados reais e com a matriz de
  `PESQUISA-CONCORRENTES.md`: lista de espera, operação por quadra, placar ao
  vivo, comunicação de mudanças e relatórios para organizador/patrocinador.
- [ ] Planejar Arena comercial, aplicativo/PWA ampliado, carteiras digitais,
  analytics avançado e demais módulos fora do escopo da V1.
