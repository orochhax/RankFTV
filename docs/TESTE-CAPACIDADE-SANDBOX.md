# Teste de capacidade — Sandbox

Este ensaio nunca deve usar Production nem executar mutações. O wrapper gera
sessões temporárias de atleta e organizador diretamente no Supabase Sandbox,
executa somente leituras e apaga o arquivo de sessão ao terminar. Tanto o
preparador quanto o k6 recusam URLs que não sejam Preview/Sandbox da RankFTV.

## Pré-requisitos

- Fluxos críticos do Sandbox aprovados.
- k6 instalado localmente.
- Um Preview público e estável da branch de homologação.

## Execução

```powershell
.\scripts\run-k6-sandbox.ps1
```

Para validar configuração e autenticação em cerca de 20 segundos antes da
carga completa:

```powershell
.\scripts\run-k6-sandbox.ps1 -Quick
```

O perfil sobe 5, 10 e 25 usuários virtuais, mantém 25 por cinco minutos e faz
redução controlada. Pare imediatamente se houver impacto no Sandbox, erros
financeiros ou degradação externa.

## Critério inicial

- menos de 1% de requisições com erro;
- p95 de API abaixo de 1,5 s;
- p95 de páginas públicas e operacionais abaixo de 2,5–3 s;
- nenhuma duplicação financeira ou operacional;
- conferir Vercel, Supabase e logs após o ensaio.

Registre URL, data/hora, resultado do k6 e qualquer alerta em `PENDENCIAS-V1.md`.

## Cobertura

- navegação pública e lista de campeonatos;
- login/sessão SSR de atleta e organizador;
- perfil, inscrições, compras e ingressos do atleta;
- painel e campeonatos do organizador;
- detalhe, chaveamento e placar ao vivo do campeonato;
- consulta privada do ingresso/QR por ID e token de um registro sintético do
  Sandbox, respeitando o rate limit real.

## Evidência de 29/09/2026

- Preview: `rank-5b2dt9r7m-devcarlosrochas-projects.vercel.app`.
- Perfil: 17 minutos, rampa de 5, 10 e 25 usuários virtuais, com cinco minutos
  sustentados no pico e redução controlada.
- Resultado: 6.715 requisições e checks aprovados; 0 falhas e 0 interrupções.
- Vazão: 6,57 requisições/s.
- Duração: média 356,36 ms; p90 427,01 ms; p95 463,65 ms.
- Outlier máximo: 26,74 s em uma requisição, sem impacto no p95 nem erro HTTP.
- Tráfego recebido: 266 MB.

Os limites HTTP passaram. Antes de considerar o P0 encerrado, correlacionar o
outlier com métricas da Vercel e do Supabase, ampliar a cobertura autenticada e
operacional e executar um teste pequeno supervisionado em produção.
