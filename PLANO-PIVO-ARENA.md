# PLANO DE PIVÔ — RankFTV vira plataforma de Organizadores + Arenas

> Documento de arquitetura e passo a passo. Gerado pra orientar a implementação
> incremental (uma fase por vez, commits pequenos). O Sonnet deve seguir as fases
> **na ordem**, lendo os arquivos-molde citados antes de escrever código.
>
> **Regra de ouro:** nada de Big Bang. Cada fase entrega algo testável em tela e é
> commitada separada. Não apagar tabela/feature antiga sem o "parquear" estar feito.

---

## 1. Novo posicionamento

O RankFTV **deixa de ser uma mini rede social de atleta**. O foco passa a ser:

1. **Organizador de campeonato** — cria e gerencia torneios (já existe, continua).
2. **Dono de arena** — gerencia a arena, cobra mensalidade dos alunos pelo site, e
   paga uma **assinatura mensal** pra plataforma. (NOVO — módulo inteiro.)

A camada "social" (rating, conquistas, evolução, histórico, perfil público) **não é
jogada fora**: ela é **reaproveitada como o perfil do ALUNO dentro da arena**.

### As 4 personas

| Persona | Login? | Faz o quê |
|---|---|---|
| **Atleta comprador** | ❌ Não | Compra ingresso (de atleta ou de plateia) como visitante. Recupera o ingresso/QR depois por **consulta pública via CPF**. |
| **Aluno de arena** | ✅ Sim | Tem perfil (reaproveita rating/conquistas/evolução). Loga pra **marcar presença em treinos/aulas** e **pagar a mensalidade** da arena. |
| **Organizador** | ✅ Sim | Cria/gerencia campeonatos. Plataforma fica com **% por ingresso**. |
| **Dono de arena** | ✅ Sim | Gerencia alunos, cobra mensalidade pelo site, controla presença. Paga **assinatura mensal** à plataforma. |

> Uma conta única pode ser organizador **e** dono de arena **e** aluno ao mesmo tempo —
> seguindo a convenção atual (sem "papel" fixo no cadastro; a capacidade vem da
> existência de `organizer_accounts` / `arena_accounts` / vínculo de aluno).

### Como a plataforma ganha (atualizado)

1. **% por ingresso** de campeonato (split no pagamento — já existe).
2. **Assinatura mensal do dono de arena** (NOVO — plataforma cobra o dono). **É a ÚNICA
   receita do módulo arena.** Valores a definir.
3. A mensalidade que a arena cobra do aluno **repassa 100% pra arena** — a plataforma
   **não** tira % disso (só o custo do gateway), igual já é com ingresso de plateia.
   (Decisão D3 fechada.)

---

## 2. O que muda na navegação e na Home

### 2.1 Home do visitante (não logado) — toggle de persona

No bloco do visitante em [app/page.tsx](app/page.tsx) (hoje linhas ~159-194), trocar os
3 botões fixos por um **seletor de persona tipo liga/desliga** com 3 estados:

```
   [ Sou atleta ]   [ Sou organizador ]   [ Dono de arena ]
```

Conforme o estado selecionado, mudam os CTAs abaixo:

- **Sou atleta** → "Ver campeonatos" · "Já comprei (consultar ingresso por CPF)"
- **Sou organizador** → "Criar meu evento grátis" · "Entrar no painel" · "Login"
- **Dono de arena** → "Criar minha arena" · "Entrar na arena" · "Login"

Detalhe técnico: o toggle é client-side (estado local `useState`), só troca quais
botões aparecem. Componente novo: `components/home/PersonaSwitcher.tsx` (Client).
O resto da Home (carrossel de destaques, ao vivo, notícias) continua igual.

### 2.2 Navbar

Hoje (em [components/navbar/nav-items.ts](components/navbar/nav-items.ts)):
`Home · Agenda · Campeonatos · Rank · Painel`

Proposto:
`Home · Campeonatos · Arenas · Painel`

- **Rank** sai do menu principal (vira secundário/por-arena — ver Fase F). Não apagar a
  página `/rank`, só tirar do nav.
