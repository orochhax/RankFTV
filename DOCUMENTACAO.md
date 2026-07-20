# Documentação técnica do RankFTV

> Fonte técnica canônica do estado atual do repositório em 20/07/2026.
>
> Este documento descreve o que está implementado no código. Configurações de
> serviços externos e riscos que ainda impedem afirmar “100% em produção” ficam
> em [AUDITORIA-PRODUCAO.md](AUDITORIA-PRODUCAO.md). A visão de produto fica em
> [ftv.md](ftv.md) e o plano original da Arena é apenas histórico em
> [PLANO-PIVO-ARENA.md](PLANO-PIVO-ARENA.md).

## 1. Produto e perfis de acesso

RankFTV é uma plataforma web responsiva para campeonatos de futevôlei e gestão
de arenas. A mesma identidade do Supabase Auth pode acumular capacidades:

- visitante: consulta campeonatos, arenas, agenda, notícias e páginas públicas;
- atleta autenticado: mantém perfil, participa de duplas, paga inscrições e
  acompanha ingressos e credenciais;
- organizador: cria e administra seus campeonatos;
- dono de arena: administra uma ou mais arenas;
- staff de arena (professor/gerente): vínculo em arena_staff, adicionado
  diretamente pelo dono (sem convite pendente). Professor finaliza presença e
  cobrança das aulas em que está designado; gerente tem as mesmas permissões
  do dono sobre aulas, presenças e financeiro da arena;
- staff: acessa somente os campeonatos e funções autorizados no convite;
- admin/CEO: o proxy exige profiles.role igual a admin ou ceo; algumas ações
  também aceitam ADMIN_EMAIL como fallback, e /admin/usuarios exige role ceo.

Essas capacidades não são apenas decisões visuais. Páginas, Server Actions,
RLS, grants, funções SQL e verificações de propriedade continuam responsáveis
pela autorização efetiva.

## 2. Stack e execução local

| Camada | Implementação |
| --- | --- |
| Aplicação | Next.js 16.2.10 com App Router, React 19.2.4 e TypeScript |
| Interface | Tailwind CSS 4, tokens em app/globals.css e lucide-react |
| Banco/Auth/Storage | Supabase com Postgres, Auth, Storage, RLS e RPCs |
| Pagamentos | Asaas para Pix, cartão, assinaturas, webhooks e repasses |
| E-mail | Resend |
| Gráficos e documentos | Recharts, qrcode e jsPDF |
| Deploy e tarefas | Vercel e cron definido em vercel.json |

Requisito local: Node.js 20.9 ou superior.

~~~bash
npm ci
npm run dev
~~~

Verificações de release:

~~~bash
npm run lint
npx tsc --noEmit
npm test
npm run build
npm audit --omit=dev
~~~

### Variáveis de ambiente

| Variável | Escopo | Finalidade |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | público | URL do projeto Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | público | chave pública/anon |
| SUPABASE_SERVICE_ROLE_KEY | servidor | operações administrativas autorizadas |
| NEXT_PUBLIC_BASE_URL | público | origem canônica de links e callbacks |
| ADMIN_EMAIL | servidor | conta administrativa principal |
| ASAAS_BASE_URL | servidor | endpoint Sandbox ou produção |
| ASAAS_API_KEY | servidor | autenticação da API Asaas |
| ASAAS_WEBHOOK_TOKEN | servidor | validação do webhook |
| CRON_SECRET | servidor | proteção do cron de liquidação |
| RESEND_API_KEY | servidor | envio transacional |
| RESEND_FROM_EMAIL | servidor | remetente verificado |
| ALLOW_TUNNEL_ORIGIN | desenvolvimento | origem temporária de túnel local |

Somente variáveis com prefixo NEXT_PUBLIC podem chegar ao navegador. Nunca
versionar arquivos .env nem reutilizar credenciais Sandbox em produção.

## 3. Arquitetura da aplicação

~~~text
app/           rotas, layouts, Server Components, Server Actions e APIs
components/    componentes visuais e shells compartilhados
lib/           integrações e regras de negócio reutilizáveis
supabase/      SQLs incrementais, RLS, RPCs, hardening e manutenção
scripts/       operações controladas, como limpeza de dados
public/        ativos estáticos rastreados
~~~

