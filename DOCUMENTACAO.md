# Documentação do RankFTV

> Documento de referência de **como o app funciona por inteiro**: cada página, o que
> ela faz e como se conecta com as outras. Mantido em português pra leitura rápida.
>
> Para o "porquê" do produto (visão, regras de negócio, roadmap) veja [ftv.md](ftv.md).
> Este aqui é o "como está construído hoje".

---

## 1. Visão geral

**RankFTV** é uma plataforma web (só site, responsivo — sem app nativo) para
**organização de campeonatos de futevôlei**. Três grandes usos, todos na mesma conta:

- **Atleta** — descobre campeonatos, inscreve a dupla, paga, recebe credencial (QR), acompanha ranking.
- **Organizador** — cria/gerencia campeonatos, recebe inscrições pagas com repasse automático, faz check-in, controla camisas, financeiro.
- **Admin** (só o dono da plataforma) — gerencia todos os campeonatos, taxas, destaques e usuários.

Não existe "papel" escolhido no cadastro: qualquer conta pode ser atleta e organizador ao mesmo tempo.

### Como a plataforma ganha dinheiro
Uma **taxa por inscrição paga**, descontada do repasse ao organizador (o atleta paga só o valor da inscrição). Há dois planos de taxa por campeonato: **Padrão** e **Elite** (taxas menores, ativação de R$ 178 — ver seção 8).

---

## 2. Stack e integrações

| Camada | Tecnologia |
|---|---|
| Front + Back | **Next.js** (App Router, Server Components + Server Actions) + TypeScript + Tailwind |
| Banco + Auth + Storage | **Supabase** (Postgres, RLS) |
| Pagamento + split | **Asaas** (cobrança Pix/cartão + transferência Pix de repasse) |
| E-mail transacional | **Resend** (best-effort, nunca bloqueia o fluxo) |
| Deploy + Cron | **Vercel** (cron diário de repasse de cartão) |

**Detalhes não óbvios de infra** (chaves novas do Supabase, `proxy.ts` no lugar de `middleware.ts`, grants do `service_role`) estão na memória do projeto, não aqui.

### Variáveis de ambiente principais (`.env.local` + Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`, anon key, `SUPABASE_SERVICE_ROLE_KEY` (`sb_secret_…`)
- `ASAAS_BASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`
- `RESEND_API_KEY`, `NEXT_PUBLIC_BASE_URL`
- `ADMIN_EMAIL` (quem é admin), `CRON_SECRET` (protege o cron de repasse)

---

## 3. Mapa de navegação (navbar)

A navbar aparece **sempre**, inclusive para visitante. Mesmos itens no topo (desktop) e numa
pílula flutuante embaixo (mobile). Definida em [components/navbar/nav-items.ts](components/navbar/nav-items.ts):

| Item | Rota | Quem vê |
|---|---|---|
| Home | `/` | todos |
| Agenda | `/agenda` | todos |
| Campeonatos | `/campeonatos` | todos |
| Rank | `/rank` | todos |
| Painel | `/painel` | todos (vira landing de conversão pra quem não organiza) |
| Staff | `/staff` | só quem é staff aceito de algum campeonato |

Itens extras (fora da pílula), em [TopNav](components/navbar/TopNav.tsx) / [BottomNav](components/navbar/BottomNav.tsx):
- **Sino 🔔** → `/notificacoes` (com badge de não-lidas; só logado)
- **Engrenagem ⚙️** → `/perfil` (só desktop)
- **Chave inglesa 🔧 (âmbar)** → `/admin` (só admin)
- **Entrar/Sair**

O [layout raiz](app/layout.tsx) carrega o usuário uma vez e calcula: nome/@, se é staff, se é
admin (`email === ADMIN_EMAIL`) e a contagem do sino (convites de staff pendentes + convites de
dupla pendentes + notificações não lidas).

---

## 4. Áreas do app

