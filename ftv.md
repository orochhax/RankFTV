# CLAUDE.md — RankFTV

> Este arquivo é o contexto do projeto. O Claude Code lê ele automaticamente.
> Mantenha atualizado conforme o projeto evolui.

## 1. O que é

**RankFTV** — Plataforma SaaS para **organização de campeonatos de futevôlei** no Brasil.
Organizador cria o campeonato na plataforma, atletas se inscrevem e pagam online,
e a plataforma ganha uma **% por transação** (split de pagamento).

Formato: **apenas site web** (responsivo, com versão mobile e versão desktop). Não haverá
app nativo (iOS/Android). Tudo roda no navegador.

O diferencial defensável NÃO é o ticketing (já existe: Letzplay, Arevo, FTV Liga, Fastis).
O diferencial é a combinação de:
- **Motor de categoria balanceada** (recomenda a categoria certa pra cada dupla, com base
  num questionário difícil de burlar + histórico/rating + balanceamento relativo ao field).
- **Credenciamento multi-perfil** bem feito (check-in por QR, controle de no-show, kit/camisa).

## 2. Público (perfis)

Não é conta separada por papel: **qualquer usuário pode ser atleta e organizador ao mesmo
tempo**, na mesma conta. Não existe escolha de "papel" no cadastro.

- **Como atleta**: se inscreve, joga, acompanha ranking. Experiência pensada mobile-first
  (mas o site funciona completo em desktop também).
- **Como organizador**: qualquer atleta pode criar um campeonato a partir do próprio Perfil.
  Pra publicar o primeiro campeonato, precisa completar um cadastro extra (CPF/CNPJ + dados
  bancários, necessário pro split de pagamento). A gestão acontece num **Painel do
  organizador** separado (ver seção 8.7).
- **Cargos menores** (árbitro, staff, coach): só credencial + função específica (modo
  limitado) — ainda não detalhado, fica pra discutir junto da Fase 2.

## 3. Funcionalidades

### Atleta
- Perfil com nível/rating, histórico, conquistas, tamanho de camisa salvo
- Buscar e se inscrever em campeonatos
- Ranking (geral / por estado / por gênero)
- Gestão de dupla (convidar parceiro pelo @usuário, salvar parceiro fixo, autoavaliação de nível)
- Credenciais e ingressos digitais (QR no celular)

### Organizador
- Pra publicar o primeiro campeonato: completar CPF/CNPJ + dados bancários (split de pagamento)
- Criar/gerenciar campeonato (categorias, regras, valores)
- Inscrições com pagamento e split automático
- Motor de categoria balanceada (diferencial)
- Chaveamento / grade automática
- Credenciamento multi-perfil + check-in por QR + controle de no-show
- Gestão de camisa/kit (painel de produção por tamanho)
- Financeiro / repasses em tempo real
- Comunicação com inscritos
- Resultados ao vivo
- Destaque pago do campeonato

### Motores transversais (o "cérebro")
- **Rating de habilidade** (algoritmo tipo TrueSkill ou Glicko-2) que alimenta categoria e ranking
- **Split de pagamento**: a plataforma NUNCA segura o dinheiro de terceiro; o split divide
  no momento do pagamento (parte do organizador vai pra conta dele, a taxa vai pra plataforma)
- **IA pontual**: entrevista de nível no WhatsApp, geração de highlights, posts/flyers do evento

## 4. Como a plataforma ganha dinheiro

1. **% por inscrição** (carro-chefe) — taxa dentro do split. Ex.: 8–10% ou R$5 fixo.
2. **Destaque de campeonato** — organizador paga pra aparecer no topo.
3. **Assinatura premium do organizador** — recursos extras + taxa menor.
4. Secundário: ingresso de espectador, camisa extra (não é pilar).

Decisão de produto: a taxa de inscrição vai **em cima** (atleta paga valor + taxa) ou
**descontada** do repasse do organizador. Mostrar isso de forma transparente.