O layout raiz em app/layout.tsx resolve no servidor:

- sessão atual;
- perfil usado na navegação;
- existência de conta de organizador;
- propriedade de arena;
- convites aceitos de staff;
- exibição do atalho administrativo por ADMIN_EMAIL;
- soma de notificações, convites de staff e convites de dupla pendentes.

Essas informações são entregues ao AppShell. A navegação interna usa Link e o
App Router, portanto a URL, links diretos, atualização, voltar e avançar do
navegador continuam funcionando sem recarregar o documento inteiro.

### 3.1 Shell global

components/shell/AppShell.tsx mantém, no desktop, uma estrutura compartilhada:

- sidebar preta de 80 px, fixa na composição e persistente entre seções;
- conteúdo principal ocupando o restante da viewport;
- fundo geral centralizado no token app-bg, atualmente #F3F5FA;
- nenhuma topbar global repetindo o nome da página;
- cards e superfícies continuam brancos ou com suas cores específicas.

components/shell/DesktopSidebar.tsx contém:

- logo FTV em círculo branco;
- itens condicionais por permissão;
- indicador azul único que desliza até a rota ativa;
- tooltips, foco visível, aria-label e aria-current;
- sino no rodapé com mini menu carregado sob demanda;
- botão “Ver todas” que abre /notificacoes;
- avatares e ações de sessão no rodapé;
- feixe azul decorativo que percorre verticalmente a borda direita.

No mobile, components/navbar/BottomNav.tsx continua sendo uma pill flutuante
inferior. A sidebar desktop e suas mudanças não substituem a navegação mobile.

### 3.2 Rotas focadas

components/shell/FocusedLayout.tsx remove sidebar e BottomNav de fluxos que
precisam de menos distrações, mantendo uma faixa mínima com link para a Home.
components/shell/app-nav-items.ts define os prefixos e padrões:

- /login, /cadastro, /convite e /termos;
- /arena/mensalidade;
- segmentos de pagamento, compra de ingresso, reembolso e inscrição.

### 3.3 Navegação contextual

- ArenaShell mantém o contexto de /arena/[handle]. No desktop acrescenta a
  navegação da arena dentro da área de conteúdo; no mobile fornece header e
  drawer próprios. As rotas canônicas sempre carregam o handle.
- ChampionshipShell, em /painel/campeonatos/[id]/layout.tsx, mantém os dados e
  a navegação do campeonato. As ações aparecem abaixo dos cards de métricas,
  e não em uma topbar global.
- Rotas antigas de Arena sem handle permanecem somente como compatibilidade ou
  redirecionamento; novos links devem usar /arena/[handle]/....

### 3.4 Identidade responsiva atual

- fundo de página desktop e mobile: #F3F5FA;
- sidebar desktop: preta, ícones claros, item ativo azul;
- cabeçalho do perfil: preto, foto principal de 92 px e nome maior;
- Home mobile, listagem/página de Arena e entrada do Painel: divisão arredondada
  com trilha transparente e um feixe azul horizontal;
- card “Acesso rápido” da Home desktop: preto com detalhe azul;
- usuários com redução de movimento habilitada recebem a versão sem
  deslocamento contínuo das animações decorativas.

Os seletores e keyframes ficam em app/globals.css. Alterações visuais globais
devem reutilizar os tokens existentes e evitar seletores que vazem para
popovers, modais ou cards.

## 4. Navegação global

Itens declarados em components/shell/app-nav-items.ts:

| Item | Rota | Regra de visibilidade |
| --- | --- | --- |
| Campeonatos | / | todos |
| Arenas | /arenas | todos |
| Agenda | /agenda | todos |
| Meus ingressos | /meus-ingressos | todos |
| Minhas inscrições | /minhas-inscricoes | autenticado |
| Perfil | /perfil | autenticado |
| Organizador | /painel | possui organizer_accounts |
| Minhas arenas | /arena | possui arena |
| Staff | /staff | possui convite aceito |
| Administração | /admin | atalho exibido quando o e-mail é ADMIN_EMAIL |

