# Central de Evolução

Painel pessoal de Carlos dentro do admin do RankFTV. Não é um produto da
plataforma, não entra na V1 comercial e só pode ser acessado pela conta CEO
validada por `isPerformanceOwner`.

## Roadmap de Data Science orientado pelas vagas (03/11/2026)

- A grade autenticada completa permanece preservada em
  `data/evolution/udemy-curricula.json`: 21 cursos, 318 seções e 2.645 itens
  oficiais. Ela continua sendo a fonte canônica e auditável.
- A rota ativa foi curada com base nas vagas fornecidas por Carlos e nas
  práticas realmente concluídas: 1.885 itens oficiais, 88 dias úteis e 356,8
  horas, de 03/11/2026 a 09/03/2027.
- Os 760 itens fora da rota ativa não foram apagados. Foram retirados da agenda
  apenas introduções, repetições, anexos básicos já demonstrados e recortes
  pouco prioritários para entrada na área.
- Os seis projetos aprovados possuem 24 dias de execução. Cada projeto termina
  com documentação e publicação no LinkedIn; os seis marcos de título dependem
  dessas entregas, e não apenas de aulas assistidas.
- O detalhamento da decisão está em `docs/DATASCIENCE-ROADMAP-VAGAS-2026.md`.

## Estado em 21/10/2026

- Publicada em Production na rota `/admin/evolucao` pelos merges das PRs #54 e
  #55; commit de Production atual: `9be440c`.
- Backup criptografado prévio concluído no workflow `39653560790`.
- Migrations `supabase/evolution-center.sql` e
  `supabase/20261021000100_evolution_ai_jobs.sql` aplicadas e verificadas no
  workflow `39655806592`: 13 tabelas privadas, RLS e force RLS, nenhum grant
  anônimo e RPC de claim exclusiva do `service_role`.
- Snapshots iniciais do roadmap (81 dias) e das pendências do RankFTV (36, em
  88%) foram importados em Production.
- A tarefa local `RankFTV Central Agent` está instalada, em execução e com
  heartbeat online do agente Codex `1.0.0`.
- Em 21/10/2026, o hotfix da PR #57 corrigiu a primeira falha de execução do
  agente: a versão local do Codex não reconhecia uma opção de linha de comando
  usada pelo script. A opção foi removida, o teste de fumaça em modo somente
  leitura foi aprovado e a tarefa foi reiniciada; o worker voltou a registrar
  `online` sem código de erro. Commit de Production: `f3d4c03`.
- Smoke pós-deploy: `/api/health` retornou 200 com `{"status":"ok"}` e o
  acesso anônimo a `/admin/evolucao` retornou 307 para `/login`.
- A interface usa superfícies claras, menu lateral grafite e azul RankFTV.
  Os componentes herdados do Pulso.AI foram neutralizados dentro da Central,
  e a escala tipográfica foi ampliada em cerca de 10% para facilitar a leitura.

## Áreas

| Rota | Responsabilidade |
| --- | --- |
| `/admin/evolucao` | Score, cobrança direta, foco diário/semanal e projetos |
| `/admin/evolucao/datascience` | Roadmap Udemy, timer, registro manual e dívida de estudo |
| `/admin/evolucao/rocha-tech` | Pulso.AI e seleção do vídeo semanal |
| `/admin/evolucao/insta-shape` | Treino confirmado no Hevy, peso, seguidores e equipamentos |
| `/admin/evolucao/rankftv` | Leitura simplificada de `PENDENCIAS-V1.md`, sem peso no score |

Rocha Tech mantém no menu interno a Visão do canal, Biblioteca de ideias,
Radar de tendências, Oportunidades, Fontes e Configurações.

## Regras fixas do score

- DataScience: 50 pontos.
- Rocha Tech: 30 pontos.
- Insta/Shape: 20 pontos.
- RankFTV: somente acompanhamento.
- Estudo: 2h de segunda a sexta e 10h na semana. Horas extras e fim de semana
  podem pagar dívida, mas nunca apagam a falha original do dia.
- Rocha Tech: um vídeo publicado por semana, em qualquer dia.
- Treino esperado: segunda a sábado; o Hevy continua sendo a fonte dos
  exercícios, séries e pesos.