- **Agenda** pode continuar (é útil pra organizador) ou virar secundária — decisão leve.
- **Arenas** (novo) — vitrine pública de arenas + entrada do aluno.

---

## 3. Modelo de dados — o que muda

### 3.1 Reaproveitar (não recriar)

| Já existe | Vira / serve de molde pra |
|---|---|
| `spectator_tickets` / `spectator_ticket_types` | **Ingresso de atleta sem login** (Fase B). Mesma mecânica de QR/código/check-in/repasse. |
| `organizer_accounts` | **`arena_accounts`** (subconta Asaas do dono de arena). |
| `profiles` (rating, genero, conquistas, questionario) + `profiles_private` (cpf) | **Perfil do aluno** dentro da arena (Fase F). |
| `staff` + `app/staff/*` + `components/checkin/*` | **Presença em treino** (Fase D). |
| `app/perfil/ativar-organizador` | **"Virar dono de arena"** (Fase C). |
| split Asaas em `lib/` | Reuso pro pagamento da arena; estender pra recorrência (Fase E). |

### 3.2 Tabelas NOVAS (resumo — SQL detalhado em cada fase)

- `arenas` — id, dono_id (→ auth.users), nome, cidade, estado, descricao, avatar_url, handle, created_at
- `arena_accounts` — espelho de `organizer_accounts` (cpf_cnpj, asaas_account_id, asaas_wallet_id, habilitado) pro split da mensalidade
- `arena_students` — vínculo aluno↔arena: arena_id, user_id (→ profiles), status (`ativo`|`pendente`|`inativo`), data_entrada, valor_mensalidade
- `arena_classes` — aulas/treinos: arena_id, titulo, dia_semana/horario (ou data), created_at
- `arena_attendance` — presença: class_id (ou arena_id+data), user_id, checkin_at
- `arena_subscriptions` — assinatura do **dono** com a plataforma: arena_id, plano, status, asaas_subscription_id, proximo_vencimento
- `student_charges` — mensalidades cobradas do **aluno**: arena_student_id, valor, status_pagamento, asaas_payment_id, competencia (mês), ...
- `athlete_tickets` (Fase B) — ingresso de atleta sem login. Decisão B1: tabela nova OU generalizar `spectator_tickets` com coluna `tipo` (atleta|plateia). Recomendado: **tabela nova** `athlete_tickets` espelhando `spectator_tickets` + campos de categoria e do parceiro.

---

## 4. Passo a passo por fases (IMPLEMENTAR NESTA ORDEM)

### ✅ Fase A — Reposicionamento da casca (baixo risco, alta visibilidade)
Só UI, nada de dado pesado. Reversível.

1. Criar `components/home/PersonaSwitcher.tsx` (toggle 3 estados + CTAs por persona).
2. Plugar na Home: substituir o bloco de botões do visitante em [app/page.tsx](app/page.tsx).
3. Ajustar [components/navbar/nav-items.ts](components/navbar/nav-items.ts): tirar `Rank`
   do array, adicionar `Arenas` (rota `/arenas`, pode ser placeholder por ora).
4. Criar `/arenas` placeholder (lista vazia "em breve") pra o nav não quebrar.

**Done quando:** visitante na Home troca entre as 3 personas e vê CTAs diferentes; nav
mostra Arenas; `/rank` ainda funciona por link direto mas sumiu do menu.

---

### Fase B — Ingresso de atleta SEM login (guest checkout + consulta por CPF)
Molde: todo o fluxo de `spectator_tickets` (checkout de visitante já feito).

1. **SQL** `supabase/add-athlete-tickets.sql`: tabela `athlete_tickets` espelhando
   `spectator_tickets`, + colunas: `category_id`, `categoria_nome` (snapshot),
   `genero`, `comprador_zap`, e dados do parceiro
   (`parceiro_nome`, `parceiro_cpf`, `parceiro_email`, `parceiro_zap`, `parceiro_genero`).
   RLS igual: leitura só do dono do campeonato; escrita via service_role (visitante não
   tem conta). Grants idem `spectator_tickets`.
