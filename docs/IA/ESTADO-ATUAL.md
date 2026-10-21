# Estado atual resumido

Última verificação: **20/10/2026 14:51, America/Sao_Paulo**.

Em 20/10/2026, foi iniciada a memória própria de marca e comunicação em
`docs/IA/MARCA-E-COMUNICACAO.md`, ainda com entrevista em andamento. Tarefas de
vídeo, carrossel e anúncio passaram a ser roteadas por essa memória e por
`videos/AGENTS.md`. O clone temporário do MazyOS e seu relatório de avaliação
foram removidos; nenhuma skill ou texto do projeto externo foi incorporado.
Os primeiros blocos da entrevista definiram o organizador como cliente
comercial prioritário, aquisição inicialmente B2B, receita por comissão e uma
voz amigável, profissional, próxima e persuasiva. O recorte inicial são
organizadores de campeonatos pequenos e médios, em todo o Brasil, que usam
processos manuais ou podem trocar de plataforma. A quantidade de duplas não é
um filtro definido. As dores iniciais cobrem inscrições desorganizadas,
controle de duplas, chaveamento e resultados, taxas altas, experiência visual
ruim e lentidão ou travamentos. Critérios de escolha, provas, linguagem visual
final e copies ainda estão em definição. A objeção principal
esperada é a falta de histórico de uma plataforma nova e o receio de falha
antes ou durante o evento. Foi definida uma orientação autoguiada e visual a
ser produzida para o Evento Padrão, enquanto o Evento de Elite terá uma call
personalizada e agendada com Carlos, sem duração pública fixa. Haverá suporte
normal pelo WhatsApp durante o período de inscrições, sem promessa de plantão,
disponibilidade 24 horas ou resposta imediata. Agendamento e prazo de resposta
ainda não possuem compromisso comercial definido. Carlos aprovou como promessa
central: “Organize seu campeonato inteiro em um só lugar, com suporte de
verdade e uma experiência profissional.” Organização centralizada lidera a
mensagem; suporte próximo e taxa competitiva entram como diferenciais. As
percepções prioritárias aprovadas são confiança, organização e simplicidade,
proximidade, modernidade e profissionalismo. A marca não deve parecer amadora,
improvisada, fria, distante, complicada, burocrática, instável, insegura ou
agressiva na venda. Carlos aprovou linguagem simples e direta, conversa com
“você”, humor leve, poucos emojis e persuasão baseada em benefício e prova. A
auditoria visual confirmou o símbolo “R” com estrela, azul elétrico, alto
contraste, Inter e peças com fotografia esportiva e telas; a proposta de
evolução sport-tech ainda aguarda aprovação. A prévia visual v1 em
`docs/brand/previews/` foi rejeitada por transformar a home da plataforma em
uma página de aquisição. Ficou aprovado preservar conteúdo, opções e
arquitetura atuais, sem merchandising interno. Carlos aprovou e foi
implementada localmente a modernização visual v2, limitada a grafite profundo,
azul de ação, contraste, superfícies, bordas, raios, sombras, tipografia,
ícones e estados de interação, sem trocar o conteúdo nem a arquitetura da
home. O grid desktop foi corrigido para manter destaques e campeonatos na
coluna esquerda, ao lado do acesso rápido.

Para revisão visual da home, existem dois campeonatos fictícios carregados
somente quando `NODE_ENV=development`: “Circuito Praia Azul — Etapa Rio” e
“Copa Sunset de Futevôlei”. Ambos aparecem na listagem, e apenas o Circuito
Praia Azul entra nos três destaques. As imagens originais foram geradas para
essa demonstração e versionadas como WebP em `public/banners/`. Esses dados
não existem no Supabase, não entram em Production e não constituem prova de
evento, cliente ou operação real.

Em 20/10/2026, o pacote `motion@14.4.0` foi instalado como dependência do
checkout principal e a pasta `videos/` foi criada para cenas e exports de
animações. O Motion é uma biblioteca de animação para React/JavaScript/Vue;
ela não é um renderizador de arquivos de vídeo.