```
PÚBLICO / ATLETA            PAINEL (organizador)        STAFF              ADMIN
─────────────────          ─────────────────────       ──────────        ──────────
/                          /painel                     /staff            /admin
/agenda                    /painel/geral               /staff/[id]       /admin/campeonatos
/campeonatos               /painel/novo-campeonato        ├ /qrcode      /admin/destaques
/campeonatos/[id]          /painel/paginas                ├ /inscricoes  /admin/taxas
/campeonatos/[id]/inscrever  /painel/campeonatos/[id]     └ /chaveamento /admin/usuarios
/campeonatos/[id]/pagamento/…   ├ /editar  /publicar
/campeonatos/[id]/chaveamento   ├ /inscricoes /financeiro
/campeonatos/paginas/[handle]   ├ /checkin /camisas
/rank                           ├ /chaveamento /equipe
/atletas/[username]             ├ /vinculacoes /criado
/perfil (+ sub-rotas)
/minhas-inscricoes (+ [champId])
/notificacoes
/cadastro · /login · /auth/callback
```

---

## 5. Modelo de dados (tabelas principais)

> Toda referência interna usa o **`id`** (uuid), nunca o `@username` (que pode mudar no futuro).

- **profiles** — `id`, `nome`, `username` (@handle único), `bio`, `foto_url`, `rating`, `genero` (`masculino`/`feminino`), `questionario` (jsonb das 5 perguntas), `tamanho_camisa`. *Dados públicos.*
- **profiles_private** — `user_id`, `cpf`, `telefone`. *RLS estrita: só o dono lê (`user_id = auth.uid()`).*
- **organizer_accounts** — `user_id`, `cpf_cnpj`, `chave_pix`, `habilitado`. Existe quando o usuário ativa o modo organizador.
- **championships** — `id`, `organizador_id`, `nome`, `descricao`, `regulamento`, datas (`data_inicio/fim`, `prevenda_*`, `inscricoes_*`), `cidade`, `estado`, `local`, `status`, `taxa_plataforma`, `banner_url`, `live_url`, `tier` + `tier_quiz`, **`is_elite`** + **`premium_fee_pendente`**, `page_id`.
- **championship_categories** — `id`, `championship_id`, `nome`, `genero` (`masculino`/`feminino`/`mista`), `valor_inscricao`, `corte_rating_min/max`, `max_duplas`.
- **teams** (duplas) — `id`, `championship_id`, `category_id`, `atleta1_id`, `atleta2_id`, `parceiro_username`, `status` (`convite_pendente`/`confirmado`/`cancelado`), `sandbagging_flag`, `rating_dupla`.
- **registrations** (inscrições) — `id`, `team_id`, `championship_id`, `category_id`, `valor`, `status_pagamento` (`pendente`/`pago`/`estornado`), `billing_type`, `asaas_payment_id`, `pix_copy_paste`, `pix_qr_code_base64`, `invoice_url`, **repasse**: `repasse_status`, `repasse_data_prevista`, `repasse_transfer_id`, `repasse_erro`, `elite_fee_coletada`.
- **credentials** — `id`, `user_id`, `championship_id`, `role`, `qr_token`, `checked_in`, `checkin_at`.
- **bracket_matches** — chaveamento (confrontos, placar, vencedor) por categoria. *(Fase 2)*
- **championship_staff** — `id`, `championship_id`, `user_id`, `invited_by`, `status` (`pendente`/`aceito`), permissões `can_qrcode`/`can_inscricoes`/`can_chaveamento`.
- **pages** — "páginas" de circuito: `id`, `owner_id`, `nome`, `handle`, `descricao`, banner, `avatar_url`, `social_links`. Agrupam várias edições/etapas.
- **page_followers** — quem segue cada página (notifica em nova edição).
- **page_championship_invites** — convite pra vincular um campeonato como etapa de uma página.
- **notifications** — feed do sininho (`user_id`, `lida`, …).
- **ranking_entries** — histórico/pontos do atleta na Liga (alimenta perfil e rank).
- **conquistas** — badges do atleta (`titulo`, `icone`, `cor`, `data_conquistada`).
- **shirt_production** — produção de camisas por tamanho.
- **platform_config** (linha única `id=1`) — taxas Padrão e Premium, `atleta_credito_7a12_extra`, `destaques_ids` (3 campeonatos fixados na Home).
- **rating_history** — evolução do rating ao longo do tempo. *(Fase 2)*

---

## 6. Páginas públicas / do atleta

