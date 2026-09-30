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

## Evidência autenticada de 30/09/2026

- Preview: `rank-hd1go3z38-devcarlosrochas-projects.vercel.app`.
- Perfil: 17 minutos, até 25 usuários virtuais, cinco minutos sustentados no
  pico e redução controlada.
- Resultado: 6.297 requisições e iterações; 11.320 de 11.335 checks aprovados
  (99,86%); 15 falhas de check e nenhuma iteração interrompida.
- Vazão: 6,17 requisições/s; erro HTTP de 0,23% (15/6.297), abaixo do limite de
  1%.
- Duração HTTP: média 503,14 ms; mediana 472,88 ms; p90 659,06 ms; p95
  752,44 ms; máximo 3,63 s.
- p95 por fluxo: público 471,69 ms; ingresso privado 657,14 ms; operação de
  campeonato 726,67 ms; atleta 779,50 ms; painel do organizador 941,58 ms.
- Tráfego: 269 MB recebidos e 8,2 MB enviados.

Todos os thresholds passaram. O máximo histórico de 26,74 s não se repetiu no
ensaio autenticado. As 15 falhas ficaram distribuídas entre ingresso privado
(8), atleta (3), painel do organizador (2) e campeonato (2), sem concentração
que ultrapassasse o orçamento de erro e sem duplicação financeira ou
operacional. A correlação de banco deve usar o workflow somente leitura
`production-performance-audit.yml`; o teste transacional em produção continua
supervisionado e não faz parte deste ensaio.
