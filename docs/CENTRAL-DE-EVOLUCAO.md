# Central de Evolução

Painel pessoal de Carlos dentro do admin do RankFTV. Não é um produto da
plataforma, não entra na V1 comercial e só pode ser acessado pela conta CEO
validada por `isPerformanceOwner`.

## Estado em 21/10/2026

- Implementação local no worktree
  `C:\Users\SnyX\Documents\Projeto-RankFTV-evolucao`.
- Branch local: `feat/central-evolucao`.
- Rota canônica: `/admin/evolucao`.
- Migração `supabase/evolution-center.sql` criada, mas **não aplicada**.
- Nenhum Preview, deploy, push ou mudança em Production foi feito.
- Enquanto as tabelas não existirem, a interface abre em modo de demonstração
  e usa os snapshots JSON versionados.

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

## Sincronização manual sem API de IA

1. Atualizar os snapshots locais:

   `npm run evolution:sync -- --vault "C:\Users\SnyX\Desktop\Carlos Rocha"`

2. Depois que a migration estiver homologada e somente com autorização para
   alterar o Supabase, importar os snapshots usando as credenciais existentes
   em `.env.local`:

   `npm run evolution:import`

O segundo comando resolve a conta por `ADMIN_EMAIL`, exige correspondência
única e grava apenas `evo_source_snapshots`. Nunca registrar chaves em notas.

## Arquivos principais

- UI e ações: `app/admin/evolucao/`.
- Componentes: `components/evolution/`.
- Métricas e consultas: `lib/evolution/`.
- Snapshot de fontes: `data/evolution/`.
- Scripts: `scripts/evolution-sync-sources.mjs` e
  `scripts/evolution-import-sources.ts`.
- Banco e RLS: `supabase/evolution-center.sql`.
- Auditoria somente leitura: `supabase/manual-tests/evolution-center-check.sql`.

## Próxima etapa controlada

Revisar visualmente em ambiente local autenticado. Depois, se Carlos aprovar,
aplicar a migration primeiro no Sandbox/ambiente de homologação, rodar checks
de isolamento, criar Preview e só então decidir sobre Production.