A rota Campeonatos também fica ativa dentro de /campeonatos. Minhas arenas
fica ativa em /arena e seus descendentes. A rota atual, e não um estado local
isolado, determina o item selecionado.

O atalho e a autorização administrativa ainda usam fontes diferentes: o layout
global verifica ADMIN_EMAIL, enquanto proxy.ts exige role admin/ceo. Na prática,
a conta principal de lançamento deve ter e-mail igual a ADMIN_EMAIL e role ceo.
Essa regra deve ser unificada antes de delegar administração a outra conta.

## 5. Catálogo de rotas

O catálogo abaixo agrupa rotas relacionadas. Uma rota existir não significa que
seja pública: cada página aplica sua autenticação e autorização.

### 5.1 Público, autenticação e atleta

| Rota ou grupo | Responsabilidade |
| --- | --- |
| / | Home, destaques, acessos rápidos e listagem de campeonatos |
| /agenda | agenda pública baseada em campeonatos reais |
| /campeonatos e /campeonatos/ao-vivo | descoberta, busca, filtros e eventos em andamento |
| /campeonatos/[id] | página pública do campeonato |
| /campeonatos/[id]/categorias | escolha de categoria |
| /campeonatos/[id]/inscrever | inscrição de dupla autenticada |
| /campeonatos/[id]/pagamento/[registrationId] | pagamento da inscrição |
| /campeonatos/[id]/comprar | ingresso de atleta/visitante |
| /campeonatos/[id]/comprar/ingresso/[ticketId] | pagamento e credencial do ingresso de atleta |
| /campeonatos/[id]/plateia | escolha/compra de ingresso de espectador |
| /campeonatos/[id]/plateia/ingresso/[ticketId] | pagamento e credencial de plateia |
| /campeonatos/[id]/chaveamento | chaveamento público |
| /arenas e /arenas/[handle] | descoberta e página pública da arena, com agenda de aulas e área do aluno |
| /arenas/[handle]/alugar | aluguel de quadra |
| /arenas/[handle]/diaria | diária avulsa |
| /arenas/[handle]/assinar/[planId] | adesão a plano da arena |
| /arenas/[handle]/minhas-aulas | relatório do aluno: data, horário, professor, público e status de cada presença |
| /arenas/[handle]/financeiro | financeiro do aluno: cartão padrão salvo e histórico de mensalidades/aulas avulsas |
| /atletas/[username] | perfil público de atleta |
| /noticias e /noticias/[id] | listagem e leitura de notícias |
| /login | autenticação por e-mail e senha |
| /cadastro e /cadastro/verificar-email | criação e confirmação da conta |
| /auth/callback | callback de autenticação no servidor |
| /perfil | visão privada do perfil |
| /perfil/editar | dados públicos e foto |
| /perfil/conta | dados privados e credenciais |
| /perfil/questionario e /perfil/questionario-nivel | gênero e avaliação de nível |
| /perfil/ativar-organizador | criação da conta de organizador |
| /perfil/ativar-arena | criação da arena |
| /meus-ingressos | recuperação/consulta protegida de ingressos |
| /minhas-compras | compras ligadas à conta |
| /minhas-inscricoes | inscrições do atleta |
| /minhas-inscricoes/[champId] | detalhe, dupla e credencial |
| /minhas-inscricoes/[champId]/reembolso | solicitação de reembolso |
| /convite/[teamId] | aceite ou recusa de convite da dupla |
| /notificacoes | feed completo |
| /termos | termos de uso |

### 5.2 Organizador de campeonato

| Rota ou grupo | Responsabilidade |
| --- | --- |
| /painel | entrada do organizador ou landing de ativação |
| /painel/novo-campeonato | criação de campeonato |
| /painel/campeonatos | campeonatos do organizador |
| /painel/campeonatos/[id] | visão geral e métricas |
| .../editar e .../publicar | edição e publicação |
| .../criado | confirmação pós-criação |
| .../inscricoes | duplas e pagamentos |
| .../financeiro e .../financeiro/[status] | receitas, taxas e repasses |
| .../checkin | credenciamento |
| .../chaveamento | grade e confrontos |
| .../camisas | produção por tamanho |
| .../equipe | staff e permissões |
| .../comunicacao | avisos aos inscritos |
| .../cupons e .../lotes | descontos e preços escalonados |
| .../plateia | tipos de ingresso |
| .../plateia/lista | espectadores/ingressos |
| .../plateia/financeiro | financeiro da plateia |
| .../plateia/checkin | check-in de espectadores |