2. **Página de compra** `app/campeonatos/[id]/comprar/page.tsx` (visitante) — molde:
   [app/campeonatos/[id]/plateia/page.tsx](app/campeonatos/[id]/plateia/page.tsx).
   Mostra categorias com valor; escolhe categoria.
3. **Form** `components/campeonatos/IngressoAtletaForm.tsx` — molde:
   `components/plateia/IngressoPlateiaForm.tsx`. Campos do comprador (Nome, CPF, email,
   zap, gênero) **+ os mesmos dados do parceiro**. Sugeridos extras: data de nascimento
   (pra faixa etária) e tamanho de camisa (kit). Aceite dos termos.
4. **Action + pagamento** via service_role (gera cobrança Asaas com split, igual plateia).
5. **Consulta pública por CPF** `app/meus-ingressos/page.tsx`: visitante digita CPF +
   email → lista os ingressos (atleta e plateia) com QR e código pra portaria. Rota de
   leitura via service_role filtrando por CPF+email (não expõe dado de terceiro).
6. Trocar o botão "Inscrever" no detalhe do campeonato pra apontar pra `/comprar`
   (visitante) em vez de `/inscrever` (que exige login).

**Done quando:** dá pra comprar ingresso de dupla sem logar, pagar, e recuperar o QR por
CPF. O fluxo antigo `/inscrever` (login + convite por @) fica **parqueado** (não apagar
ainda — alunos de arena podem reusar; ver decisão D2).

---

### Fase C — Módulo Arena: núcleo (dono + alunos)
Molde do onboarding: [app/perfil/ativar-organizador](app/perfil/ativar-organizador) e
`organizer_accounts`.

1. **SQL** `supabase/add-arenas.sql`: tabelas `arenas`, `arena_accounts`,
   `arena_students` com RLS (dono gerencia a própria arena; aluno vê o próprio vínculo).
2. **Virar dono de arena**: `app/perfil/ativar-arena/page.tsx` + form (cpf_cnpj, telefone,
   dados da arena). Cria `arenas` + `arena_accounts` (subconta Asaas — reusar o serviço
   que já cria subconta de organizador).
3. **Painel do dono de arena** `app/arena/page.tsx` (ou `/painel/arena`): lista de alunos,
   botão de adicionar/convidar aluno, status de cada um.
4. **Vitrine pública** `/arenas` (lista) + `/arenas/[handle]` (perfil da arena) — molde:
   `app/campeonatos/paginas/[handle]` (páginas públicas já existem).
5. **Aluno entra na arena**: por código/convite. Vínculo em `arena_students` com
   `status='pendente'` até o dono aceitar (ou auto-aceite por código).

**Done quando:** Carlos cria uma arena, adiciona um aluno (conta com login), e o aluno vê
"você é aluno da Arena X" no perfil.

---

### Fase D — Presença em treinos (check-in do aluno)
Molde: `staff` + `components/checkin/*` (scanner QR e marcação já existem).

1. **SQL** `supabase/add-arena-attendance.sql`: `arena_classes` + `arena_attendance`.
2. **Aluno marca presença** `app/arena/presenca/page.tsx`: aluno logado vê os treinos da
   arena dele e marca presença (botão ou QR exibido na arena). 1 presença por aula/dia.
3. **Dono vê frequência**: no painel da arena, lista de presença por treino + frequência
   por aluno (% de comparecimento no mês).

**Done quando:** aluno loga, marca presença num treino, e o dono vê a presença registrada.

---

### Fase E — Cobrança recorrente (a parte mais pesada — Asaas assinatura)
Duas cobranças recorrentes distintas. Fazer **E1 antes de E2**.

**E1 — Arena cobra o aluno (mensalidade):**
1. `student_charges` (SQL) + `valor_mensalidade` em `arena_students`.
2. Integração Asaas **assinatura/recorrência**. **Sem taxa da plataforma**: repassa 100%
   pra conta do dono (só o custo do gateway), igual ingresso de plateia. A plataforma só
   facilita a cobrança; não fica com % da mensalidade.
