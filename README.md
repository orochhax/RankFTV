# RankFTV

Plataforma web responsiva para organizar campeonatos de futevôlei e operar arenas. Na mesma conta, uma pessoa pode participar como atleta, organizar campeonatos, administrar arenas ou atuar como staff, conforme suas permissões.

O produto reúne descoberta e inscrição em campeonatos, pagamentos, ingressos e credenciais por QR Code, check-in, chaveamento, financeiro e repasses, além de agenda de aulas, planos, mensalidades, diárias e aluguel de quadras para arenas.

## Documentação

- [DOCUMENTACAO.md](DOCUMENTACAO.md): fonte técnica atual sobre rotas, componentes, dados e fluxos.
- [AUDITORIA-PRODUCAO.md](AUDITORIA-PRODUCAO.md): segurança, pendências externas e prontidão para produção.
- [PLANO-PIVO-ARENA.md](PLANO-PIVO-ARENA.md): registro histórico do pivô de produto; não deve substituir a documentação atual.

Antes de alterar código Next.js, leia também [AGENTS.md](AGENTS.md) e a documentação desta versão instalada em `node_modules/next/dist/docs/`.

## Stack

Versões declaradas em `package.json`:

| Camada | Pacote | Versão |
| --- | --- | --- |
| Framework | `next` | `16.2.10` |
| Interface | `react` / `react-dom` | `19.2.4` |
| Linguagem | `typescript` | `^5` |
| Estilos | `tailwindcss` / `@tailwindcss/postcss` | `^4` |
| Supabase SSR | `@supabase/ssr` | `^0.12.0` |
| Supabase SDK | `@supabase/supabase-js` | `^2.108.2` |
| Ícones | `lucide-react` | `^1.20.0` |
| Gráficos | `recharts` | `^3.9.1` |
| QR Code | `qrcode` / `@types/qrcode` | `^1.5.4` / `^1.5.6` |
| PDF | `jspdf` | `^4.2.1` |
| E-mail | `resend` | `^6.14.0` |
| Proteção de módulos do servidor | `server-only` | `^0.0.1` |
| Testes TypeScript | `tsx` | `^4.23.1` |
| Lint | `eslint` / `eslint-config-next` | `^9` / `16.2.10` |
| Tipos | `@types/node` / `@types/react` / `@types/react-dom` | `^20` / `^19` / `^19` |

O projeto força `postcss` `8.5.10` para o Next.js por meio de `overrides`. O lockfile usa o formato v3 do npm.

Integrações externas:

- Supabase: Postgres, Auth, Storage, RLS e RPCs.
- Asaas: Pix, cartão, assinaturas, webhooks e repasses.
- Resend: e-mails transacionais.
- Vercel: deploy e cron diário de liquidação.

## Requisitos

- Node.js `>= 20.9.0`, conforme o requisito do Next.js instalado.
- npm compatível com `package-lock.json` v3.
- Projeto Supabase com o schema e as políticas exigidas pelo código.
- Conta Asaas Sandbox para desenvolvimento; conta verificada e credenciais próprias para produção.
- Conta Resend e domínio verificado para envio real de e-mails.
- Para produção, um domínio HTTPS e uma plataforma capaz de executar o cron definido em `vercel.json`.

## Instalação local

```bash
git clone https://github.com/orochhax/RankFTV.git
cd RankFTV
npm ci
npm run dev
```

