# Teste de capacidade — Sandbox

Este ensaio nunca deve usar Production nem executar mutações. O script usa só
GETs públicos e recusa URLs que não sejam Preview/Sandbox da RankFTV.

## Pré-requisitos

- Fluxos críticos do Sandbox aprovados.
- k6 instalado localmente.
- Um Preview público e estável da branch de homologação.

## Execução

```powershell
k6 run `
  -e BASE_URL=https://rank-ftv-git-sandbox-homologacao-devcarlosrochas-projects.vercel.app `
  -e CHAMPIONSHIP_ID=<uuid-do-campeonato-sandbox> `
  scripts/k6-sandbox-smoke.js
```

O `CHAMPIONSHIP_ID` acrescenta detalhes, categorias, chaveamento e placar ao
ensaio. Para validar rapidamente a configuração antes dos 17 minutos, acrescente
`-e K6_PROFILE=smoke`; esse perfil dura 35 segundos e não substitui o ensaio de
capacidade.

Para incluir automaticamente as rotas autenticadas de compras, ingressos,
painel e check-in com as contas descartáveis configuradas no Sandbox, use:

```powershell
.\scripts\run-k6-sandbox.ps1 -Profile smoke -ChampionshipId <uuid-do-campeonato-sandbox>
```

O executor gera sessões efêmeras por magic link administrativo, passa os
cookies somente na memória do processo e nunca os imprime ou grava. O script
desativa redirects nas rotas privadas e exige HTTP 200, impedindo que um
redirecionamento silencioso para login conte como sucesso. Depois de validar o
perfil curto, troque para `-Profile capacity` para executar os 17 minutos.

O perfil sobe 5, 10 e 25 usuários virtuais, mantém 25 por cinco minutos e faz
redução controlada. Cada rota é identificada por `flow` e `route`, permitindo
separar navegação pública, campeonato e sessão autenticada. Pare imediatamente
se houver impacto no Sandbox, erros financeiros ou degradação externa.

## Critério inicial

- menos de 1% de requisições com erro;
- p95 abaixo de 1,5 s;
- nenhuma duplicação financeira ou operacional;
- conferir Vercel, Supabase e logs após o ensaio.

Registre URL, data/hora, resultado do k6 e qualquer alerta em `PENDENCIAS-V1.md`.

## Evidência de 01/10/2026

- Preview: `rank-ftv-git-sandbox-homologacao-devcarlosrochas-projects.vercel.app`.
- Escopo: navegação pública, detalhes do campeonato, categorias, chaveamento,
  placar, compras, ingressos, painel, chaveamento gerencial e check-in. As
  sessões são de contas `@example.com` descartáveis; nenhuma rota mutante foi
  chamada.
- Smoke autenticado: 32/32 checks, 0% de falhas, p95 geral de 773,76 ms.
- Capacidade autenticada: 17 minutos; 25 VUs máximos, cinco minutos
  sustentados; 6.497 requisições, 6,37 RPS, 0% de erro e zero interrupções.
  Média 420,71 ms, p95 669,19 ms e máximo 2,27 s.
- Por fluxo no perfil de capacidade: p95 público 448,08 ms; campeonato
  411,58 ms; autenticado 756,81 ms. Todos ficaram abaixo do limite de 1,5 s.
- O relatório estruturado ficou em `.codex-artifacts/` e o resumo permanente
  em `REGISTRO-EXECUCOES.md`.

## Evidência de 29/09/2026

- Preview: `rank-5b2dt9r7m-devcarlosrochas-projects.vercel.app`.
- Perfil: 17 minutos, rampa de 5, 10 e 25 usuários virtuais, com cinco minutos
  sustentados no pico e redução controlada.
- Resultado: 6.715 requisições e checks aprovados; 0 falhas e 0 interrupções.
- Vazão: 6,57 requisições/s.
- Duração: média 356,36 ms; p90 427,01 ms; p95 463,65 ms.
- Outlier máximo: 26,74 s em uma requisição, sem impacto no p95 nem erro HTTP.
- Tráfego recebido: 266 MB.

Os limites HTTP e a cobertura autenticada passaram em 01/10. Antes de
considerar o P0 encerrado, correlacionar os outliers com métricas da Vercel e
do Supabase, investigar banco/locks/serviços externos e executar um teste
pequeno supervisionado em produção.
