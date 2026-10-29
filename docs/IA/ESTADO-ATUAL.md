# Estado atual resumido

## DataScience — novo roadmap completo em prévia local (29/10/2026)

- A branch local `feat/datascience-roadmap-v2` substitui o plano anterior de
  60 dias por uma trilha de Ciência de Dados + IA dividida em três prioridades:
  fundamentos indispensáveis, competências próximas do nível pleno e
  especialização em IA.
- O calendário recalculado pela grade real possui 84 dias úteis e cerca de
  350,7 horas planejadas, de 03/11/2026 a 03/03/2027, sem sábados, domingos ou
  feriados oficiais cadastrados. Cada tarefa agora usa literalmente o nome da
  aula; quando o recorte é uma seção completa, exibe `Módulo inteiro` e o nome
  oficial. Apenas durações não publicadas aparecem como estimativas.
- A Prioridade 1 inclui também 23 aulas selecionadas de `Análise e Levantamento
  de Requisitos de Software`, distribuídas nos dias 14 e 15, cobrindo
  introdução, elicitação, documentação, comunicação e estudos de caso.
- O roadmap possui 29 marcos de competências para o LinkedIn. Cada aviso só
  aparece após o conjunto de aulas que sustenta a habilidade, tanto no próprio
  dia quanto em um painel consolidado com confirmação e cópia do nome.
- Foram selecionados e preparados seis projetos progressivos: diagnóstico de
  atendimento, painel de estoque, risco de crédito, previsão de atendimento,
  API de churn e inteligência de avaliações. As páginas locais referenciam 29
  arquivos sintéticos validados, com 22.148 linhas CSV no total.
- O registro de foco deixou de aparecer nessa nova página. Progresso e marcos
  de carreira usam armazenamento local somente na prévia de desenvolvimento;
  o acesso local é liberado exclusivamente quando
  `EVOLUTION_LOCAL_PREVIEW=true`, sem alterar a autenticação de Production.
- Estado: implementação e validação local concluídas; nenhuma publicação,
  migration ou escrita em Production foi realizada.

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

## Central de Evolução — atualização manual, sem agente local (21/10/2026)

- Decisão atual de Carlos: retirar o botão “Atualizar tudo com IA” e fazer as
  atualizações diretamente pelo chat. A tarefa do Windows `RankFTV Central
  Agent` foi parada e desativada; históricos e tabelas foram preservados.
- A home deixou de consultar e exibir fila, erro ou heartbeat do agente. Não há
  pesquisa automática, cron nem API paga: o Codex pesquisa, valida e importa
  somente quando Carlos pedir e autorizar no chat.
- A atualização manual `93a11bf9-f76f-4a12-9a06-06c3b7b268da` passou no
  preflight e importou 4 itens, 4 tendências e a reavaliação das 8 ideias
  ativas em Production. O roadmap (81 dias) e RankFTV (36 pendências, 88%)
  foram sincronizados e importados na Central.
- O acompanhamento de estudo começa em 22/10/2026, primeiro dia do roadmap.
  O lançamento de 21/10/2026 foi removido; dias anteriores ao marco não geram
  dívida nem cobrança.

## Histórico — reparo do agente local (21/10/2026)

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

## Central de Evolução — campos opcionais no schema estruturado (21/10/2026)

- A execução posterior falhou antes de produzir a resposta porque o modo de
  saída estruturada do Codex exige que toda propriedade declarada seja
  obrigatória. O schema tinha três campos que o importador aceita omitir.
- Esses campos agora são obrigatórios no schema e aceitam `null` quando não se
  aplicam: perfil editorial, entidade da notícia e referências de YouTube. O
  agente remove somente esses `null`s antes da pré-validação, preservando o
  contrato original do importador.
- A mensagem sanitizada do agente passou a guardar o começo e o fim de falhas
  longas, sem registrar URLs ou valores sensíveis. Sintaxe, parse do schema,
  nove testes específicos e verificação de diff passaram localmente. A próxima
  execução continuará sendo apenas uma prévia até a aprovação de Carlos.

## Central de Evolução — compatibilidade de URLs no schema (21/10/2026)