### `/` — Home ([app/page.tsx](app/page.tsx))
- **Visitante:** hero com CTA "Criar conta grátis" → `/cadastro` e "Entrar" → `/login`.
- **Logado:** saudação + **card "Meu desempenho"** (conquistas, posição no rank, nível, sparkline de evolução). Usuário novo vê banner de onboarding → `/campeonatos`.
- **Carrossel de destaques** (os 3 de `platform_config.destaques_ids`, ou os abertos mais recentes) → cada card abre `/campeonatos/[id]`.
- **Seção "Ao vivo agora"** (campeonatos `em_andamento`) → `/campeonatos/[id]`.
- **Conexões:** → `/campeonatos`, `/campeonatos/[id]`, `/cadastro`, `/login`, `/notificacoes` (hambúrguer no mobile), `/perfil`.

### `/agenda` — Agenda ([app/agenda/page.tsx](app/agenda/page.tsx))
- Calendário do mês + lista de eventos (só dias com algo). Hoje alimentada por mock ([lib/agenda.ts](lib/agenda.ts) / [lib/mock/agenda-events.ts](lib/mock/agenda-events.ts)).

### `/campeonatos` — Lista/busca ([app/campeonatos/page.tsx](app/campeonatos/page.tsx))
- Topo: **carrossel de Páginas** (circuitos) a seguir → `/campeonatos/paginas/[handle]`; "Ver mais" → `/campeonatos/paginas`.
- Filtros por **estado** e **categoria** (form GET, funciona sem JS → continua Server Component).
- Lista de cards (só publicados, não rascunho). **Inscrições abertas vêm primeiro.** Cada card → `/campeonatos/[id]`.
- **Conexões:** → `/campeonatos/[id]`, `/campeonatos/paginas`, `/campeonatos/paginas/[handle]`.

### `/campeonatos/[id]` — Detalhe do campeonato ([app/campeonatos/[id]/page.tsx](app/campeonatos/[id]/page.tsx))
O coração da experiência do atleta. Mostra:
- Banner, nome, status, datas, local; botões "Ver chaveamento" (→ `/campeonatos/[id]/chaveamento`, se já existe) e "Ver ao vivo" (link externo `live_url`).
- **Cronograma** (pré-venda / inscrições / evento).
- **Regulamento**.
- **Categorias e inscrição** — cada categoria mostra valor e "Pontuação mínima". A categoria **recomendada pelo motor** (com base no rating + gênero do atleta logado) ganha selo verde. Botão de inscrição → `/campeonatos/[id]/inscrever` (via [InscricaoButton](components/campeonatos/InscricaoButton.tsx)). Aviso âmbar se o campeonato não tem categoria do gênero do atleta.
- **Duplas inscritas** (só pagas) — cada atleta → `/atletas/[username]`.
- **Conexões:** ← Home, Campeonatos, página de circuito, busca. → `/inscrever`, `/chaveamento`, `/atletas/[username]`.

### `/campeonatos/[id]/inscrever` — Inscrição da dupla ([page](app/campeonatos/[id]/inscrever/page.tsx) · [actions](app/campeonatos/[id]/inscrever/actions.ts))
Fluxo central da Fase 1. O atleta:
1. Escolhe categoria, informa **@ do parceiro** (busca por nome via [UserSearchInput](components/ui/UserSearchInput.tsx) → `/api/users/search`), tamanho de camisa e, se pago, **CPF** + método (Pix/cartão).
2. O motor calcula o rating da dupla e avisa se há **sandbagging** ou categoria acima do nível.
3. `inscreverDupla` valida (inscrições abertas, prazo, não inscrito ainda, chave Pix do organizador existe), salva tamanho (público) e CPF (privado), cria **team** + **registration**.
   - **Grátis sem parceiro** → confirma na hora, gera credencial, e-mail de confirmação, vai pra `/minhas-inscricoes/[champId]`.
   - **Com parceiro** → manda convite por e-mail; parceiro aceita no perfil dele.
   - **Paga** → cria cobrança no Asaas e vai pra `/pagamento/[registrationId]`.
- **Conexões:** ← detalhe do campeonato. → `/pagamento/[registrationId]` ou `/minhas-inscricoes/[champId]`.