Antes de iniciar o servidor, crie `.env.local` com as variáveis necessárias. Abra [http://localhost:3000](http://localhost:3000) depois que o Next.js estiver pronto.

Os arquivos em `supabase/` são scripts incrementais e operacionais, não uma migração única para ser executada inteira e sem revisão. Em uma base nova ou já existente, confira a ordem e o estado esperado em [DOCUMENTACAO.md](DOCUMENTACAO.md) e [AUDITORIA-PRODUCAO.md](AUDITORIA-PRODUCAO.md).

## Variáveis de ambiente

Nunca versione `.env.local`. Variáveis sem o prefixo `NEXT_PUBLIC_` são exclusivas do servidor e não podem ser expostas em Client Components.

| Nome | Escopo | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Público | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público | Chave pública/anon do Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor | Operações administrativas que ignoram RLS. |
| `NEXT_PUBLIC_BASE_URL` | Público | URL canônica usada em links e callbacks. |
| `ADMIN_EMAIL` | Servidor | Identifica a única conta administrativa principal. |
| `ASAAS_BASE_URL` | Servidor | Endpoint da API Asaas do ambiente atual. |
| `ASAAS_API_KEY` | Servidor | Credencial da API Asaas. |
| `ASAAS_WEBHOOK_TOKEN` | Servidor | Autentica os webhooks recebidos do Asaas. |
| `CRON_SECRET` | Servidor | Protege `/api/cron/repasse-liquidacao`. |
| `RESEND_API_KEY` | Servidor | Envio de e-mails transacionais. |
| `RESEND_FROM_EMAIL` | Servidor | Remetente em domínio verificado; obrigatório para envio real. |
| `ALLOW_TUNNEL_ORIGIN` | Desenvolvimento | Libera origem temporária do Cloudflare Tunnel; não definir em produção. |
| `ASAAS_WALLET_ID` | Servidor/legado | Existe no ambiente local, mas não há uso direto encontrado no código atual; confirme antes de mantê-la em produção. |

Em produção, todas as variáveis aplicáveis devem ser cadastradas também no provedor de deploy. Não reutilize credenciais Sandbox no ambiente real.

## Scripts

| Comando | Função |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento do Next.js. |
| `npm run build` | Gera o build de produção. |
| `npm run start` | Inicia o build de produção já gerado. |
| `npm run lint` | Executa o ESLint. |
| `npm test` | Executa os testes `lib/**/*.test.ts` com o runner nativo do Node e `tsx`. |

A checagem de tipos é executada separadamente com `npx tsc --noEmit`.

## Arquitetura

```text
app/           rotas, layouts, Server Components, Server Actions e APIs
components/    componentes visuais, shells e navegação
lib/           Supabase, pagamentos, e-mail e regras de negócio
supabase/      SQLs incrementais, hardening, RLS, funções e manutenção
scripts/       rotinas operacionais controladas
public/        ativos públicos
```

O projeto usa o App Router do Next.js. O layout raiz resolve o usuário, suas permissões e a contagem de notificações no servidor; o conteúdo é entregue ao shell responsivo. Acesso administrativo e mutações sensíveis continuam sendo validados no servidor e no banco, não apenas escondidos na interface.

### Navegação atual

- Desktop: `AppShell` mantém uma sidebar preta, estreita e persistente durante a navegação client-side. Ela ocupa a altura da viewport, mostra apenas itens permitidos, usa um indicador azul animado para a rota ativa e possui uma luz azul vertical na borda direita. O sino abre uma prévia das notificações sem sair da página; “Ver todas” leva ao feed completo.
- Mobile: `BottomNav` mantém a navegação principal em uma pill flutuante inferior, com o item ativo destacado em azul. O comportamento e a hierarquia mobile são independentes da sidebar desktop.
- Arena: as rotas do organizador reutilizam o shell principal no desktop e acrescentam a navegação contextual de `ArenaShell`; no mobile, usam header e drawer próprios para a gestão da arena.
- Rotas focadas: autenticação, convite, termos e determinados fluxos de inscrição/pagamento usam `FocusedLayout`, sem a navegação global, para reduzir distrações.
- URLs continuam independentes e navegáveis diretamente. Links internos usam a navegação client-side do Next.js, preservando histórico, voltar/avançar e atualização da rota.

Os itens globais e suas regras ficam principalmente em `components/shell/app-nav-items.ts`; a sidebar está em `components/shell/DesktopSidebar.tsx`, a pill mobile em `components/navbar/BottomNav.tsx` e a navegação da arena em `components/arena/ArenaShell.tsx`.

## Hardening do Supabase

O responsável pelo projeto informou que as duas etapas abaixo já foram executadas no Supabase:

1. `supabase/production-security-hardening.sql`
2. `supabase/production-security-hardening-after-deploy.sql`

Esse registro operacional não substitui a verificação da base. Antes de abrir produção, confirme no projeto Supabase correto:

- `profiles_private` contém `data_nascimento` e `questionario`.
- `profiles` não contém mais esses dois campos pessoais.
- `anon` só consegue selecionar as colunas públicas permitidas de `profiles`.
- `authenticated` não consegue alterar diretamente `role`, `rating`, pagamentos, credenciais ou dados de terceiros.
- `arenas.invite_code` não aparece nas consultas públicas.
- convites, check-in, uploads, pagamentos e operações de staff continuam funcionando pelas rotas autorizadas.
- o cache de schema do PostgREST foi recarregado e não há erro de coluna/permissão nos logs.

Para um ambiente novo, a ordem obrigatória permanece: backup, etapa 1, deploy do código compatível até ficar `Ready`, etapa 2 e testes de permissão. Não execute novamente em produção apenas para “garantir” sem antes conferir o estado e ter um snapshot recuperável.

Veja a sequência completa, as correções e os riscos residuais em [AUDITORIA-PRODUCAO.md](AUDITORIA-PRODUCAO.md).

## Checklist de deploy

### Código e banco

- [ ] Revisar o diff e garantir que nenhum segredo, mock ou dado pessoal entrou no Git.
- [ ] Criar snapshot/backup recuperável do Supabase.
- [ ] Confirmar as duas etapas de hardening e testar RLS com `anon`, usuário comum, organizador, staff e `service_role`.
- [ ] Executar `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm test` e `npm run build`.
- [ ] Executar `npm audit --omit=dev` e avaliar qualquer nova ocorrência.

### Serviços externos

- [ ] Definir `NEXT_PUBLIC_BASE_URL` com o domínio HTTPS final.
- [ ] Revisar Site URL e Redirect URLs no Supabase Auth; configurar política de senha, proteção anti-bot/CAPTCHA e MFA da conta admin.
- [ ] Confirmar que a conta principal usa ADMIN_EMAIL e possui profiles.role = ceo.
- [ ] Trocar Asaas Sandbox por produção com credenciais próprias.
- [ ] Cadastrar os webhooks Asaas no domínio final e validar token, eventos, repetição e estorno.
- [ ] Verificar domínio e remetente no Resend, incluindo SPF e DKIM.
- [ ] Confirmar o cron diário da Vercel e alertas para falha de liquidação/repasse.
- [ ] Ativar backups/PITR, logs, monitoramento e conciliação financeira.

### Homologação

- [ ] Testar cadastro, login, recuperação, perfil e permissões em desktop e mobile.
- [ ] Testar campeonato, convite de dupla, inscrição, Pix, cartão recusado/aprovado, QR, check-in, estorno e repasse.
- [ ] Testar arena, aluno, aula, presença, mensalidade, diária e aluguel, incluindo a taxa de serviço em cada método.
- [ ] Fazer uma transação real controlada de baixo valor antes da abertura pública.
- [ ] Validar páginas públicas, links diretos, voltar/avançar, notificações e rotas focadas.
- [ ] Publicar aviso de privacidade/LGPD e definir canal e processo de resposta a incidentes.

A assinatura paga da própria plataforma para donos de arena, a uniformização da
taxa de serviço da Arena e da regra Admin, a homologação financeira real, a
proteção persistente contra determinadas repetições de cobrança, CSP com nonce
e a suíte E2E ainda exigem decisão ou validação antes de considerar a operação
integralmente pronta. Consulte
[AUDITORIA-PRODUCAO.md](AUDITORIA-PRODUCAO.md) para o estado detalhado.