- A nova execução confirmou que o Codex aceita o schema estrito, mas rejeita o
  formato `uri` antes de começar a pesquisa. Isso ocorreu no serviço de saída
  estruturada, não no importador e sem qualquer escrita em Production.
- O schema agora usa um padrão compatível para URLs `http`/`https`; a
  pré-validação do importador continua responsável pela validação completa de
  cada URL antes da prévia. Dez testes específicos, parse do JSON e verificação
  do diff passaram localmente. A correção será publicada antes da nova análise.

## Central de Evolução — pré-validação local sem limite de saída (21/10/2026)

- O teste direto confirmou que o Codex aceita o schema corrigido, porém uma
  resposta completa do radar excede o limite de saída estruturada antes de
  finalizar. Esse limite impede a pesquisa, mas não é uma validação de
  segurança do sistema.
- A restrição remota foi removida. O agente continua exigindo JSON, normaliza
  apenas os campos anuláveis e executa a pré-validação local do importador antes
  de liberar a prévia. Assim, o mesmo contrato editorial, de fontes e de URLs
  é verificado sem truncar a resposta; a aplicação ainda depende da aprovação
  explícita de Carlos.
- Sintaxe, sete testes específicos e `git diff --check` passaram localmente.
  A alteração aguarda CI, merge e uma nova análise assistida.

## Central de Evolução — completude do payload editorial (21/10/2026)

- A primeira análise sem schema remoto concluiu a pesquisa e foi bloqueada pela
  pré-validação local, antes de importar. Duas entradas omitiram `aiRelevance`
  e `sourceOrigin`, campos obrigatórios do contrato editorial.
- O prompt agora declara esses campos e sua enumeração literal para cada
  notícia, tendência e ideia. A pré-validação local continua sendo a barreira
  final antes de mostrar a prévia. Sintaxe, sete testes específicos e
  `git diff --check` passaram; a correção aguarda CI e publicação.

## Central de Evolução — contrato fornecido pelo agente (21/10/2026)

- A tentativa seguinte mostrou que o Codex não conseguiu abrir arquivos locais
  dentro de seu sandbox e devolveu um objeto de erro, que a pré-validação
  bloqueou por não conter os arrays editoriais obrigatórios. Nada foi importado.
- O agente não pede mais leitura de arquivos ao Codex. Ele fornece no prompt o
  contrato literal de notícias, tendências e ideias, exige os três arrays e
  proíbe respostas de erro. A pesquisa web, o sandbox somente leitura, a
  pré-validação local e a aprovação antes da aplicação foram mantidos.
- Sintaxe, sete testes específicos e `git diff --check` passaram localmente.
  A correção aguarda CI, merge e uma nova análise assistida.

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
## Central de Evolução — roadmap diário e foco pausável (22/10/2026)

- A página DataScience passa a exibir, em cada dia do roadmap, os cursos reais
  de Ciência de Dados e Inglês, com links oficiais da Udemy e a lista de aulas
  planejadas naquele dia. Os dados são regenerados por `evolution:sync` a partir
  de `roadmapudemy_diario.md`.
- O registro de foco não salva automaticamente: iniciar, pausar e retomar são
  ações locais. Ao salvar, a interface abre uma confirmação com minutos
  editáveis; somente a confirmação final grava a sessão.
- Validação local concluída com `npm run lint -- --quiet`, `npm run typecheck` e
  `npm run build`.
-
## Central de Evolução — inteligência editorial local (22/10/2026)

- A rota `/admin/evolucao/rocha-tech?view=inteligencia` apresenta uma primeira
  camada de inteligência editorial: tamanho da base, sinais por tema, amostra
  mais vista e limites dos dados públicos.
- Em desenvolvimento, a camada lê os JSONs de `Rocha Tech - YT/Concorrentes`
  do cofre por caminho local. Não há envio automático para API nem escrita no
  Supabase; sem o cofre, a interface mostra estado vazio.
- A pesquisa profunda de 22/10/2026 foi registrada em
  `Rocha Tech - YT/04 - Pesquisas/Inteligencia Editorial - 2026-10-22.md`.
- Esta rodada não importou novas notícias, ideias ou pontuações.

## Biblioteca de ideias — categorias editoriais (22/10/2026)