- Seguidores não têm meta semanal de crescimento; a meta configurada inicial é
  500 até 30/06/2027, com fotografia inicial de 26.

## Atualização manual pelo Codex, sem API paga

Não há botão na home nem chamada a um modelo no navegador. Carlos pede a
atualização diretamente no chat e o Codex executa a pesquisa, pré-validação e
importação local somente quando houver autorização explícita.

Fluxo obrigatório:

1. Carlos pede a atualização no chat.
2. O Codex lê métricas, contexto autorizado do cofre e fontes ativas do Rocha Tech.
3. O Codex pesquisa, reavalia o radar e valida o resultado contra o banco.
4. Depois da autorização, importa o radar, sincroniza os snapshots e registra
   a análise semanal quando aplicável.

As tabelas históricas de execução permanecem protegidas por RLS. O agendador
`RankFTV Central Agent` fica desativado; nenhum processo inicia atualização sem
pedido de Carlos no chat.

## Sincronização manual e recuperação

1. Atualizar os snapshots locais:

   `npm run evolution:sync -- --vault "C:\Users\SnyX\Desktop\Carlos Rocha"`

2. Depois que a migration estiver homologada e somente com autorização para
   alterar o Supabase, importar os snapshots usando as credenciais existentes
   em `.env.local`:

   `npm run evolution:import`

O segundo comando resolve a conta por `ADMIN_EMAIL`, exige correspondência
única e grava apenas `evo_source_snapshots`. Nunca registrar chaves em notas.
Esse procedimento continua disponível como recuperação, mesmo com o agente.

## Arquivos principais

- UI e ações: `app/admin/evolucao/`.
- Componentes: `components/evolution/`.
- Métricas e consultas: `lib/evolution/`.
- Snapshot de fontes: `data/evolution/`.
- Scripts: `scripts/evolution-sync-sources.mjs`,
  `scripts/evolution-import-sources.ts`, `scripts/evolution-local-agent.mjs` e
  os dois wrappers PowerShell do agente.
- Banco e RLS: `supabase/evolution-center.sql` e
  `supabase/20261021000100_evolution_ai_jobs.sql`.
- Auditoria somente leitura: `supabase/manual-tests/evolution-center-check.sql`.
- Aplicação controlada: workflow
  `.github/workflows/production-evolution-center-migration.yml`.

## Evidências de publicação

Backup criptografado, audit sem vulnerabilidades altas, lint sem erros,
typecheck, 846 testes aprovados (1 ignorado), build com 72 páginas e testes de
navegador com 25 cenários aprovados (60 ignorados por dependerem de credenciais
ou flags mutáveis). A migration foi aplicada de forma atômica, seguida pelo
hardening do schema público, importação inicial, heartbeat local e smoke do
domínio.

## Grade oficial da Udemy (03/11/2026)

- A fonte canônica do roadmap de Data Science passou a ser
  `data/evolution/udemy-curricula.json`, coletada pela API oficial de currículo
  da Udemy. O snapshot registra ID, número e nome de cada seção; ID, número,
  tipo, nome e duração em segundos de cada item.
- São 21 cursos, 318 seções, 2.500 aulas e 145 quizzes, simulações ou outras
  atividades. O validador exige correspondência integral e sem duplicidade
  entre a grade e `data/evolution/roadmap.json`.
- O plano corrigido possui 112 dias úteis, 2.645 itens oficiais, 22 dias de
  projeto e 471,6 horas planejadas, de 03/11/2026 a 12/04/2027.
- Itens da Udemy usam IDs estáveis derivados dos IDs oficiais do curso e da
  atividade. O script `evolution:roadmap-progress:migrate` converte conclusões
  legadas antes de remover os IDs antigos; um dry-run é obrigatório.
- `evolution:sync` não volta mais ao Markdown histórico do cofre: ele regenera
  o roadmap a partir do snapshot oficial e sincroniza as pendências RankFTV.
- O snapshot foi importado e verificado em Production em 03/11/2026. A
  migração converteu 21 linhas legadas em 26 conclusões oficiais; a consulta
  final confirmou 2.645 itens, 26 conclusões canônicas, nenhum ID convertido
  remanescente e um registro histórico de Excel preservado.