Em 20/10/2026, foi criada a primeira peça Motion de divulgação para
organizadores, em formato vertical 9:16. O projeto em
`videos/rankftv-organizadores-vertical/` inclui briefing, roteiro, locução e
efeitos sonoros gerados localmente, cena React com `motion/react` e pipeline de
captura e codificação. O MP4 de 32 segundos está em
`videos/exports/rankftv-organizadores-v1.mp4`; é uma prévia local aguardando
aprovação e não foi publicada, enviada ou impulsionada.

Este é um atalho, não uma prova permanente. `PENDENCIAS-V1.md` define as
pendências do lançamento e qualquer estado remoto mutável deve ser reconsultado.

## Central de Evolução — reparo do agente local (21/10/2026)

- As duas primeiras solicitações de “Atualizar tudo com IA” falharam antes da
  pesquisa, sem alterar métricas, conteúdo ou snapshots. A investigação
  confirmou duas incompatibilidades com o Codex instalado localmente: opções
  de CLI removidas e o wrapper do PowerShell, que reinterpretava argumentos do
  Codex quando iniciado pelo agente.
- A PR #57 retirou a primeira opção incompatível. O reparo seguinte chama
  diretamente o entrypoint JavaScript do Codex pelo Node, remove a flag de
  busca obsoleta (a busca web já vem habilitada pelo Codex) e mantém o sandbox
  em somente leitura durante a análise. A execução única do agente e o smoke
  do CLI foram aprovados localmente, sem pesquisa ou escrita de dados.
- O registro falho permanece apenas como histórico. Uma nova solicitação pela
  interface cria uma execução independente; ela continua exigindo aprovação de
  Carlos antes de aplicar qualquer alteração.

## Central de Evolução — compatibilidade do schema editorial (21/10/2026)

- A execução seguinte chegou à leitura das métricas, mas encontrou dois nomes
  de colunas que não existem em Production (`locked_title` e `user_notes`). A
  consulta foi corrigida para o contrato real de `yt_ideas`:
  `title_locked_by_user` e `notes`.
- A consulta somente leitura foi confirmada diretamente contra Production, os
  quatro testes específicos do agente passaram e `evolution:agent:once`
  confirmou o boot sem fila. Nenhuma pesquisa, importação ou escrita de dados
  ocorreu nesta validação.
- A próxima etapa é publicar essa correção, reiniciar a tarefa local e criar
  uma nova solicitação no painel. A prévia ainda exigirá aprovação de Carlos
  antes de qualquer aplicação.

## Central de Evolução — prévia completa em sandbox somente leitura (21/10/2026)

- A primeira análise que chegou ao Codex retornou a revisão pessoal, mas deixou
  `youtube` nulo. A resposta registrou que não executou a pesquisa porque o
  prompt pedia um comando de fontes dentro do sandbox somente leitura.
- O agente passou a consultar as fontes ativas diretamente, junto com as
  métricas, e as entrega no prompt como `activeSources`. O Codex recebe
  autorização explícita para leituras e pesquisa web, mas continua proibido de
  escrever; o comando potencialmente mutável deixou de ser exigido nessa fase.
- As consultas somente leitura para ideias e fontes, e os cinco testes do
  agente, passaram. A alteração aguarda CI e publicação antes de uma nova
  análise; o fluxo de aprovação antes de importar continua inalterado.

## Central de Evolução — schema de saída e runner Windows (21/10/2026)

- A análise seguinte pesquisou e retornou uma prévia completa, mas usou nomes
  antigos no payload do importador. A pré-validação interrompeu o fluxo antes
  de importar qualquer item. A investigação também confirmou que `npm.cmd`
  não pode ser iniciado diretamente pelo `spawn` seguro do Node no Windows.
- O agente passa a fornecer ao Codex um JSON Schema estrito que espelha o
  contrato do importador e executa TypeScript pelo entrypoint local do TSX,
  sem invocar wrappers `.cmd`. A sincronização JavaScript também chama o Node
  diretamente.
- Sintaxe, parse do schema, seis testes específicos e verificação de diff
  passaram localmente. O candidato aguarda CI e publicação; uma nova análise
  continuará apenas em prévia até a aprovação de Carlos.