## 5. Stack técnica

- **Frontend + Backend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Banco + Auth + Storage**: Supabase (Postgres)
- **Pagamento + split**: Asaas ou Mercado Pago (integrar só na Fase 1, não na Fase 0)
- **Deploy**: Vercel
- **E-mail transacional**: Resend (free tier no começo)
- (Opcional, fase futura) WhatsApp Business API para o agente de inscrição

## 6. Modelo de dados (entidades iniciais)

> Não existe mais `role` fixo no User. Qualquer usuário pode organizar; a capacidade de
> organizador é dada pela existência de um `OrganizerAccount` habilitado (ver seção 8.6).

- **User** — id, nome, email, **username** (@handle único). Por enquanto é **fixo, sem
  edição** (simplificação proposital da Fase 0); dá pra liberar troca depois sem migração,
  porque toda referência interna usa o `id`, nunca o `username` (ver convenção na seção 9).
- **Profile** (atleta) — user_id, nivel/rating, tamanho_camisa, cidade, estado, telefone,
  historico, **parceiro_fixo_id** (nullable, referencia outro User)
- **OrganizerAccount** (novo) — user_id, cpf_cnpj, dados_bancarios (conta de split),
  habilitado (bool) — só existe quando o usuário ativa o modo organizador
- **Championship** — id, organizador_id (referencia User), nome, descricao, data_inicio,
  data_fim, local, status (`rascunho` | `inscricoes_abertas` | `em_andamento` | `encerrado`),
  taxa_plataforma
- **Category** — id, championship_id, nome, genero (`masculino` | `feminino` | `mista`),
  valor_inscricao, corte_rating_min, corte_rating_max
- **Team (Dupla)** — id, championship_id, category_id, atleta1_id, atleta2_id,
  status (incluindo `convite_pendente`)
- **Registration (Inscricao)** — id, team_id, championship_id, category_id, valor,
  status_pagamento (`pendente` | `pago` | `estornado`), payment_id (do PSP)
- **Credential** — id, user_id, championship_id, role, qr_token, checked_in (bool), checkin_at
- (Fase 2) **Match (Jogo)** — championship_id, category_id, dupla_a_id, dupla_b_id, placar, resultado
- (Fase 2) **RatingHistory** — atleta_id, championship_id, rating_antes, rating_depois

## 7. Roadmap em fases (CONSTRUIR NESTA ORDEM)

### Fase 0 — "de pé" (sem cobrar ainda)
- Estrutura de navegação: navbar com Home, Campeonatos, Rank, Perfil (flutuante embaixo no
  mobile, fixo no topo no desktop)
- Home mostrando campeonatos em destaque (visitante já vê direto, sem landing page separada)
- Cadastro/login (Supabase Auth): nome, e-mail, senha, @usuário — conta única, sem escolha de papel
- Organizador: criar campeonato + categorias (CRUD básico)
- Atleta: listar e ver detalhe dos campeonatos
- Objetivo: ver o fluxo principal funcionando em tela

### Fase 1 — MVP cobrável
- Inscrição de dupla numa categoria (convite por @usuário, parceiro aceita no perfil dele)
- Pagamento da inscrição com split (Asaas/Mercado Pago) — um dos dois paga o valor cheio da dupla
- Geração de credencial digital (QR) por inscrição paga
- Tela de portaria: validar QR + check-in + controle de presença/no-show
- Categoria definida MANUALMENTE pelo organizador (sem motor ainda)
- Painel do organizador com financeiro (entrou / taxa / repasse)
- Objetivo: já dá pra rodar um campeonato real e cobrar a %

### Fase 2 — o diferencial
- Motor de categoria: questionário + rating + recomendação de categoria + detecção de sandbagging
- Chaveamento automático
- Resultados ao vivo + atualização do rating
- Ranking público (geral / por estado / por gênero) com perfil público de cada atleta +
  gráfico de evolução do rating