### `/campeonatos/[id]/pagamento/[registrationId]` — Pagamento ([page](app/campeonatos/[id]/pagamento/[registrationId]/page.tsx) · [actions](app/campeonatos/[id]/pagamento/[registrationId]/actions.ts))
- Mostra **QR Code Pix + copia-e-cola** (gerados na inscrição) ou formulário de **cartão** ([PaymentUI](components/pagamento/PaymentUI.tsx) / `pagarComCartao`).
- Quando o pagamento confirma (via **webhook do Asaas**, ver seção 8), a tela vira "Pagamento confirmado!".
- **Conexões:** ← inscrição. → `/minhas-inscricoes`.

### `/campeonatos/[id]/chaveamento` — Chaveamento público ([app/campeonatos/[id]/chaveamento/page.tsx](app/campeonatos/[id]/chaveamento/page.tsx))
- Visualização da chave/resultados ([BracketView](components/chaveamento/BracketView.tsx)). Só aparece quando o organizador gerou a chave. *(Fase 2)*

### `/campeonatos/paginas` e `/campeonatos/paginas/[handle]` — Páginas/circuitos
- Lista de páginas ([page](app/campeonatos/paginas/page.tsx)) e a **página pública de um circuito** ([handle](app/campeonatos/paginas/[handle]/page.tsx)): banner, bio, redes sociais, botão **Seguir** ([FollowPageButton](components/campeonatos/FollowPageButton.tsx)), etapa atual em destaque e lista de edições (abertas/encerradas) → cada uma abre `/campeonatos/[id]`.
- **Conexões:** ← Campeonatos, Perfil ("Páginas que sigo"). → `/campeonatos/[id]`.

### `/rank` — Ranking ([app/rank/page.tsx](app/rank/page.tsx))
- Dois eixos de filtro: **Gênero** (Masculino/Feminino) × **Tipo** (Individual/Dupla), e toggle **Liga Brasileira / Geral**.
- Hoje a "Liga" usa dados oficiais carregados via seed; o "Geral" (rank dos campeonatos da plataforma) é Fase 2.
- Cada atleta → `/atletas/[username]`.

### `/atletas/[username]` — Perfil público ([app/atletas/[username]/page.tsx](app/atletas/[username]/page.tsx))
- Foto, nome, @, nível/rating, histórico, conquistas, gráfico de evolução. Aberto a partir do Rank, das duplas inscritas e dos times.

### `/perfil` — Perfil privado ([app/perfil/page.tsx](app/perfil/page.tsx))
Hub da conta do usuário logado. Mostra:
- Cabeçalho (foto, nome, @, bio).
- **Perfil de atleta / Questionário** → se não respondeu, card azul → `/perfil/questionario`. Aviso âmbar se respondeu antes de existir a pergunta de gênero.
- **Organizador** — se `organizer_accounts.habilitado` → botão "Ir pro Painel" (`/painel`); senão → "Ativar conta de organizador" (`/perfil/ativar-organizador`).
- Conquistas, histórico, **páginas que sigo** (→ `/campeonatos/paginas/[handle]`).
- Opções: **Editar perfil** (`/perfil/editar`), **Dados da conta** (`/perfil/conta`), Sair.
- **Sub-rotas:**
  - `/perfil/questionario` — 5 perguntas + gênero → calcula `rating` ([motor-categoria](lib/motor-categoria.ts)).
  - `/perfil/editar` — nome, bio, foto.
  - `/perfil/conta` — e-mail (leitura), telefone (em `profiles_private`), trocar senha.
  - `/perfil/ativar-organizador` — CPF/CNPJ + telefone + chave Pix → cria `organizer_accounts`.
  - `/perfil/evolucao` — gráfico de evolução do rating.

### `/minhas-inscricoes` e `/minhas-inscricoes/[champId]` ([lista](app/minhas-inscricoes/page.tsx))
- Lista as duplas do atleta (como atleta1 ou atleta2), agrupadas por status do campeonato, com **status da dupla** e **status de pagamento**. Menu por item ([InscricaoMenu](components/inscricoes/InscricaoMenu.tsx)) pra pagar/cancelar.
- O **detalhe** (`[champId]`) é onde o convidado **aceita/recusa** o convite de dupla.
- **Conexões:** ← Home, inscrição, e-mails. → detalhe do campeonato, pagamento.