## Central de Evolução — título de notícias em português (21/10/2026)

- A pré-validação de uma pesquisa completa funcionou e bloqueou apenas um
  título exibido em inglês, antes de qualquer importação. Isso confirmou que
  o contrato estrito e o runner direto estão operando como esperado.
- O schema de saída e o prompt agora exigem que todos os títulos de notícias
  incluam construção em português, mesma regra já usada pelo importador. Sete
  testes específicos passaram localmente; a correção aguarda CI e publicação.

## Checkout principal observado

- Worktree: `Projeto-RankFTV`.
- Branch: `feat/english-roadmap-personal`.
- Commit observado antes desta documentação: `50f4557`.
- `origin/master`: `5c75756`; o checkout estava 15 commits atrás e possuía
  histórico divergente. Não é candidato de release enquanto não for
  reconciliado em uma árvore limpa.
- Worktree já estava suja, com alterações rastreadas e arquivos novos do
  usuário; todos devem ser preservados.
- Não fazer merge, rebase, deploy, migration ou limpeza baseado neste resumo.

## V1

- A auditoria documental de 20/10 recalibrou a V1 para **126/144 marcos P0
  (88%)**, com 18 marcos pendentes em 14 entradas. Parcelamento, carteira,
  correção das vulnerabilidades e promoção dos novos hardenings P0 foram
  adicionados explicitamente à linha de base. O bloco de hardening/migrations
  P0 foi posteriormente promovido e verificado em Production nos workflows
  `39477700522` e `39477800357`; isso não encerra as demais pendências da linha
  de base.
- A V1 comercial é Campeonatos. Arena e ferramentas pessoais não entram na
  porcentagem.
- Pagamentos reais não devem ser abertos até os P0 e a matriz financeira
  obrigatória terem evidência.

## Carteira do organizador

O worktree separado `Projeto-RankFTV-organizer-wallet`, branch
`feat/organizer-wallet`, contém a evolução da carteira e a PR #33. Em
20/10/2026, naquele checkout:

- os vinte checks estruturais foram registrados como verdadeiros no Sandbox e
  em Production;
- CI e Preview da PR estavam aprovados;
- a matriz transacional real do Asaas ainda não estava substituída por esses
  checks.

Antes de mexer na carteira, abrir o worktree/branch correto e revalidar GitHub,
Vercel, Supabase e Asaas.

## Trabalho local ainda não promovido

O checkout contém alterações ainda sem evidência de release para limites de
corpo, validação de anexos de suporte e sanitização parcial de erros. O health
público mínimo, a deduplicação do funil e os RPCs sensíveis já foram promovidos
e verificados em Production pelos workflows P0 registrados no histórico.

A validação atualizada aprovou typecheck, 813/813 testes no worktree da
carteira e build com 72 páginas. O `npm audit --omit=dev` está zerado após a
atualização de Next.js, Sharp e source-map-js. O lint global ainda possui dois
erros no módulo pessoal de mudança, fora do escopo comercial da V1.

O smoke somente leitura de Production foi concluído após a promoção: os
endpoints públicos retornaram HTTP 200 com `{"status":"ok"}` e a auditoria
operacional somente leitura também terminou com sucesso.

## Próxima decisão operacional da carteira

Formar um candidato de release limpo a partir de `origin/master`, decidir o
destino das PRs #27–#33 (a #30 está com `verify` reprovado) e homologar a PR #33
no Preview Sandbox: Pix, D+3, D+32, saque/antecipação parciais, documento
exigido, falha, resposta ambígua, concorrência e estorno/chargeback. Só depois
decidir merge/deploy em Production com backup, janela sem checkout e smoke
pós-deploy.

Atualize este arquivo quando branch, evidência, bloqueio ou próximo passo mudar.
O histórico completo pertence a `REGISTRO-EXECUCOES.md`.

## Central de Evolução — publicada em Production (21/10/2026)

- Worktree isolado `Projeto-RankFTV-evolucao` foi usado sem tocar o checkout
  principal sujo. PRs #54 e #55 foram mescladas no `master`.