Em toda ocorrência acima, “...” representa /painel/campeonatos/[id].

### 5.3 Dono de arena e aluno

| Rota ou grupo | Responsabilidade |
| --- | --- |
| /arena | escolhe a arena ou abre a única arena do dono |
| /arena/[handle] | dashboard e agenda completa da semana, de segunda a domingo |
| /arena/[handle]/agenda | visualizações e filtros da agenda |
| /arena/[handle]/alunos | alunos e solicitações |
| /arena/[handle]/aulas | turmas, horário de início/término, público, preço avulso e equipe (professor/gerente) — dono ou gerente |
| /arena/[handle]/aula/[classId] | lista da aula: quem reservou, finalizar presente/ausente e tentar cobrança de novo — dono, professor da aula ou gerente |
| /arena/[handle]/planos | catálogo de planos (mensalidade/aluguel/diária) — nunca cobrança individual por aluno |
| /arena/[handle]/relatorios | faturamento previsto, receita, presença e ranking (agregado, só leitura) |
| /arena/[handle]/configuracoes | dados, imagens e regras |
| /arena/[handle]/assinatura | assinatura da plataforma pela arena |
| /arena/presenca | confirmação de presença pelo aluno |
| /arena/mensalidade/[chargeId] | pagamento de mensalidade pelo aluno |

**`/arena/[handle]/financeiro` não existe mais.** Essa rota deixava o
organizador escolher um aluno, digitar um `valor_mensalidade` arbitrário e
emitir uma cobrança manual — uma cobrança nunca escolhida nem confirmada
pelo aluno. A página, suas actions (`definirValorMensalidade`,
`emitirMensalidade`) e o componente cliente foram removidos do código;
acessar a URL retorna 404. O organizador só cadastra e gerencia o catálogo
de planos em `/arena/[handle]/planos` — quem decide contratar, ver o preço e
confirmar é sempre o aluno, em `/arenas/[handle]/assinar/[planId]`. Ver 7.3.4.

As rotas /arena/assinatura, /arena/aulas, /arena/aula/[classId],
/arena/configuracoes e /arena/planos existem por compatibilidade. Não devem
ser usadas para criar navegação nova.

### 5.4 Staff

| Rota | Responsabilidade |
| --- | --- |
| /staff | campeonatos nos quais a pessoa integra a equipe |
| /staff/[id] | painel permitido do campeonato |
| /staff/[id]/qrcode | leitura/validação de credenciais |
| /staff/[id]/inscricoes | inscrições, conforme permissão |
| /staff/[id]/chaveamento | chaveamento, conforme permissão |

### 5.5 Administração

| Rota ou grupo | Responsabilidade |
| --- | --- |
| /admin | entrada administrativa |
| /admin/campeonatos | gestão da vitrine |
| /admin/campeonatos/novo | novo item da vitrine |
| /admin/campeonatos/[id]/editar | edição da vitrine |
| /admin/noticias e /admin/noticias/[id]/editar | conteúdo editorial |
| /admin/destaques | destaques da Home |
| /admin/taxas | configuração de taxas |
| /admin/usuarios | administração de usuários |
| /admin/gastos e /admin/gasto-mensal | controles internos de gastos |
| /admin/performance | ferramenta interna de performance |

O proxy protege todo /admin por role admin/ceo. /admin/usuarios é exclusivo de
role ceo. Helpers de ações administrativas também aceitam ADMIN_EMAIL como
fallback, mas esse fallback não substitui a verificação anterior do proxy.

### 5.6 APIs

