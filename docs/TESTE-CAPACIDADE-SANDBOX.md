# Teste de capacidade — Sandbox

Este ensaio nunca deve usar Production nem executar mutações. O script usa só
GETs públicos e recusa URLs que não sejam Preview/Sandbox da RankFTV.

## Pré-requisitos

- Fluxos críticos do Sandbox aprovados.
- k6 instalado localmente.
- Um Preview público e estável da branch de homologação.

## Execução

```powershell
k6 run -e BASE_URL=https://rank-ftv-git-sandbox-homologacao-devcarlosrochas-projects.vercel.app scripts/k6-sandbox-smoke.js
```

O perfil sobe 5, 10 e 25 usuários virtuais, mantém 25 por cinco minutos e faz
redução controlada. Pare imediatamente se houver impacto no Sandbox, erros
financeiros ou degradação externa.

## Critério inicial

- menos de 1% de requisições com erro;
- p95 abaixo de 1,5 s;
- nenhuma duplicação financeira ou operacional;
- conferir Vercel, Supabase e logs após o ensaio.

Registre URL, data/hora, resultado do k6 e qualquer alerta em `PENDENCIAS-V1.md`.