- A rota `/admin/evolucao` reúne DataScience, Rocha Tech/Pulso.AI,
  Insta/Shape e a leitura simplificada do RankFTV. O módulo antigo
  `/admin/youtube` redireciona para a nova área.
- O score usa 50% DataScience, 30% Rocha Tech e 20% Insta/Shape. RankFTV é
  informativo e não altera o score. O módulo não reutiliza Life OS.
- Carlos aprovou a publicação em Production e o uso do PC ligado como agente
  local. As migrations privadas estão escritas com RLS por `user_id`; a fila
  de IA só permite leitura autenticada do próprio usuário e reivindicação pelo
  `service_role`.
- O botão “Atualizar tudo com IA” cria uma solicitação no site, o Codex local
  prepara uma prévia e Carlos precisa aprovar antes da importação. Não há API
  paga de modelo nem pesquisa automática por cron.
- O backup de Production `39653560790` foi concluído antes da promoção. A
  migration verificada `39655806592` confirmou as 13 tabelas privadas, RLS,
  grants e RPC do worker. Snapshots iniciais foram importados e a tarefa
  `RankFTV Central Agent` está em execução com heartbeat online.
- `npm run evolution:sync` transforma o roadmap do cofre e
  `PENDENCIAS-V1.md` em snapshots; `npm run evolution:import` já importou a
  fotografia inicial e permanece como recuperação manual.
- Typecheck, 847 testes (846 aprovados e 1 ignorado), lint sem erros, auditoria
  de dependências de produção sem vulnerabilidades e build Next.js com 72
  páginas geradas passaram no worktree.
- Referência operacional completa: `docs/CENTRAL-DE-EVOLUCAO.md`.
- A revisão visual de 21/10/2026 eliminou as cores escuras residuais herdadas
  do Pulso.AI nas páginas internas do Rocha Tech. Cards, filtros, Kanban,
  tabelas, fontes, formulários e detalhes agora seguem a paleta clara da
  Central, com azul RankFTV e estados semânticos consistentes. A escala de
  leitura foi ampliada em aproximadamente 10% sem usar zoom do navegador.

## Pulso.AI — inteligência de conteúdo para YouTube (20/10/2026)

- O módulo privado foi publicado em `https://www.rankftv.com/admin/youtube`.
  O card **Inteligência para YouTube** passou a ser o primeiro do Painel Admin,
  acima de Roadmap de inglês. A rota e as APIs administrativas exigem sessão e
  o mesmo vínculo persistido de CEO usado por `isPerformanceOwner`.
- O módulo contém dashboard, tendências, oportunidades, ideias, fontes e
  configurações; a experiência imersiva não altera a navegação do restante do
  RankFTV. As referências de canal cadastradas são Maestros da IA e O Custa
  João.
- A migration incremental de Production criou as nove tabelas `yt_*`, com RLS
  em todas, grants de cliente revogados e acesso de serviço preservado. A
  validação observada confirmou 9/9 tabelas protegidas, nenhum grant indevido e
  nove fontes cadastradas (oito ativas).
- A primeira coleta real encontrou e gravou 138 itens, sem falhas de fonte. A
  análise automática está deliberadamente desativada nas configurações porque
  a conta da API de IA não tinha créditos; a coleta continua funcional e sem
  tentativas de cobrança. Depois de adicionar créditos à conta da API, o CEO
  pode reativar OpenAI em `/admin/youtube/configuracoes`.
- Evidência de release: deploy Production `dpl_BygE6yY4e6eWyaCu364SJzF842KV`
  ficou READY e foi associado a `www.rankftv.com`. Em 20/10/2026, o health
  respondeu 200, páginas admin anônimas redirecionaram a `/login` (307) e as
  duas APIs protegidas recusaram chamadas anônimas com 401.

## Pulso.AI — atualização manual incremental (20/10/2026)

- A pesquisa automática foi desativada em Vercel, GitHub Actions e nas rotas
  de execução. O radar passa a ser atualizado sob pedido pelo Codex, com
  pesquisa web verificável e `npm run youtube:import`.