- A Biblioteca exibe uma etiqueta de categoria em cada ideia, calculada de
  forma determinística pelo título, resumo e ângulo.
- As categorias são as cinco já usadas nos sinais da inteligência editorial:
  Negócios e dinheiro, Ferramentas práticas, Modelos e lançamentos, Agentes e
  automação e Notícias e opinião.
- A alteração é apenas de apresentação e não grava classificação no Supabase.

## Inteligência editorial — thumbnails e critério da amostra (22/10/2026)

- O carregador passou a ler thumbnails e métricas tanto do formato direto dos
  snapshots quanto do formato baseado em `observations[0]`.
- Os cards de vídeos mais vistos exibem a thumbnail original e informam que a
  posição é ordenada por views públicas observadas na coleta.
- O ranking não é uma nota de qualidade ou previsão: não normaliza por idade do
  vídeo, tamanho do canal, CTR, retenção ou inscritos.

## Inteligência editorial — views e thumbnails (22/10/2026)

- A interface mostra unidades explícitas (`mil`, `milhões`) em vez de `mi`.
- As thumbnails dos concorrentes são lidas dos arquivos locais do cofre por
  uma rota autenticada, evitando a falha dos links remotos do YouTube.

## Inteligência editorial — correção de unidade nas views (22/10/2026)

- Seis snapshots tinham valores redondos inflados por 1.000: um de Lucas
  Montano (`11.000.000 → 11.000`) e cinco de Vagner Mazzeo (`7.000.000 →
  7.000` ou `2.000.000 → 2.000`).
- O parser foi corrigido para não interpretar `mi` como milhão na listagem
  pt-BR; `m` permanece a abreviação de milhão.
- A média corrigida ficou em aproximadamente 49,6 mil para Lucas Montano e
  35,9 mil para Vagner Mazzeo. A coleta online foi tentada, mas a rede não
  estava disponível; os snapshots já existentes foram preservados.

## Inteligência editorial — títulos em pt-BR e amostra ampliada (22/10/2026)

- A amostra visual passou de 12 para 15 vídeos.
- Todos os títulos apresentados nesses cards estão em português do Brasil. O
  título original coletado continua preservado na memória da aplicação e pode
  ser consultado ao posicionar o cursor sobre um título traduzido.
- Datas relativas coletadas em inglês também são normalizadas para pt-BR, como
  `3 months ago` para `há 3 meses` e `1 year ago` para `há 1 ano`.
- A ordem continua baseada exclusivamente nas visualizações públicas do
  snapshot; a tradução não altera dados, pontuação ou posição.
- Para Production, os indicadores agregados e os 15 cards possuem um snapshot
  público versionado no servidor. A rota autenticada usa thumbnails locais no
  desenvolvimento e recorre à imagem pública do YouTube quando o cofre não
  estiver disponível na Vercel.

## Pulso.AI — atualização completa de 23/10/2026

- A rodada `64dfd16c-2e98-4ec6-8523-90b69c021c4c` cobriu as 16 fontes ativas
  de Production, importou 8 notícias verificadas, reavaliou 12 tendências e
  12 ideias e criou 3 ideias novas com 9 referências do YouTube.
- O perfil editorial passa a usar o nome Carlos Rocha e a lente de IA aplicada,
  produtividade, carreira, negócios e execução sem autoengano.
- O snapshot público da inteligência editorial foi renovado de 680 vídeos em
  13 canais para 997 vídeos em 18 canais, com 994 registros contendo views e
  média corrigida de aproximadamente 113,2 mil.
- A amostra de 15 vídeos agora filtra aderência editorial antes de ordenar por
  views, evitando que assuntos alheios à linha do canal dominem o painel.
- O carregador corrige de forma defensiva 16 contagens arredondadas de Pedro
  Cooke que haviam sido interpretadas em milhões em vez de milhares.
- Uma tendência antiga equivalente a agentes proativos foi arquivada após a
  importação para evitar duplicidade; a listagem omite estados arquivados e
  desatualizados, preservando o histórico no banco.

## Pulso.AI — ranking de oportunidade e atualização completa de 24/10/2026

