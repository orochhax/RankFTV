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

## Botão “Atualizar tudo com IA” sem API paga

O botão da home não chama um modelo no navegador nem expõe credenciais. Ele
cria um job privado em `evo_ai_jobs`. O agente instalado no computador de
Carlos mantém um heartbeat em `evo_ai_workers`, reivindica o job de forma
atômica e usa a sessão local já autenticada do Codex/ChatGPT.

Fluxo obrigatório:

1. Carlos pede a atualização no site.
2. Quando o PC está ligado, o agente lê métricas, contexto autorizado do cofre
   e fontes ativas do Rocha Tech.
3. O agente pesquisa e reavalia o radar, valida o resultado contra o banco e
   grava uma prévia; ainda não altera os dados finais.
4. Carlos aprova ou descarta no site.
5. Só depois da aprovação o agente importa o radar, sincroniza os snapshots e
   registra a análise semanal.

Estados da fila: `queued_analysis`, `analyzing`, `awaiting_approval`,
`queued_apply`, `applying`, `completed`, `failed` e `cancelled`. Existe no
máximo um job ativo por usuário. Usuários autenticados só podem ler as próprias
linhas; criação, aprovação e descarte passam por Server Actions autorizadas, e
a reivindicação é exclusiva do `service_role` no agente local.

Instalação do agente no Windows, depois das migrations:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-evolution-agent.ps1
```

A tarefa `RankFTV Central Agent` inicia no logon, roda oculta e usa
`scripts/run-evolution-agent.ps1`. Artefatos e logs ficam somente em
`.codex-artifacts/evolution-agent/`, ignorados pelo Git. O agente recusa um
Supabase diferente do projeto fixo de Production e nunca imprime chaves.

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