- Production recebeu cinco tabelas históricas `yt_*`, RLS em todas, grants de
  cliente revogados e uma função transacional de importação idempotente. A
  importação preserva notícia, ideia, ranking e avaliação anteriores; não muda
  status editorial, notas ou título bloqueado pelo usuário.
- A primeira pesquisa manual real gravou 8 acontecimentos, 5 tendências e 6
  ideias. A recomendação inicial é o teste prático de ChatGPT Slides, seguido
  por segurança de agentes, pós-treinamento de agentes e IA de voz. Cada item
  possui fonte original e a importação repetida foi confirmada como idempotente.
- O procedimento reutilizável está em `docs/YOUTUBE-RADAR-CODEX.md` e foi
  acrescentado às regras do repositório. A UI agora exibe ranking, estado
  editorial e páginas de detalhe com evidências e evolução registrada.

## Pulso.AI — referências de vídeos semelhantes (20/10/2026)

- Production recebeu a tabela privada `yt_idea_youtube_references` e a RPC
  `yt_apply_codex_youtube_references`. As duas foram validadas com RLS ativo,
  zero grants para `anon`/`authenticated` e execução da RPC apenas por
  `service_role`.
- A ideia de ChatGPT Slides recebeu quatro comparativos reais do YouTube, com
  título, canal, data de publicação, visualizações observadas e motivo da
  seleção. A interface foi publicada no deploy Production
  `dpl_F6kRBugz8M9xmUPPkhokEpcSkfPz`; toda ideia nova deve trazer de três a
  cinco referências verificadas antes de ser aceita pelo fluxo manual do Codex.

## Pulso.AI — atualização editorial completa (21/10/2026)

- A Visão Geral agora limita o Briefing Editorial a seis itens analisados
  manualmente pelo Codex, com título em português, até 14 dias, oportunidade
  mínima 75, confiança mínima 70 e confiabilidade confirmada/interpretação.
  O Radar de Oportunidades continua sendo o acervo amplo e possui filtros
  funcionais para publicar agora, alta confiança e sinal qualitativo.
- A página de Tendências passou a explicar que cada linha sintetiza um assunto
  sustentado por notícias, vídeos e sinais sociais. Tendência não é notícia;
  ideia de vídeo é a proposta editorial produzida a partir desses sinais.
- A pesquisa de 21/10 não encontrou grande anúncio oficial novo de OpenAI,
  Anthropic ou Google datado do próprio dia. Foram registrados quatro achados:
  Claude Motion, um sinal comunitário publicado hoje, Dots e a aquisição da
  Orchestra Bio pela OpenAI em 20/10. Nenhum dado de alcance foi inventado.
- Todas as oito ideias ativas foram avaliadas. Entraram Claude Motion (96,
  posição 1) e OpenAI Dots (93, posição 2), cada uma com cinco vídeos
  comparáveis verificados. ChatGPT Slides passou de 91 para 90 e posição 3;
  segurança de agentes caiu de 89 para 82 e posição 4; pós-treinamento caiu de
  88 para 65 e posição 8 por baixa aderência ao formato prático e não técnico.
- O perfil editorial informado pelo proprietário foi persistido: explicação
  para pessoas normais, novidade com impacto prático, testes honestos e
  tutoriais com resultado concreto, sem profundidade técnica desnecessária.
  Importações completas agora são bloqueadas se omitirem qualquer ideia ativa.
- A função restrita `yt_recalculate_codex_idea_ranks` corrige o contador e o
  histórico de notas/posições após cada carga. Production confirmou execução
  completa, oito avaliações nas posições 1–8, dez referências novas, provider
  automático ainda em `none` e nenhum grant de execução para clientes.
- Evidência de release: build completo aprovado e deploy Production
  `dpl_GSsFXdjwXyT6LDG4ppq8FzL1Fefd` READY, associado a `www.rankftv.com`.
  As quatro rotas administrativas testadas responderam 307 para `/login` sem
  sessão, preservando a proteção esperada.

## Pulso.AI — navegação horizontal por arraste (21/10/2026)