- Papel de árbitro/staff/coach (modo limitado: só credencial + função específica)

### Fase 3 — IA e crescimento
- Entrevista de nível no WhatsApp
- Highlights automáticos
- Destaque pago + assinatura premium

## 8. Especificação detalhada das telas (UI/UX)

> Detalhamento de como cada tela funciona, fechado tela por tela antes de codar.
> A seção 3 é o "o quê"; esta seção é o "como".

### 8.1 Navbar

- **Mobile**: nav flutuante fixo na parte de baixo da tela, estilo pill. 4 itens: **Home,
  Campeonatos, Rank, Perfil**. A aba ativa vira uma cápsula azul com ícone + texto; as
  outras ficam só com ícone.
- **Desktop**: as mesmas 4 seções, como menu fixo no **topo** da tela (não flutuante).
- Aparece **sempre**, inclusive pra visitante não logado.
- Visitante navega livremente em Campeonatos e Rank; só é levado pra tela de login/cadastro
  ao tentar uma ação que exige conta (se inscrever, abrir Perfil).

### 8.2 Cadastro / Login

- Cadastro pede só: **nome, e-mail, senha, @usuário** (handle único, tipo Instagram).
- **Verificação de @usuário duplicado na hora do cadastro**: o sistema confere se aquele
  @usuário já existe antes de deixar a conta ser criada (não pode ter dois iguais). Ideal
  avisar em tempo real, enquanto a pessoa digita, e não só depois de tentar enviar o formulário.
- Todo o resto (telefone, cidade/estado, tamanho de camisa, nível, dados bancários) é
  preenchido **depois, sob demanda** — só quando o usuário tenta fazer algo que precisa
  daquele dado (ex.: só pede cidade/nível na hora de se inscrever num campeonato ou de
  aparecer no Rank).
- Login só e-mail/senha por enquanto (sem Google OAuth nessa fase).
- Depois de criar a conta, cai direto na Home — sem onboarding/wizard no meio.
- `@usuário` fica **fixo por enquanto** (sem tela de edição) — simplificação proposital pra
  não precisar construir cooldown/regra de troca já de início. Liberar a troca no futuro é
  fácil (ver convenção na seção 9), então isso pode mudar mais pra frente sem dor.
- Não existe escolha de "papel" no cadastro — é uma conta só, que pode fazer as duas coisas.

### 8.3 Home

- **Visitante (não logado)**: já mostra conteúdo real — campeonatos em destaque/abertos e
  uma prévia do Rank. Não é uma landing page de marketing isolada.
- **Logado**: mostra, sempre todos juntos (sem aba/toggle):
  - Meus próximos campeonatos inscritos (data, local, contagem regressiva)
  - Campeonatos em destaque/patrocinados (espaço pago do organizador)
  - Resumo rápido do meu nível/rating + posição no ranking (com link pra tela Rank completa)
  - Notificações/avisos recentes (ex.: "sua dupla confirmou", "resultado postado")
- **Logado, usuário novo (zero inscrição ainda)**: mesma Home, mais um banner de onboarding
  leve sugerindo completar perfil, acima dos campeonatos em destaque.
- Home é **igual pra atleta e organizador** — não muda de conteúdo por papel. A parte de
  organizador vive só no Perfil / Painel do organizador (8.6/8.7).

### 8.4 Campeonatos

**Lista/busca:**
- Filtros: **estado** (não cidade) e **categoria**.
- Não existe filtro de status que esconde campeonato — todos aparecem (abertos, em
  andamento, encerrados), mas os com **inscrições abertas vêm sempre primeiro**.
- Card de cada campeonato mostra: nome + imagem/banner, data e local (preço e vagas só no detalhe).

**Detalhe (ao abrir um campeonato):**
- Regulamento/regras (texto livre do organizador)
- Categorias disponíveis com valor de inscrição de cada uma
- Localização com mapa
- Lista pública de duplas já inscritas
- Botão de inscrição