| Endpoint | Função |
| --- | --- |
| POST /api/webhooks/asaas | eventos de pagamento do Asaas |
| POST /api/arena/webhook | handler específico/legado para cobranças mens: |
| GET /api/cron/repasse-liquidacao | liquidação diária protegida por segredo |
| POST /api/meus-ingressos | consulta de ingresso sem dados sensíveis na URL |
| GET /api/ticket-status | atualização protegida do status do ingresso |
| GET /api/users/search | busca limitada de usuário para convite |

Os métodos efetivos e contratos devem ser consultados nos respectivos route.ts;
clientes não devem chamar o Supabase service role diretamente.

## 6. Modelo de dados principal

Os SQLs em supabase são incrementais. Eles não formam um único arquivo que
possa ser executado inteiro e sem verificar dependências.

### Identidade e permissões

- profiles: identidade pública permitida, como nome, username, bio, foto,
  rating, gênero, cidade, estado e tamanho de camisa para usuários autenticados;
- profiles_private: CPF, telefone, data de nascimento e questionário, protegidos
  por RLS;
- organizer_accounts: dados e habilitação do organizador;
- championship_staff: vínculo, status e permissões por campeonato;
- notifications: feed individual.

### Campeonatos

- championships e championship_categories;
- registrations, teams e credentials;
- pricing_tiers e coupons;
- bracket_matches e tabelas auxiliares de chaveamento;
- spectator_ticket_types e spectator_tickets;
- athlete_tickets;
- shirt_production e estruturas de equipe;
- rating_history, conquistas e resultados.

### Arenas

- arenas e arena_photos;
- arena_plans (catálogo, versionado — ver 7.3.4: arquivado_em,
  versao_anterior_id) e arena_students (vínculo aluno-arena; access_until,
  renovacao_ativa, plano_encerrado_em e renovacao_cancelamento_erro separam
  o período pago do estado ao vivo do plano — ver 7.3.4/7.3.5);
- arena_staff (professor/gerente da arena, adicionado pelo dono);
- arena_classes (inclui hora_inicio, hora_fim, publico, valor_avulso e
  professor_id — horario/duracao_minutos ficam no schema só por
  compatibilidade, sem uso no código) e arena_attendance (status
  reservado/presente/ausente/cancelada, tipo_cobranca credito/avulsa,
  pagamento_status e campos de repasse — ver 7.3);
- arena_student_cards (cartão tokenizado do aluno, por arena);
- student_charges;
- arena_rentals e arena_daily_passes;
- registros de pagamento e assinatura associados à arena.

### Plataforma e conteúdo

- platform_config e configurações de taxas;
- news e destaques;
- rate_limits para endpoints públicos sensíveis;
- tabelas administrativas de gastos e performance.

Referências internas usam UUID. Username e handle são endereços públicos
mutáveis e não substituem a chave primária nas relações.

## 7. Fluxos essenciais

### 7.1 Inscrição autenticada

1. O atleta escolhe campeonato e categoria.
2. O servidor valida janela, gênero, vagas, lote/cupom e identidade.
3. A dupla é criada ou atualizada e o parceiro recebe convite.
4. A cobrança é criada no Asaas.
5. Webhook validado atualiza o pagamento.
6. Credencial e financeiro passam a refletir o estado confirmado.

### 7.2 Ingresso de visitante

1. O comprador informa os dados exigidos no checkout.
2. O servidor cria ingresso e cobrança.
3. O link privado usa token de acesso.
4. A consulta perdida usa POST, rate limit e não devolve QR sem autorização.
5. Webhook, check-in e repasse reutilizam o registro interno.

### 7.3 Arena

1. O dono cria a arena e configura planos, aulas, horários e regras.
2. O aluno solicita entrada, adere a um plano, compra diária ou aluga quadra.
3. As cobranças são conciliadas pelo webhook.
4. Agenda, vagas, presença, mensalidades e financeiro usam os vínculos da
   própria arena.

Nos checkouts públicos atuais de adesão ao plano, aluguel e diária, o comprador
paga o valor-base mais 10% de taxa de serviço; o repasse da Arena usa o
valor-base. A emissão manual de Pix pelo financeiro da Arena não soma essa taxa
no mesmo ponto do código. A regra precisa ser harmonizada e homologada antes de
produção.

