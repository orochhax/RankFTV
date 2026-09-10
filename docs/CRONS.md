# Crons do RankFTV

Todas as rotas exigem `Authorization: Bearer <CRON_SECRET>` e usam comparação
centralizada em tempo constante. A Vercel chama os agendamentos com `GET`.

| Rota | Vercel GET | POST externo |
| --- | --- | --- |
| `/api/cron/repasse-liquidacao` | Sim | Não |
| `/api/cron/financial-reconciliation` | Sim | Sim, para a rotina frequente do GitHub Actions |
| `/api/cron/data-retention` | Sim | Não |
| `/api/cron/life-os-daily-analysis` | Sim | Não |
| `/api/cron/operational-alerts` | Sim | Sim, para operação manual autenticada |
| `/api/cron/championship-change-notifications` | Sim | Sim, a cada 15 minutos pelo GitHub Actions e para operação manual autenticada |

O token deve existir separadamente nos ambientes que chamam essas rotas. Uma
requisição sem segredo, com esquema diferente de `Bearer` ou com valor incorreto
recebe HTTP 401.