### `/notificacoes` — Sininho ([app/notificacoes/page.tsx](app/notificacoes/page.tsx))
- Feed único: **convites de dupla** pendentes (aceitar/recusar — [convite-actions](app/perfil/convite-actions.ts)), **convites de staff** ([staff-actions](app/perfil/staff-actions.ts)) e notificações gerais. Marca todas como lidas.
- **Regra de produto:** toda notificação aparece aqui; a ação de fato acontece na página de destino, não duplicada.

### Cadastro / Login / Auth
- `/cadastro` — nome, e-mail, senha, **@usuário** (checa duplicado em tempo real). Depois cai na Home.
- `/cadastro/verificar-email` — aviso pra confirmar o e-mail.
- `/login` — e-mail/senha.
- `/auth/callback` ([route](app/auth/callback/route.ts)) — confirma o e-mail aceitando **token_hash (OTP, cross-device)** e **code (PKCE)**.

---

## 7. Painel do organizador

### `/painel` — Entrada ([app/painel/page.tsx](app/painel/page.tsx))
- **Quem já organiza** (tem `organizer_accounts` **ou** qualquer campeonato, mesmo rascunho): vê o painel real — contadores, atalhos pra **Painel Geral** e **Minhas Páginas**, e a **lista de campeonatos** filtrável (Todos/Abertos/Rascunhos/Encerrados). Cada item → `/painel/campeonatos/[id]`. Botão "Criar campeonato" → `/painel/novo-campeonato`.
- **Quem não organiza:** vira uma **landing de conversão** (dores, diferencial de categoria balanceada, features, taxa "risco zero") com CTA → `/painel/novo-campeonato` (logado) ou `/cadastro`.

### `/painel/geral` — Consolidado ([app/painel/geral/page.tsx](app/painel/geral/page.tsx))
- Financeiro somado de todos os campeonatos (bruto, líquido, pendente, estornado), filtro de período, lista de campeonatos. Exige `organizer_accounts`.

### `/painel/novo-campeonato` — Criação ([page](app/painel/novo-campeonato/page.tsx) · [actions](app/painel/novo-campeonato/actions.ts))
- Formulário multi-seção ([NovoCampeonatoForm](components/painel/NovoCampeonatoForm.tsx)): dados, datas, banner, categorias (o nome da categoria define automaticamente a faixa de rating via `RATING_POR_CATEGORIA`), **quiz de tier** (5 perguntas → Local/Open/Elite) e o **card do plano Elite** ([ElitePlanCard](components/painel/ElitePlanCard.tsx)).
- Salva como `rascunho` ou já publica. → `/painel/campeonatos/[id]/criado`.

### `/painel/campeonatos/[id]` — Painel do campeonato ([app/painel/campeonatos/[id]/page.tsx](app/painel/campeonatos/[id]/page.tsx))
Central de gestão de **um** campeonato (só o dono acessa). No topo: badge **Elite/Padrão** + tier + status + botão **Editar** + menu (Vinculações). Logo abaixo, link "Ver página pública" → `/campeonatos/[id]`. Aviso se falta chave Pix. Grade de **Gestão** com cards:

| Card | Rota | O que faz |
|---|---|---|
| Inscrições | `/painel/campeonatos/[id]/inscricoes` | Duplas inscritas + status de pagamento (com busca por nome) |
| Financeiro | `/painel/campeonatos/[id]/financeiro` | Entradas, taxas, repasses + **plano de taxas** (Padrão/Elite) + chave Pix |
| Check-in | `/painel/campeonatos/[id]/checkin` | Credenciamento por QR + presença/no-show |
| Camisas / Kit | `/painel/campeonatos/[id]/camisas` | Produção por tamanho |
| Chaveamento | `/painel/campeonatos/[id]/chaveamento` | Gerar/zerar a chave *(Fase 2)* |
| Equipe | `/painel/campeonatos/[id]/equipe` | Convidar staff e definir permissões |
| Comunicação | (em breve) | Avisar inscritos |

