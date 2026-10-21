# Mapa do projeto RankFTV

O mapa indica onde iniciar. Ele não substitui `rg`, leitura do arquivo real,
imports, chamadores e testes.

## Diretórios

| Caminho | Responsabilidade |
| --- | --- |
| `app/` | Rotas, layouts, Server Components, Server Actions e APIs do App Router |
| `components/` | Interface agrupada por domínio |
| `lib/` | Negócio, integrações, validação, segurança e testes |
| `lib/supabase/` | Clientes, consultas e tipos do Supabase |
| `supabase/` | SQL incremental, RLS, RPCs, índices e hardening |
| `supabase/manual-tests/` | Checks somente leitura, seeds e limpezas controladas |
| `e2e/` | Playwright; cenários mutantes exigem Sandbox e flags explícitas |
| `scripts/` | Operações locais/CI, smoke, backup e auditoria |
| `.github/workflows/` | CI, conciliação, notificações e backups |
| `public/` | Ativos públicos versionados |
| `docs/` | Procedimentos e referências especializadas |

## Funcionalidades

| Área | Entrada | Regras/dados e testes |
| --- | --- | --- |
| Shell/navegação | `app/layout.tsx`, `components/shell/`, `components/navbar/` | `components/shell/app-nav-items.ts`, testes mobile |
| Descoberta | `app/page.tsx`, `app/campeonatos/`, `components/home/` | consultas Supabase e testes `championship-discovery*` |
| Auth/perfil | `app/login/`, `app/cadastro/`, `app/recuperar-senha/`, `app/perfil/` | `lib/auth-*`, `lib/cpf.ts`, testes de schemas/erros |
| Inscrição/compra | `app/campeonatos/[id]/inscrever/`, `comprar/`, `pagamento/` | `lib/pagamento-inscricao.ts`, `lib/athlete-*`, `lib/checkout-*`, testes financeiros |
| Plateia | `app/campeonatos/[id]/plateia/`, `components/plateia/` | tabelas/RPCs `spectator_*`, testes de checkout/inventário |
| Credenciais | `app/meus-ingressos/`, `app/minhas-compras/` | `lib/ticket-*`, `lib/otp.ts`, testes de propriedade/entrega |
| Organizador | `app/painel/`, `components/painel/` | propriedade no servidor, E2E e testes por recurso |
| Financeiro | `app/painel/campeonatos/[id]/financeiro/` | `lib/repasse.ts`, `lib/financial-*`, SQLs e testes da carteira |
| Check-in/staff | `app/staff/`, `app/actions/checkin.ts`, `components/checkin/` | `lib/checkin-*`, permissões e E2E |
| Chaveamento | rotas/componentes `chaveamento` | `lib/bracket-*`, `lib/double-elimination.ts`, testes de progressão |
| Arena Beta | `app/arena/`, `app/arenas/`, `components/arena/` | `lib/arena-*`; fora da V1 comercial |
| Administração | `app/admin/`, `components/admin/` | roles `admin`/`ceo`, actions e ferramentas pessoais |
| Notificações | `app/notificacoes/`, `lib/email/`, `lib/*notifications*` | Resend, filas, crons e testes de retry/claim |
| Webhook Asaas | `app/api/webhooks/asaas/route.ts` | `lib/asaas-*`, estado de provedor, testes de repetição/ordem |
| Crons | `app/api/cron/` | conciliação, alertas, retenção, workflows e autenticação |
| Segurança HTTP | `proxy.ts`, `next.config.ts`, `lib/security-headers.ts` | CSP, nonce, headers, rate limit e testes de fronteira |
| Ferramentas pessoais | rotas em `/admin` e módulos `performance`/`estudos` | acesso do dono; não alterar o percentual da V1 |
| Central de Evolução | `app/admin/evolucao/`, `components/evolution/` | `lib/evolution/`, snapshots em `data/evolution/`, SQL `supabase/evolution-center.sql`; não reutiliza Life OS |

## Carteira do organizador

Esses arquivos **não existem neste checkout principal**. Em 20/10/2026 eles
estão no worktree irmão `C:\Users\SnyX\Documents\Projeto-RankFTV-organizer-wallet`,
branch `feat/organizer-wallet`, PR #33. Antes de abrir qualquer caminho abaixo,
trocar para esse worktree e conferir branch/status. Ler em ordem:

1. `supabase/organizer-wallet-withdrawals.sql`;
2. `supabase/organizer-wallet-selected-withdrawals.sql`;
3. `supabase/organizer-wallet-financial-hardening.sql`;
4. `app/painel/campeonatos/[id]/financeiro/actions.ts`;
5. `app/painel/campeonatos/[id]/financeiro/page.tsx`;
6. `components/painel/FinanceiroConteudoClient.tsx`;
7. `app/api/webhooks/asaas/route.ts`;
8. `app/api/cron/repasse-liquidacao/route.ts`;
9. `supabase/manual-tests/organizer-wallet-check.sql`;
10. seeds/cleanup da carteira em `supabase/manual-tests/`.

O navegador nunca informa o total confiável do saque.

## Controle na raiz

| Arquivo | Uso |
| --- | --- |
| `AGENTS.md` | Regras obrigatórias e regra especial da versão do Next.js |
| `CLAUDE.md` | Bootstrap para ferramentas Claude compatíveis |
| `package.json` | Versões e comandos reais |
| `proxy.ts` | Sessão, autorização de rotas e headers |
| `next.config.ts` | Configuração do Next.js |
| `vercel.json` | Agendamentos Vercel |
| `.env.example` | Nomes públicos; nunca valores reais |

## Arquivo não listado

1. Use `rg` para rota, tabela, RPC, componente ou mensagem.
2. Siga imports e chamadores.
3. Localize testes do mesmo domínio.
4. Em SQL, encontre redefinições posteriores da mesma função/tabela.
5. Confira o diff para não sobrescrever trabalho do usuário.