#### 7.3.1 Aulas: horário, público e equipe

Cada aula (arena_classes) tem hora_inicio/hora_fim (exibidos como
"HH:mm - HH:mm"), validados no cliente e no servidor
(lib/arena-dates.ts#validarIntervaloHorario — mesma função nos dois lados,
pra nunca divergir) e publico (misto por padrão, masculino ou feminino).
O dono pode designar um professor por aula a partir da equipe da arena
(arena_staff, papéis professor/gerente, adicionados diretamente pelo dono
em /arena/[handle]/aulas). Gerente tem as mesmas permissões do dono sobre
aulas, presenças e financeiro da arena; professor só sobre as aulas em que
está designado.

#### 7.3.2 Restrição de presença por gênero

profiles.genero é a fonte oficial. Aula mista aceita qualquer perfil. Aula
masculina/feminina só aceita perfil com genero igual ao público da aula —
avaliado em app/arena/actions.ts#confirmarPresenca via
lib/arena-attendance.ts#elegibilidadeGenero, sempre no servidor (o cliente só
usa o mesmo resultado pra desenhar o botão). Perfil sem genero preenchido
recebe o código PERFIL_SEM_GENERO, tratado na UI como link pra completar o
perfil; perfil preenchido mas incompatível recebe uma mensagem direta — são
os dois estados "sem_genero" e "genero_incompativel" do tipo
ElegibilidadeGenero.

#### 7.3.3 Crédito, aula avulsa e cobrança