Outras sub-rotas:
- **`/editar`** — edita dados/categorias ([EditarCampeonatoForm](components/painel/EditarCampeonatoForm.tsx)).
- **`/publicar`** ([page](app/painel/campeonatos/[id]/publicar/page.tsx)) — fluxo rascunho → no ar: explica o repasse, mostra o **plano de taxas (Elite/Padrão)** com botão de ativar Elite, coleta a chave Pix se precisar. → `/criado`.
- **`/criado`** — tela de sucesso pós-criação/publicação.
- **`/financeiro`** ([page](app/painel/campeonatos/[id]/financeiro/page.tsx) · [actions](app/painel/campeonatos/[id]/financeiro/actions.ts)) — totais por status e método, breakdown por categoria, [ChavePixClient](components/painel/ChavePixClient.tsx) e [PlanoTaxas](components/painel/PlanoTaxas.tsx) (ativar Elite).
- **`/vinculacoes`** — vincular o campeonato a uma página/circuito.
- **Conexões:** ← `/painel`. → todas as sub-rotas acima e `/campeonatos/[id]` (pública).

### `/painel/paginas` — Páginas/circuitos do organizador
- Lista ([page](app/painel/paginas/page.tsx)), criar ([nova](app/painel/paginas/nova/page.tsx)), ver/editar ([id]/[editar]). Uma página agrupa edições e ganha seguidores; pode **convidar** campeonatos de outros organizadores como etapa.

---

## 8. Pagamento, split e plano Elite

### Fluxo do dinheiro (visão geral)
1. Atleta paga a inscrição (Pix/cartão) **na conta Asaas da plataforma** ([criarCobranca](lib/asaas.ts)).
2. O **webhook do Asaas** ([app/api/webhooks/asaas/route.ts](app/api/webhooks/asaas/route.ts)) recebe `PAYMENT_CONFIRMED`/`RECEIVED`: marca a inscrição como paga, confirma a dupla, gera credenciais e **dispara o repasse**.
3. O repasse desconta a **taxa da plataforma** (Padrão ou Elite, [calcularRepasse](lib/platform-config.ts)) e transfere o líquido pro organizador via **Pix** ([transferirPix](lib/asaas.ts)).
   - **Pix:** transfere na hora (D+0).
   - **Cartão (débito D+3 / crédito D+32):** a inscrição fica `aguardando_liquidacao` e o repasse é executado depois pelo **cron** `/api/cron/repasse-liquidacao` ([route](app/api/cron/repasse-liquidacao/route.ts), diário, ver `vercel.json`).
4. A lógica de repasse é compartilhada por webhook e cron em [lib/repasse.ts](lib/repasse.ts) (`executarRepasse`), com trava de idempotência (status `pendente → processando`) pra nunca repassar em dobro.

### Plano Elite (R$ 178)
- Ativar Elite **não cobra nada na hora**: cria a dívida `premium_fee_pendente = 178`.
- A cada repasse, a função atômica `claim_elite_fee` ([supabase/add-elite-fee-collection.sql](supabase/add-elite-fee-collection.sql)) **abate** `min(dívida, repasse)` — se não cobrir os 178, o resto sai das próximas inscrições. `release_elite_fee` devolve em estorno/falha; `registrations.elite_fee_coletada` audita.
- Só pode ativar com inscrições **abertas** (`rascunho`/`inscricoes_abertas`); depois disso o botão some.
- UI: [PlanoTaxas](components/painel/PlanoTaxas.tsx) (financeiro/publicar) e [ElitePlanCard](components/painel/ElitePlanCard.tsx) (criação).

> **Atenção (produção):** as chaves Asaas atuais são de **sandbox**. Pra valer de verdade: conta de produção verificada + `ASAAS_BASE_URL=https://api.asaas.com/v3` + chave `$aact_prod_…` + **webhook configurado no painel do Asaas** (`/api/webhooks/asaas` com `asaas-access-token` = `ASAAS_WEBHOOK_TOKEN`, eventos `PAYMENT_CONFIRMED/RECEIVED/REFUNDED/DELETED`).

---

## 9. Motores / lógica de negócio

