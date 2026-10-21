# Central de Evolução

Painel pessoal de Carlos dentro do admin do RankFTV. Não é um produto da
plataforma, não entra na V1 comercial e só pode ser acessado pela conta CEO
validada por `isPerformanceOwner`.

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