**Inscrição em dupla:**
- Convite por **@usuário**: busca o parceiro pelo handle dentro da plataforma e manda convite.
- Se o parceiro ainda não tem conta, ele cria a conta primeiro (cadastro rápido) e passa o
  @usuário dele pro amigo mandar o convite.
- O convidado aceita o convite dentro do próprio perfil dele.
- Pagamento: **um dos dois paga o valor cheio da dupla**; o outro só confirma/aceita — sem
  pagamento dividido.
- Atleta pode salvar um **parceiro fixo** no perfil pra agilizar convite nos próximos
  campeonatos (não impede jogar com outra pessoa quando quiser).

### 8.5 Rank

- Ranking é **por atleta individual** (rating é da pessoa, não da dupla).
- Filtros: **Brasil todo** ou **por estado**, cruzado com **Geral / Masculina / Feminina**.
- Clicar num atleta abre o **perfil público** dele.
- Perfil do atleta mostra **gráfico de evolução do rating** ao longo do tempo (usa o
  `RatingHistory` do modelo de dados — depende da Fase 2).

### 8.6 Perfil

- **Perfil público** (o que qualquer um vê, inclusive a partir do Rank):
  - Foto, nome e @usuário
  - Nível/rating atual + categoria
  - Histórico de campeonatos jogados e resultados
  - Conquistas/badges
- **Perfil privado** (só o dono vê): tudo do público + dados de conta, telefone,
  cidade/estado, tamanho de camisa, parceiro fixo, configurações.
- **Virar organizador**: qualquer atleta pode criar um campeonato, mas pra publicar o
  primeiro precisa completar CPF/CNPJ + dados bancários (split de pagamento). Sem isso, não
  libera a criação.
- Quem já tem campeonato(s) criado(s) vê, dentro do próprio Perfil, um botão que leva pro
  **Painel do organizador** (tela separada — ver 8.7).

### 8.7 Painel do organizador

Tela separada, acessada por um botão dentro do Perfil:
- Criar/gerenciar campeonato (categorias, regras, valores)
- Inscrições com pagamento e split automático
- Chaveamento / grade automática (Fase 2)
- Credenciamento multi-perfil + check-in por QR + controle de no-show
- Gestão de camisa/kit (painel de produção por tamanho)
- Financeiro / repasses em tempo real
- Comunicação com inscritos
- Resultados ao vivo (Fase 2)
- Destaque pago do campeonato

### 8.8 Notificações

- Só **dentro do site** por enquanto (sininho/feed na Home) — sem e-mail nem push no
  navegador nessa fase.

## 9. Convenções

- **Idioma da interface (UI)**: português do Brasil
- **Código** (variáveis, funções, commits): inglês
- **Moeda**: BRL, formatar como `R$ 1.234,56`
- Sempre arredondar valores monetários exibidos
- Usar Server Components do Next.js por padrão; Client Components só onde precisa de interatividade
- Campos editáveis pelo usuário (username, nome, email) nunca são chave de relacionamento
  no banco — relações internas sempre usam o `id`. Isso permite relaxar regras (ex.: liberar
  troca de @usuário) no futuro sem precisar migrar dados antigos.

## 10. Como trabalhar comigo (instruções pro Claude Code)

- Construir **incremental**, uma funcionalidade por vez. Não tentar fazer tudo de uma vez.
- Antes de mudanças grandes (mexer em modelo de dados, instalar dependência pesada,
  mudar estrutura de pastas), explicar o plano e pedir confirmação.
- Commitar com git em passos pequenos e com mensagens claras.
- Explicar as decisões em linguagem simples — o dono do projeto tem pouca experiência
  prática de código, então comentar o "porquê", não só o "o quê".
- Nunca colocar chaves/segredos (Supabase, PSP) no código — usar variáveis de ambiente (`.env.local`).