| Motor | Arquivo | O que faz |
|---|---|---|
| **Categoria balanceada** | [lib/motor-categoria.ts](lib/motor-categoria.ts) | Calcula rating pelo questionário, recomenda categoria (gênero sempre prevalece), detecta sandbagging. Faixas em `RATING_POR_CATEGORIA` (Aprendiz→Profissional). |
| **Rating (Elo)** | [lib/rating.ts](lib/rating.ts) | Elo adaptado a duplas (K=32) pra atualizar rating após jogos. *(Fase 2)* |
| **Tier do campeonato** | [lib/tier.ts](lib/tier.ts) | Quiz de 5 perguntas → Local/Open/Elite (classificação do evento). **Não confundir com `is_elite`** (plano pago de taxas). |
| **Níveis** | [lib/niveis.ts](lib/niveis.ts) | Faixas Estreante→Profissional pro histórico/evolução. |
| **Taxas/repasse** | [lib/platform-config.ts](lib/platform-config.ts) · [lib/repasse.ts](lib/repasse.ts) · [lib/elite.ts](lib/elite.ts) | Cálculo de taxa Padrão/Elite e execução do repasse. |

---

## 10. Staff e Admin

### Staff (modo limitado) — `/staff`
- Aparece na navbar só pra quem é **staff aceito**. Lista os campeonatos onde a pessoa é staff.
- `/staff/[id]` ([page](app/staff/[id]/page.tsx)) mostra só o que as permissões liberam:
  - `/staff/[id]/qrcode` — escanear QR + presença (se `can_qrcode`).
  - `/staff/[id]/inscricoes` — ver duplas (se `can_inscricoes`).
  - `/staff/[id]/chaveamento` — editar confrontos/placares (se `can_chaveamento`).
- O organizador convida e define permissões em `/painel/campeonatos/[id]/equipe`; o convidado aceita em `/notificacoes`.

### Admin (só `ADMIN_EMAIL`) — `/admin` ([app/admin/page.tsx](app/admin/page.tsx))
- `/admin/campeonatos` — **todos** os campeonatos (bypassa RLS via admin client): mudar status, excluir (em cascata), ver contato do organizador (@, e-mail, telefone). Tem busca por nome.
- `/admin/destaques` — escolhe os 3 campeonatos fixados na Home (`platform_config.destaques_ids`).
- `/admin/taxas` — define as taxas da plataforma (Padrão/Premium).
- `/admin/usuarios` — gerencia contas e papéis.

---

## 11. Sistema de e-mails (Resend)

Disparados como **best-effort** ([lib/email/send.ts](lib/email/send.ts), nunca quebram o fluxo). Templates em [lib/email/templates.ts](lib/email/templates.ts):
- **Convite de dupla** → parceiro (link `/perfil`).
- **Inscrição confirmada** / **Pagamento confirmado** → atleta (link `/minhas-inscricoes/[champId]`).
- **Convite aceito** → atleta1.
- **Convite de staff** → convidado (link `/notificacoes`).
- **Convite de página** → organizador do campeonato.

---

## 12. Mapa rápido de conexões (quem leva pra onde)

```
Home ──> Campeonatos ──> Campeonato[id] ──> Inscrever ──> Pagamento ──> Minhas inscrições
  │           │                │                                              │
  │           └─> Paginas[handle] ─> Campeonato[id]                           └─> aceitar convite
  │
  ├─> Rank ──> Atletas[username]
  ├─> Perfil ──> Questionario / Editar / Conta / Ativar-organizador / Evolucao
  │        └─> Painel (se organizador)
  └─> Notificacoes (convites de dupla e staff)

Painel ──> Campeonatos[id] ──> Inscrições / Financeiro(+Elite) / Check-in / Camisas
  │                       └──> Chaveamento / Equipe(staff) / Editar / Publicar / Vinculacoes
  ├─> Painel Geral
  └─> Paginas ──> nova / [id] editar

Admin ──> Campeonatos (todos) / Destaques / Taxas / Usuarios
Staff ──> [id] ──> QRCode / Inscrições / Chaveamento  (conforme permissões)

Webhook Asaas ──> confirma pagamento ──> repasse Pix (lib/repasse) + abate Elite
Cron diário ─────> repasse de cartão vencido (D+3/D+32)
```

---

*Última atualização: documentação gerada a partir do código em 2026-06. Ao mudar fluxos
grandes (pagamento, navegação, novas páginas), atualize este arquivo.*