- A base de concorrentes foi consolidada em 849 vídeos de 16 canais, com 846
  registros contendo visualizações públicas. Ernesto Reis e Pedro Cooke foram
  retirados da base e não participam mais de métricas, referências ou ranking.
- A Vizinhança passou de uma observação isolada para 13 vídeos do último ano,
  todos com título, data exata, duração, views e thumbnail preservados no cofre.
- O ranking principal deixou de ordenar por views absolutas. A nota de
  oportunidade, de 0 a 100, combina desempenho contra a mediana do próprio
  canal (35%), aderência editorial (20%), facilidade de adaptação (15%),
  atualidade (15%), validação em outros canais (10%) e força de título e
  thumbnail (5%). Podcasts, entrevistas e lives ficam fora do ranking
  principal, com limite de três vídeos por canal.
- O snapshot seguro usado na Vercel foi renovado com os 15 vídeos mais úteis
  para estudo editorial, incluindo posição, nota, justificativa, múltiplo da
  mediana e composição detalhada da pontuação.
- A rodada de Production `6f8d13f1-8f60-45d1-bf2f-ef1d6f9c3ea5` verificou as
  16 fontes ativas, analisou 10 notícias, inseriu 2 conteúdos novos, reavaliou
  12 tendências e ranqueou 13 ideias. A pauta nova sobre o custo real de criar
  vídeo com IA entrou em quinto lugar com nota editorial 90.
- Quatro referências antigas ligadas aos dois canais removidos foram apagadas
  do Supabase; nenhuma permaneceu depois da verificação.
- Evidência local: 859 testes executados, 858 aprovados e 1 ignorado; lint,
  typecheck, `git diff --check` e build completo com 72 páginas concluídos sem
  erro. Nenhum segredo foi registrado.

### Correção visual das thumbnails

- O seletor antigo `span:last-child` fazia a etiqueta de nota ocupar toda a
  thumbnail e esconder a imagem. Ele foi removido; posição e nota agora usam
  exclusivamente suas classes específicas, preservando a foto visível.

## Pulso.AI — atualização completa de 25/10/2026

- A rodada `13dd75eb-4059-429d-b742-98ba018bec2a` cobriu as 16 fontes ativas
  de Production, analisou 11 fatos, inseriu 1 conteúdo novo, atualizou 10,
  reavaliou 13 tendências e ranqueou 14 ideias sem fontes falhas.
- A nova pauta **Ensine uma vez, use em qualquer IA: o que são Agent Skills?**
  entrou na posição 2, com nota 95 e cinco referências verificadas do YouTube.
  A evidência principal é a doação oficial do padrão Agent Skills para a
  Agentic AI Foundation, com integração declarada em mais de 70 plataformas.
- A nova tendência **Habilidades portáteis e reutilizáveis para agentes de IA**
  recebeu nota 95 e confiança 98. Claude Duet permaneceu como melhor pauta,
  com nota 97.
- O snapshot público seguro foi regenerado a partir da base local completa:
  **1.021 vídeos em 20 canais**, 1.018 com views válidas e 15 oportunidades
  ordenadas pela nota editorial relativa, com limite de três por canal.
- A pesquisa não encontrou lançamento posterior à rodada anterior com evidência
  suficiente para substituir artificialmente as pautas atuais. Perfis do X e
  fontes sem item individual acessível permaneceram como limitação, sem
  inferência de conteúdo. O provider automático continua desativado.
## 2026-10-25 — Central: requisitos e custo por ideia

- Cada página de detalhe de ideia passou a exibir “Requisitos para gravar”,
  com ferramentas, acesso gratuito ou pago, assinatura existente, itens
  opcionais e custo mensal estimado das novas assinaturas.
- A análise deriva automaticamente dos campos já persistidos da ideia, sem
  migration ou cadastro manual para ideias futuras.
- O cálculo exclui computador e celular. CapCut e Canva gratuitos e a
  assinatura atual do ChatGPT são considerados base; recursos pagos de Claude,
  CapCut ou Canva só entram no total quando necessários.
- Estado: alteração local pronta para validação, CI, merge e Production.
## 2026-10-25 — Central: data da novidade nas ideias

- Cada detalhe de ideia passa a mostrar a data observada da fonte relacionada
  quando o título/resumo indica lançamento, modelo, versão, agente ou novidade.