O crédito do aluno é a franquia semanal do próprio plano
(arena_plans.aulas_por_semana; sem limite = ilimitado), mas só conta pra
quem tem acesso pago válido AGORA — ver 7.3.5. Ao confirmar presença, o
servidor decide crédito x avulsa
(lib/arena-attendance.ts#decidirTipoCobranca) com base numa contagem em
tempo real da semana — nunca num valor vindo do cliente — e a reserva em si
(checar vaga/crédito + INSERT) é atômica dentro da função SQL
arena_confirm_attendance (advisory lock por aula/data e por aluno/arena),
pra duplo clique ou abas concorrentes nunca reservarem 2 vezes.

Quando não há crédito e a aula tem valor_avulso configurado, a UI mostra o
valor e só confirma depois de um segundo clique — reforçado no servidor via
o parâmetro avulsaConfirmada de confirmarPresenca (que devolve
AVULSA_PREVIEW e o valor sem gravar nada na 1ª chamada); sem valor_avulso
configurado ou sem crédito nenhum, a confirmação é bloqueada. Aula avulsa
exige cartão salvo (arena_student_cards) antes de reservar — sem cartão, a
UI direciona pra /arenas/[handle]/financeiro.

A cobrança em si só acontece quando o professor/gerente/dono finaliza a
presença como "presente" (arena_finalize_attendance, idempotente via
finalized_at). Presença "ausente" ou reserva cancelada pelo aluno antes do
prazo nunca gera cobrança e libera o crédito/vaga (contagem de crédito só
considera status reservado/presente). A cobrança em si roda em
app/arena/actions.ts#processarCobrancaAvulsa: reivindica atomicamente via
arena_claim_attendance_charge (pendente/falhou → processando — só quem
reivindica chama o Asaas), cobra com o token salvo
(lib/asaas.ts#cobrarComToken) e resolve o resultado via
arena_resolve_attendance_charge. Falha (sem cartão, cartão removido antes da
confirmação de presença, ou recusa do Asaas) marca pagamento_status='falhou',
nunca perde o histórico, e notifica o aluno e os responsáveis da arena (dono
+ gerentes) — o que atualiza o contador do sino automaticamente, já que ele
soma notifications não lidas. Uma ação de "tentar cobrança novamente"
(tentarCobrancaNovamente) está disponível pro aluno e pra quem finaliza a
aula, passando pelo mesmo reivindicar/resolver.

O aluno acompanha tudo em /arenas/[handle]/minhas-aulas (status de presença
separado de status de pagamento) e /arenas/[handle]/financeiro (cartão
salvo + histórico unindo mensalidades e aulas avulsas — ver
lib/arena-cobranca.ts).

#### 7.3.4 Planos: catálogo do organizador, contratação do aluno

O organizador só cadastra e gerencia o catálogo de planos em
/arena/[handle]/planos (app/arena/planos/actions.ts): nome, descrição,
valor, aulas por semana, formas de pagamento aceitas, dia de vencimento.
Ele nunca escolhe um aluno e emite uma cobrança — isso foi
/arena/[handle]/financeiro, removida (ver 5.3). Uma cobrança de mensalidade
só nasce quando o próprio aluno abre /arenas/[handle]/assinar/[planId], vê
preço e condições, confirma e completa o checkout no Asaas
(app/arenas/[handle]/assinar/[planId]/actions.ts#assinarPlano/assinarGratuito).

Mudar o preço de um plano de mensalidade nunca muda o que quem já assinou
está pagando. updatePlan (app/arena/planos/actions.ts) compara o valor novo
com o atual: se for igual, edita nome/descrição/aulas-por-semana na mesma
linha; se o valor mudou, a linha atual é arquivada
(arena_plans.ativo=false, arquivado_em=now()) com nome/valor/condições
intactos pra auditoria, e uma linha nova assume o valor novo
(versao_anterior_id aponta pra qual ela substituiu) — só essa nova aparece
pro catálogo público. arquivarPlano faz o mesmo sem criar substituto
(exclusão lógica: nunca DELETE). Nos dois casos, quem já estava na versão
anterior tem a assinatura cancelada no Asaas
(lib/asaas.ts#cancelarAssinatura, chamada por
cancelarRenovacoesDoPlano) — renovacao_ativa vira false e
plano_encerrado_em é gravado, mas access_until (o período já pago) não é
tocado. Se o cancelamento no Asaas falhar pra algum aluno, essa linha
continua com renovacao_ativa=true e o erro fica registrado em
renovacao_cancelamento_erro — nunca reporta "cancelado" no banco enquanto o
Asaas ainda pode cobrar de novo.

Plano de aluguel/diária não tem assinatura recorrente (cada compra é uma
cobrança avulsa nova), então editar o preço é sempre uma atualização direta
na mesma linha.

#### 7.3.5 Acesso do aluno: separado do estado ao vivo do plano

Nunca decida se um aluno pode marcar presença olhando só arena_students.plan_id
ou o estado atual do plano — ele pode ter sido arquivado ou reprecificado
sem tirar, na hora, um direito já pago. A fonte de verdade é
access_until: até quando o período pago cobre o uso. O webhook
(app/api/webhooks/asaas/route.ts, prefixo "arena_student:") grava
access_until = addMonthsISO(payment.dueDate, 1) a cada PAYMENT_CONFIRMED, e
zera no PAYMENT_REFUNDED. access_until nulo é o estado legado/plano
gratuito (sem assinatura Asaas rastreável, portanto sem webhook pra avançar
essa data) — nesse caso o acesso continua liberado enquanto
status='ativo', preservando o comportamento anterior a esta migração.

lib/arena-attendance.ts#temAcessoAoPlano é a checagem usada em
confirmarPresenca; lib/arena-attendance.ts#estadoPlanoAluno deriva o estado
pra UI: "ativo" (renovação em dia, dentro do período), "encerrado_com_acesso"
(renovação parada mas access_until ainda não passou — a página pública
mostra "Plano encerrado — acesso válido até {data}") e "encerrado_sem_acesso"
(sem plano, pode contratar de novo). Exemplo: aluno paga em 20/07 pra usar
até 20/08; organizador reprecifica ou arquiva o plano em 25/07 — nenhuma
cobrança nova acontece, o aluno mantém acesso e crédito normalmente até
20/08, e só a partir de 21/08 fica sem plano.

### 7.4 Repasse

Eventos Asaas precisam corresponder ao registro interno antes de mudar status.
Repasses usam reivindicação atômica contra processamento duplicado. O cron
diário inclui inscrições, ingressos, mensalidades, aluguéis, diárias e aulas
avulsas aplicáveis. A homologação real ainda é obrigatória antes de operar em
volume.

O webhook (app/api/webhooks/asaas/route.ts) trata aula avulsa pelo prefixo
externalReference "arena_class_charge:<attendanceId>" — confirma/estorna e
dispara o repasse igual às demais fontes de receita de arena, usando
arena_attendance.repasse_status/repasse_data_prevista (mesmas colunas e
mesmo padrão de student_charges/arena_rentals/arena_daily_passes). A
liquidação diferida de aula avulsa no cron usa pagamento_status, não
status_pagamento — é a única tabela de arena com esse nome de coluna
diferente (documentado no próprio arquivo do cron).

## 8. Segurança e hardening

Os dois arquivos abaixo compõem uma implantação em duas etapas:

1. supabase/production-security-hardening.sql prepara schema, dados privados,
   RLS, grants, storage e RPCs compatíveis com o código novo;
2. supabase/production-security-hardening-after-deploy.sql remove
   data_nascimento e questionario de profiles e restringe as colunas públicas
   de profiles e arenas.

O responsável informou que as duas etapas foram executadas, inclusive a segunda
antes de o deploy compatível terminar. O código atual é compatível com o estado
final, mas este repositório não comprova sozinho o schema remoto. Antes de abrir
produção:

- fazer snapshot recuperável;
- confirmar que os campos privados estão em profiles_private;
- confirmar que profiles não possui mais os dois campos pessoais;
- testar grants/RLS como anon, usuário comum, organizador, staff e service_role;
- verificar que invite_code e tokens não aparecem em consultas públicas;
- revisar logs do PostgREST e do Auth.

Não reexecute os scripts “por garantia” sem antes inspecionar o estado remoto.
Em uma base nova, a ordem é etapa 1, deploy Ready, etapa 2 e testes.

next.config.ts adiciona CSP, HSTS em produção, proteção contra iframe,
nosniff, política de referência e política de permissões. Isso complementa,
mas não substitui, RLS, autorização de servidor e validação de webhook.

## 9. Estado dos dados

A limpeza operacional registrada em AUDITORIA-PRODUCAO.md removeu contas,
atletas, campeonatos, arenas e relações de demonstração da base usada, mantendo
somente a conta correspondente a ADMIN_EMAIL. O script
scripts/cleanup-production-data.mjs permanece com conferência segura por padrão
e exclusão somente mediante --execute.

Esse registro não autoriza executar nova limpeza automaticamente em outro
projeto Supabase. Sempre confirme projeto, backup e conta administrativa antes.
Arquivos de seed existentes no repositório são scripts históricos/operacionais;
eles não são executados pelo app durante o deploy.

## 10. Produção

O código local validado é apenas uma parte do release. Ainda precisam ser
confirmados fora do repositório:

- domínio final e NEXT_PUBLIC_BASE_URL;
- URLs de Auth, CAPTCHA, política de senha e MFA do admin no Supabase;
- credenciais de produção, webhook e eventos do Asaas;
- domínio, SPF/DKIM e remetente do Resend;
- cron da Vercel, observabilidade e alertas;
- backups/PITR e processo de restauração;
- homologação financeira real controlada;
- aviso de privacidade/LGPD e resposta a incidentes.

As pendências de produto e segurança residuais estão detalhadas em
AUDITORIA-PRODUCAO.md. Não declarar a plataforma “100% pronta” enquanto os itens
externos e os testes ponta a ponta continuarem abertos.

## 11. Regras para manutenção

- Ler AGENTS.md e a documentação da versão instalada em
  node_modules/next/dist/docs antes de alterar Next.js.
- Preferir Server Components; usar Client Components apenas para interação.
- Validar autenticação, propriedade e permissões no servidor.
- Não usar service role no navegador.
- Preservar navegação por URL e layouts persistentes; não substituir rotas por
  estado local sem endereço.
- Reutilizar app-bg e os tokens de app/globals.css.
- Tratar os SQLs como mudanças incrementais e revisar ordem/dependências.
- Atualizar este documento junto de alterações de rota, schema, shell ou fluxo.
- Registrar em AUDITORIA-PRODUCAO.md apenas verificações realmente executadas.