3. Aluno vê e paga a mensalidade no perfil/painel do aluno; dono vê quem pagou/deve.

**E2 — Plataforma cobra o dono (assinatura da arena):**
1. `arena_subscriptions` (SQL) com `asaas_subscription_id`, `proximo_vencimento`, `status`.
2. Gate: arena só fica "ativa" (alunos/cobrança liberados) com assinatura em dia.
3. Tela de assinatura no painel da arena + webhook que atualiza `status`.

**Done quando:** aluno paga mensalidade pela arena via site, e o dono paga a assinatura da
plataforma — ambos recorrentes.

---

### Fase F — Reaproveitar o perfil social como perfil do aluno
Leve; pode rodar em paralelo com C/D.

1. O perfil existente (rating, conquistas, evolução, histórico) passa a ser exibido **no
   contexto da arena** do aluno.
2. **Rank**: reescopar pra **ranking por arena** (alunos da mesma arena) em vez de nacional.
   Decisão D4: manter um rank nacional opcional ou não.
3. Tirar referências "rede social nacional" da UI (textos da Home etc.).

**Done quando:** o aluno abre o perfil e vê seu progresso dentro da arena dele.

---

## 5. O que NÃO apagar (parquear, não deletar)

- `/rank`, `/atletas/[username]`, questionário, motor-categoria, `teams`/`registrations`
  (fluxo de inscrição com login + convite por @). Tudo isso sai do **foco/menu**, mas o
  código e os dados ficam — parte vira base do perfil do aluno (Fase F) e o fluxo de
  inscrição com login pode ser reusado por aluno de arena.
- O painel de **Performance** (admin/CEO) que acabamos de construir não é afetado.

---

## 6. Impacto consciente (trade-off já aceito)

Com ingresso **sem login**, não há rating por atleta comprador → o **motor de categoria
balanceada** (diferencial citado no ftv.md) **deixa de funcionar pra o comprador avulso**;
a categoria é **escolhida manualmente** na compra. O motor/rating sobrevive só no contexto
**aluno de arena** (que tem login e perfil). Isso é uma troca deliberada pelo foco em
organizador + arena.

---

## 7. Decisões em aberto (confirmar com o Carlos antes da fase correspondente)

- **D1 (Fase B):** `athlete_tickets` tabela nova (recomendado) vs. generalizar
  `spectator_tickets` com coluna `tipo`.
- **D2 (Fase B):** o fluxo antigo `/inscrever` (login + convite por @) — parquear de vez,
  ou manter pra aluno de arena se inscrever em torneio interno da arena?
- **D3 (Fase E1): ✅ FECHADA.** A plataforma **não** fica com % da mensalidade do aluno —
  repassa 100% pra arena (só custo do gateway). A **assinatura mensal do dono** (E2) é a
  única receita do módulo arena. Valores a definir depois.
- **D4 (Fase F):** rank nacional sai de vez ou vira opcional ao lado do rank por arena?
- **D5 (Arena):** o que mais o dono de arena gerencia além de alunos/presença/mensalidade?
  (agenda de aulas fixas, turmas, planos diferentes, etc. — detalhar na Fase C/D.)

---

## 8. Como o Sonnet deve trabalhar

- Seguir as fases na ordem. **Uma fase = um ou poucos commits pequenos.**
- Antes de cada fase, **ler os arquivos-molde citados** (esse projeto tem APIs próprias —
  ver `AGENTS.md`: ler os guias em `node_modules/next/dist/docs/` antes de escrever).
- SQL sempre idempotente (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`), com RLS + GRANTs, e
  **avisar o Carlos pra rodar no SQL Editor** (não há migração automática).
- Rodar `npx tsc --noEmit` antes de cada commit.
- UI em pt-BR; código em inglês; `R$ 1.234,56`; Server Components por padrão.
- Nunca commitar segredo; Asaas/Supabase via `.env.local`.
- Em mudança de modelo de dados ou nova dependência: explicar o plano e confirmar antes.
</content>
</invoke>