- Pautas sem lançamento específico exibem explicitamente essa condição. Quando
  a fonte não informa uma data verificável, isso também é indicado sem inventar
  uma data.
- A informação é derivada em tempo de renderização, sem migration ou alteração
  editorial no Supabase.
## Pulso.AI — detalhe e resumo sob demanda de notícias (26/10/2026)

- Os cartões do briefing na Central de Evolução agora são clicáveis e abrem
  `/admin/evolucao/rocha-tech/noticias/[id]`, com procedência, nota, resumo
  editorial e link para a fonte original.
- A página tenta ler a fonte pública e, quando o provedor OpenAI estiver
  configurado, gerar um resumo em português com fatos principais e detalhes
  que não devem ser omitidos. URLs internas, credenciais na URL, hosts locais e
  redes privadas são bloqueados; o HTML bruto não é persistido.
- A migration `supabase/20261026000100_youtube_article_summaries.sql` prepara
  o cache privado dos resumos para `service_role` e foi aplicada em produção
  pelo workflow protegido de migração, com verificação de tabela, RLS e grants.
- O hover dos cartões mantém fundo claro e contraste legível; a página de
  detalhe trata a ausência temporária da tabela/cache sem falhar.
- PR #81 foi mesclada em `master` e o deploy Vercel de produção do commit
  `347eb102e5bdf104f21623f559217e8f52fcb234` concluiu com sucesso.
- Validação: typecheck, testes direcionados, build e 30 testes de navegador
  passaram; a migração de produção também passou na verificação final.
## Central de Evolução — rota de serviços de Data Science (27/10/2026)

- O roadmap ativo de Data Science passa a ser o plano intensivo de 30 dias
  voltado a prestação de serviços, com 4h planejadas por dia útil e 150
  atividades entre formação, inglês e prática.
- A navegação de DataScience ganhou duas páginas: `Plano de estudos` e
  `Serviços desbloqueados`. A segunda acompanha quatro marcos (diagnóstico,
  painel, automação e pacote integrado) sem confundir aula assistida com
  capacidade demonstrada.
- Cada serviço exige as práticas principais do intervalo, três confirmações de
  evidência e os pré-requisitos definidos. As confirmações usam a tabela de
  progresso já existente; não há migration nova.
- O importador de snapshots aceita `--data-dir`, permitindo publicar dados de
  uma worktree limpa sem copiar `.env.local` ou qualquer segredo.

## Central de Evolução — aulas numeradas e projetos executáveis (28/10/2026)

- O snapshot local contém 60 dias e 60 aulas numeradas, de 28/10/2026 a 25/01/2027,
  sem atividades de inglês.
- Cada curso do dia mostra link e número exato das aulas; revisões indicam os
  intervalos já estudados e leituras externas indicam capítulos/assuntos.
- A seção diária `Prática e entrega` foi removida por decisão de Carlos. Os
  exemplos práticos ficam nos próprios cursos e as entregas nos três projetos
  finais; o plano preserva até quatro horas reservadas por sessão.
- Os três fechamentos do ciclo são clicáveis e abrem páginas próprias com base
  fictícia XLSX, cenário, objetivo, execução, entregáveis, aceite e LinkedIn.
- As bases foram produzidas com dados sintéticos e erros intencionais; nenhuma
  informação real de cliente foi usada.

## Central de Evolução — plano intensivo de 60 dias (28/10/2026)

- Os Dias 1 e 2 permanecem idênticos ao snapshot anterior para preservar o
  progresso já salvo; o primeiro bloco iniciado do Dia 3 também mantém seu ID.
- Do Dia 3 em diante, a carga foi elevada para aproximadamente 2h30 a 3h30 de
  conteúdo por sessão, priorizando blocos aplicados e reduzindo o peso de
  tópicos introdutórios já dominados.
- A sequência agora é explícita e majoritariamente crescente dentro de cada
  curso. O salto temático do antigo Dia 2 para aulas 65–73 não se repete nos
  próximos dias sem uma indicação clara de revisão ou recorte.
- O snapshot ativo contém 60 dias, 62 tarefas e continua sem inglês.