- O quadro da Biblioteca de ideias pode ser deslocado horizontalmente ao
  segurar o botão esquerdo no cabeçalho ou em uma área vazia de qualquer
  coluna e arrastar. A barra de rolagem inferior continua disponível.
- O gesto iniciado em um cartão de ideia permanece reservado para mover a
  ideia entre etapas. A ordem fixa das colunas não pode ser alterada pelo
  usuário, evitando conflito entre navegação e edição do fluxo.
- Lint dirigido, build completo e verificação de whitespace foram aprovados.
  O deploy Production `dpl_CFbc6wM1s74oKAiME8utvR1rYETa` ficou READY e foi
  associado a `www.rankftv.com`.

## Pulso.AI — cadastro e controle de fontes (21/10/2026)

- A rota `/admin/youtube/fontes` agora permite adicionar uma fonte por nome,
  link e tipo, editar, ativar/desativar e remover. São aceitos site, blog,
  YouTube, X/Twitter, newsletter, Reddit, RSS, Atom, API e outro.
- A remoção é lógica: a fonte deixa de aparecer e de participar das próximas
  pesquisas, mas notícias, execuções e vínculos históricos permanecem. Reusar
  o mesmo link restaura o registro sem duplicar a fonte.
- O fluxo manual exige `npm run youtube:sources` antes da pesquisa. O importador
  bloqueia IDs de fontes desligadas e, em atualização completa, bloqueia a
  omissão de qualquer fonte ativa. Assim, desligar OpenAI News exclui a OpenAI
  da pesquisa seguinte sem apagar resultados antigos.
- Production possui 12 fontes cadastradas e 10 ativas; Maestros da IA e O
  Custa João foram incorporados ao mesmo controle. A migration preservou RLS,
  zero acesso direto de `anon`/`authenticated` e acesso de `service_role`.
- Evidência de release: 817 testes aprovados, 1 ignorado, build completo com 74
  páginas e deploy Production `dpl_8vMXtKjZEy5njdYRGwGHAKQeqTQi` READY em
  `www.rankftv.com`.

## Pulso.AI — inspeção por item e filtro de relevância de IA (21/10/2026)

- A rotina manual do Codex passa a exigir inspeção da listagem/feed e da página
  individual de cada item candidato. A home da fonte é apenas índice; data,
  título, conteúdo e URL do item precisam ser conferidos antes da importação.
- O importador exige `aiRelevance` com nota mínima 70 e justificativa para cada
  notícia, tendência e ideia. Empresa de tecnologia não é critério suficiente:
  Tesla, SpaceX ou outra fonte só entram quando IA for o assunto central.
- Limitação documentada: X/Twitter, YouTube e páginas com login, paywall,
  bloqueio de robôs ou conteúdo carregado apenas por JavaScript podem impedir a
  leitura integral. Nesses casos a fonte é marcada como limitada, não há
  inferência de conteúdo e a home não é usada como confirmação.

## Pulso.AI — procedência e rodada completa de 21/10/2026

- As tabelas de conteúdo, tendências e ideias agora registram `source_origin`:
  `primary` para fonte primária cadastrada, `market` para pesquisa de mercado e
  `mixed` quando a pauta combina as duas evidências. As notícias e ideias
  exibem essa etiqueta na interface.
- A rodada `1f779786-f70c-4be1-8d7c-8772ea9b614e` consultou as 10 fontes ativas
  declaradas por Production, gravou 10 itens analisados, reavaliou as 8 ideias
  ativas e confirmou zero fontes falhas. O filtro de IA excluiu conteúdo
  genérico de carros, foguetes ou perfis sociais sem evidência verificável.
- A procedência das ideias ficou distribuída em 2 primárias, 3 combinadas e 3
  de mercado. As notas finais foram: Claude Motion 95, Dots 94, ChatGPT Slides
  88, segurança de agentes 84, voz 80, algoritmo conversável 76, golpes 73 e
  pós-treinamento 62.
- Foram adicionados sinais de mercado para agentes e busca com fontes visíveis,
  além de achados oficiais recentes de Anthropic, Google, NVIDIA e Higgsfield.
  O provider automático continua em `none`; a atualização foi manual e sem
  cobrança de API.
