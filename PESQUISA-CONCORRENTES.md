# Pesquisa de concorrentes e oportunidades — RankFTV

> Pesquisa inicial realizada em **03/09/2026** com base em páginas públicas,
> centrais de ajuda e lojas de aplicativos dos próprios produtos. Recursos,
> preços e números apresentados pelos concorrentes são autodeclarados e devem
> ser confirmados por teste prático antes de orientar uma decisão comercial.

## 1. Objetivo

Entender o que plataformas de ingressos, torneios esportivos e gestão de
arenas fazem bem, onde deixam atrito e quais experiências o RankFTV pode
entregar melhor.

Esta pesquisa não propõe transformar o RankFTV em uma cópia de uma bilheteria
genérica nem retomar um ranking nacional na V1. O foco atual continua sendo:

1. operação completa de campeonatos de futevôlei;
2. compra segura e simples para atleta e plateia;
3. gestão de arenas, alunos, aulas e cobranças;
4. experiência confiável antes, durante e depois do evento.

### Estado do RankFTV em 03/09/2026

Já foram homologados no Sandbox: duas credenciais individuais por dupla,
e-mail compartilhado opcional, recuperação exata por CPF + e-mail + OTP, troca
protegida com invalidação dos links antigos, suporte exclusivo do CEO com
auditoria e acompanhamento de entrega pelo webhook de e-mail. Esses itens agora
viram regressão obrigatória, não lacuna de produto.

O principal risco ainda aberto na jornada de compra é o fechamento financeiro:
o teste de reembolso de R$ 108,00 terminou como `CANCELLED` no processador. A
interface e a conciliação tratam o estado com segurança, mas ainda falta provar
um Pix e um cartão com devolução `DONE`. Também falta comunicar automaticamente
mudanças de data, horário ou local aos titulares de ingressos pagos.

## 2. Tese de diferenciação

As plataformas genéricas são fortes em descoberta, marketing e bilheteria.
As plataformas esportivas são fortes em chaves, ranking, placar e comunidade.
Os sistemas de arena são fortes em agenda, recorrência, ocupação e alunos.

O espaço mais interessante para o RankFTV é unir esses três mundos sem deixar
a experiência pesada:

> **A plataforma que entende a jornada completa do futevôlei: arena, dupla,
> categoria, campeonato, ingresso individual, chamada do jogo e operação
> financeira.**

O diferencial imediato não deve ser “ter mais telas”. Deve ser reduzir os
problemas que hoje acabam em planilha, direct e grupo de WhatsApp:

- inscrição errada ou duplicada;
- parceiro sem acesso ao próprio ingresso;
- categoria incompatível com o nível;
- pagamento sem confirmação clara;
- troca de e-mail ou titularidade insegura;
- alteração de data que não chega aos atletas;
- fila no check-in;
- atleta sem saber horário, quadra ou próxima partida;
- resultado corrigido sem rastreabilidade;
- organizador sem saber o valor líquido ou quando receberá;
- suporte sem histórico do que aconteceu.

## 3. Concorrentes e referências

### 3.1 Venda de ingressos e gestão de eventos

| Referência | Forças declaradas | O que devemos verificar na prática |
|---|---|---|
| **Sympla** | Marketplace forte, página do evento, lotes automáticos, cupons por canal, check-in por QR, relatórios, comunicação e antecipação | Tempo para publicar; clareza das taxas; compra no mobile; recuperação do ingresso; antifraude no QR; permissões da equipe; qualidade do suporte |
| **Eventbrite** | Descoberta, checkout incorporado, lista de espera, ingresso no celular/carteira, transferência, reembolso, marketing, analytics e app do organizador | Quantos passos exigem conta; facilidade para editar comprador; comunicação de mudança; reembolso total/parcial; origem das vendas; experiência internacional versus necessidades brasileiras |
| **Doity** | Site do evento, formulários, Pix/cartão/boleto, lotes, mailing, pesquisa, app/web/totem e opção de check-in offline | Experiência offline real; sincronização entre aparelhos; cadastro longo; personalização; comunicação e tratamento de reembolso |
| **Ticket Sports** | Foco em eventos esportivos, inscrições por etapas/categorias, kits e produtos extras, gestão e suporte especializado | Jornada do atleta; estoque por tamanho de camisa; equipes/assessorias; políticas de troca; relatórios esportivos; suporte no dia do evento |

#### Aprendizados para o RankFTV

- Marketplace e confiança de marca aumentam conversão; uma página bonita não
  basta se o comprador não sentir segurança no pagamento e no pós-venda.
- O total, a taxa e o valor líquido precisam aparecer sem surpresa.
- Recuperar, transferir, corrigir e cancelar um ingresso é parte da compra, não
  apenas trabalho de suporte.
- Lotes, lista de espera, campanhas e origem da venda ajudam o organizador a
  vender; não são apenas recursos administrativos.
- Check-in deve ter plano de contingência para internet ruim e vários aparelhos.
- O painel precisa mostrar venda, presença, reembolso e repasse como uma única
  história, sem obrigar o organizador a entender o processador financeiro.

### 3.2 Torneios, futevôlei e esportes de areia

| Referência | Forças declaradas | O que devemos verificar na prática |
|---|---|---|
| **Arena360** | Inscrição e pagamento, WhatsApp automático, sorteio reproduzível, grupos + mata-mata, placar ao vivo por quadra, telão PWA e histórico do atleta | Velocidade do placar; atraso e troca de quadra; mensagens automáticas; experiência do árbitro; regras de desempate; transparência do sorteio |
| **Fastis** | Descoberta por local, pagamentos, relatórios, vários formatos de disputa, níveis, ligas, rankings e notificações de partidas | Cadastro da dupla; alteração de parceiro; programação; variedade de chaves; relatório financeiro; compreensão do ranking pelo atleta |
| **LetzPlay** | Base ampla em esportes de raquete/areia, duplas, categorias, fila de espera, rankings variados e ampla intervenção administrativa | Quantidade de passos; dependência de app; tratamento da fila; W.O.; correção de resultado e seus efeitos nas fases seguintes; auditoria das ações do admin |
| **Rancker** | Posicionamento competitivo de futevôlei, ELO, desafios, badges, Hall da Fama e evolução | Validar adoção real, torneios ativos e governança; clareza do cálculo; prevenção de resultado combinado; separação de gênero, nível e região |
| **Brabo** | Aplicativo com marca do circuito, ranking de atleta e dupla, analytics, comunicação, patrocinadores e histórico por temporada | Custo de implantação; dependência de app; valor da marca própria; retenção entre etapas; métricas entregues aos patrocinadores |

#### Aprendizados para o RankFTV

- A experiência esportiva não acaba quando o pagamento confirma. Horários,
  quadras, chamada, placar e resultado são os momentos de maior uso.
- Ranking só gera confiança se tiver regra publicada, identidade única,
  resultado validado, correção auditada e processo de contestação.
- Um resultado corrigido deve recalcular automaticamente grupo, classificação
  e fases dependentes, ou bloquear a alteração e orientar o operador.
- A dupla é uma entidade esportiva, mas cada atleta precisa manter identidade,
  comunicação, credencial e histórico próprios.
- Comunicação imediata sobre próxima partida, atraso e troca de quadra pode ser
  mais valiosa na V1 do que uma rede social.
- Patrocinador precisa de espaço e resultado mensurável, não apenas um logo no
  banner.

### 3.3 Gestão de arenas

| Referência | Forças declaradas | O que devemos verificar na prática |
|---|---|---|
| **Super Arena** | App do aluno, turmas, presença, fila automática, push, Pix, Totalpass/Wellhub, comunidade e procura de dupla | Adoção do app; preenchimento de vagas; regras de cancelamento; qualidade da comunidade; visão por professor |
| **ArenaAi** | Agenda, alunos, pagamentos, ocupação, aulas experimentais e automações para inadimplência/remanejamento | O que é automação real; taxa de ocupação; conversão do experimental; cobrança; alertas úteis versus excesso de mensagens |
| **Arena Manager** | Turmas fixas, mensalidade automática, avulso, reposição de aula, agenda e comissão do professor | Regras de crédito/reposição; no-show; comissão; agenda de múltiplas quadras; conciliação financeira |

#### Aprendizados para o RankFTV

- O dono compra redução de trabalho: menos cobrança manual, menos vaga vazia e
  menos pergunta repetida no WhatsApp.
- Fila de espera, crédito de reposição, política de ausência e lembrete de
  cobrança têm impacto direto na receita da arena.
- O aluno deve ver em uma tela: próxima aula, presença, mensalidade, créditos e
  ações disponíveis.
- A conexão entre arena e campeonato é uma oportunidade própria do RankFTV:
  transformar aluno em participante sem preencher tudo novamente.

## 4. Onde o RankFTV pode ser melhor

### 4.1 Melhor jornada de inscrição em dupla

- Compra sem exigir conta, mantendo segurança no pós-venda.
- Um pagamento para a dupla e duas credenciais individuais.
- Opção clara de usar o mesmo e-mail para os dois atletas.
- Confirmação visual dos dois nomes e e-mails antes de pagar.
- Detecção de CPF duplicado e inscrição ativa antes de gerar cobrança.
- Convite ou confirmação do parceiro quando a regra do campeonato exigir.
- Troca de titularidade segura, com invalidação imediata dos links anteriores.
- Categoria recomendada ou alertada sem prometer um ranking nacional.

### 4.2 Pós-compra mais confiável

- Página do ingresso acessível sem depender exclusivamente do e-mail.
- Recuperação por CPF + e-mail + código temporário, sem revelar se o cadastro
  existe antes da validação.
- Status simples: pagamento, ingresso, check-in e reembolso.
- Aviso importante para os dois atletas quando data, horário ou local mudar.
- Histórico do cliente com somente eventos úteis; detalhes operacionais ficam
  no painel do CEO.
- PDF individual e, futuramente, Apple Wallet/Google Wallet oficiais.
- Mensagens neutras ao cliente, sem expor nomes de fornecedores internos.

### 4.3 Melhor operação no dia do campeonato

- Scanner rápido, busca manual e código alternativo.
- Credencial individual para saber qual integrante chegou.
- Modo de contingência para conexão ruim: lista exportável e estratégia de
  sincronização segura antes de prometer check-in offline.
- Visão “central de operação”: atletas aguardando, quadra atual, próxima
  partida, atrasos e pendências.
- Modo árbitro simples para lançar placar, com confirmação e auditoria.
- Telão público instalável como PWA, com placar e chamada por quadra.
- Notificação somente quando houver ação: “prepare-se”, “dirija-se à quadra” e
  “resultado publicado”.

### 4.4 Melhor experiência para o organizador

- Assistente de publicação com barra de progresso e validação antes de abrir
  vendas.
- Duplicar campeonato anterior, categorias, lotes e regras.
- Modelos prontos por tamanho do torneio e formato de disputa.
- Financeiro começando pelo saldo líquido, seguido de pagamentos, chave de
  recebimento, vendas por dia e pendências.
- Previsão de repasse com explicação simples de retenções e reembolsos.
- Lista de espera automática por categoria.
- Permissões mínimas para check-in, inscrições, placar e financeiro.
- Logs pesquisáveis por período, pessoa, ação e campeonato.
- Exportação útil para emergência, contabilidade e patrocinadores.

### 4.5 Retenção sem virar uma rede social genérica

- Seguir arena, circuito ou organizador e receber próximos eventos.
- Favoritar campeonatos e ativar lembrete de abertura de inscrição.
- Histórico esportivo pessoal baseado apenas em resultados validados.
- Ranking opcional **por arena ou circuito**, não nacional na V1.
- Perfil da dupla por temporada, sem prender permanentemente dois atletas.
- Procura de parceiro com disponibilidade, nível e cidade, somente com
  consentimento explícito.
- Benefícios de patrocinadores ligados a eventos e arenas relevantes.

## 5. Ranking: o que estudar antes de construir

O apelo de ranking é forte nos concorrentes, mas construir rapidamente pode
gerar mais discussão do que retenção. Antes de implementar qualquer ranking
público, responder:

1. Quem reconhece o ranking: arena, circuito, liga ou federação?
2. Pontua por vitória, fase alcançada, força do adversário ou combinação?
3. Como categorias e gêneros são separados?
4. Como entram atletas novos sem favorecer ou punir excessivamente?
5. Como tratar W.O., desistência, dupla alterada e partida anulada?
6. Quem pode lançar o placar e quem confirma?
7. Como contestar e corrigir um resultado?
8. Uma correção recalcula todas as consequências automaticamente?
9. Existe decaimento, temporada e descarte de piores resultados?
10. Como impedir duplicidade de identidade e manipulação de partidas?
11. A regra e todo histórico de alteração são públicos e compreensíveis?
12. Há autorização legítima para chamar o ranking de “oficial”?

Recomendação: se esse produto voltar ao roadmap, começar com ranking privado de
um circuito parceiro, publicar o regulamento e rodar uma temporada piloto.

## 6. Roteiro de pesquisa prática (mystery shopping)

Não realizar pagamentos ou publicar eventos reais sem autorização. Usar
eventos gratuitos, demos ou ambientes de teste sempre que possível.

### 6.1 Jornada do comprador/atleta

Testar em cada plataforma, primeiro em tela mobile estreita:

1. encontrar um evento por cidade, data e modalidade;
2. entender categoria, vagas, preço total e política de cancelamento;
3. iniciar a inscrição e contar campos, telas e decisões;
4. verificar se exige conta antes da compra;
5. observar como funciona uma inscrição em dupla;
6. simular e-mail digitado errado e recuperação de ingresso;
7. conferir confirmação, recibo, QR, PDF, carteira e calendário;
8. localizar suporte, troca de titular e reembolso;
9. verificar o que acontece quando a data ou local muda;
10. medir tempo total e registrar cada ponto de dúvida.

### 6.2 Jornada do organizador

1. criar um evento gratuito de teste;
2. configurar categorias, vagas, gêneros, lotes e cupons;
3. configurar dupla, camisa/kit e campos obrigatórios;
4. adicionar staff com acesso limitado;
5. simular lista cheia e lista de espera;
6. exportar inscritos e relatório financeiro;
7. corrigir atleta, categoria e resultado;
8. montar grupos, mata-mata e horários por quadra;
9. disparar um comunicado importante;
10. localizar ajuda e medir o tempo para resolver uma dúvida.

### 6.3 Operação do evento

1. testar QR válido, duplicado, cancelado e de outro evento;
2. testar busca manual e desfazer check-in conforme permissão;
3. testar dois ou mais celulares simultaneamente;
4. testar internet lenta e perda total de conexão;
5. lançar e corrigir placares;
6. mudar horário/quadra e conferir quem é avisado;
7. acompanhar telão e página pública em um celular comum;
8. encerrar categoria e conferir ranking/classificação/histórico.

## 7. Planilha de avaliação sugerida

Dar nota de **1 a 5** e registrar evidência (print, vídeo curto ou link):

| Critério | Peso | Métrica objetiva |
|---|---:|---|
| Compra mobile | 15% | Tempo, número de campos e abandono percebido |
| Clareza de preço e taxa | 10% | Total aparece antes do pagamento e sem surpresa |
| Jornada da dupla | 15% | Identidade, parceiro, dois acessos e correções |
| Recuperação e pós-venda | 10% | Ingresso, suporte, troca e reembolso |
| Operação esportiva | 15% | Chaves, quadras, placar, atraso e W.O. |
| Check-in e contingência | 10% | Velocidade, duplicidade, permissões e internet ruim |
| Comunicação | 10% | Entrega, segmentação, urgência e histórico |
| Financeiro do organizador | 10% | Líquido, taxas, repasse, conciliação e exportação |
| Acessibilidade e confiança | 5% | Linguagem, contraste, privacidade e erros claros |

Manter uma linha para cada concorrente e outra para o RankFTV. Repetir o teste
a cada trimestre, pois os produtos mudam.

## 8. Métricas que realmente mostram uma experiência melhor

### Comprador e atleta

- conversão da página do campeonato até pagamento confirmado;
- abandono por etapa e por campo do checkout;
- tempo mediano para comprar uma inscrição de dupla;
- taxa de pagamentos aprovados e confirmações automáticas;
- entrega de e-mail e tempo até o primeiro acesso ao ingresso;
- sucesso da recuperação sem atendimento;
- chamados por 100 compras e motivo do chamado;
- tempo e taxa de conclusão de reembolsos;
- leitura de comunicados críticos por atleta.

### Organizador e operação

- tempo para criar e publicar o primeiro campeonato;
- categorias preenchidas e conversão da lista de espera;
- tempo médio de check-in e fila máxima;
- leituras inválidas/duplicadas por 100 entradas;
- partidas iniciadas no horário;
- correções de placar e W.O. por campeonato;
- tempo gasto resolvendo pendências financeiras;
- organizadores que criam um segundo evento;
- receita recorrente e ocupação das arenas.

## 9. Prioridade recomendada

### Antes de pagamentos reais — confiança e operação

1. concluir todas as pendências P0 já registradas em `PENDENCIAS-V1.md`;
2. concluir um estorno Pix e um de cartão com `DONE`, inclusive autorização,
   conciliação e falhas terminais como `CANCELLED`;
3. enviar alertas importantes quando data, horário ou local mudar;
4. manter regressão automatizada e smoke de entrega, recuperação, troca de
   titularidade e invalidação;
5. documentar e testar a contingência de check-in sem conexão;
6. executar o smoke final completo em produção controlada.

### Primeiros 30–90 dias — ganhar no campeonato

1. lista de espera automática por categoria;
2. programação por quadra e chamada da próxima partida;
3. placar ao vivo e telão público leve;
4. onboarding do organizador com checklist e duplicação de evento;
5. origem das vendas e relatório simples para patrocinador;
6. entrevistas após cada campeonato e correção dos maiores atritos.

### Depois de uso recorrente — retenção

1. seguir arena/organizador e avisos de novas inscrições;
2. créditos, reposição e lista de espera das aulas da arena;
3. procura de dupla com privacidade e consentimento;
4. ranking piloto por circuito/arena com governança publicada;
5. PWA mais completa e passes oficiais de carteira digital;
6. integrações comerciais e benefícios de patrocinadores.

## 10. Perguntas para entrevistas

### Atletas

- Qual foi a última vez que uma inscrição te deu trabalho?
- Em que momento você ficou inseguro sobre pagamento ou vaga?
- Como você descobre horário e quadra da próxima partida?
- O que acontece quando seu parceiro desiste?
- Você confia nos rankings que usa? Por quê?
- Qual aviso você não pode deixar de receber?

### Organizadores

- Quais planilhas e grupos são indispensáveis hoje?
- O que mais consome tempo antes, durante e depois do campeonato?
- Qual erro mais prejudica a reputação do evento?
- Como resolve categoria cheia, W.O. e troca de parceiro?
- Como comunica atraso, mudança de data e chamada de quadra?
- Que número um patrocinador sempre pede e você não consegue entregar?

### Donos de arena

- Quantas vagas ficam vazias por cancelamento tardio?
- Como controla reposição, crédito, mensalidade e inadimplência?
- Quanto tempo a equipe gasta respondendo mensagens repetidas?
- Como um aluno vira participante de campeonato?
- O que faria você pagar mensalmente por uma plataforma?

## 11. Fontes consultadas

### Ingressos e eventos

- [Sympla para produtores](https://produtores.sympla.com.br/como-funciona/)
- [Check-in Sympla](https://produtores.sympla.com.br/funcionalidades/check-in-para-eventos/)
- [Taxas da Sympla](https://ajuda.sympla.com.br/hc/pt-br/articles/204767415-Taxas-da-Sympla-para-Organizadores-Valores-e-Como-Funcionam)
- [Eventbrite para organizadores](https://www.eventbrite.com.br/organizer/overview/)
- [Comparação de recursos da Eventbrite](https://www.eventbrite.com.br/organizer/compare-packages/)
- [Experiência do ingresso no app Eventbrite](https://www.eventbrite.com.br/help/pt-br/articles/783059/)
- [Reembolsos na Eventbrite](https://www.eventbrite.com.br/help/pt-br/articles/990713/a-eventbrite-pode-emitir-reembolsos-para-meus-participantes/)
- [Plataforma Doity](https://doity.com.br/organize/eventos/)
- [Check-in offline da Doity](https://ajuda.doity.com.br/pt-br/article/aplicativo-de-check-in-para-eventos-1mjzoi6/)
- [Ticket Sports — funcionalidades](https://www.ticketsports.com.br/Funcionalidades)

### Torneios e futevôlei

- [Arena360](https://arena360.sbs/)
- [Fastis — aplicativo](https://play.google.com/store/apps/details?id=com.app.fastis&hl=pt_BR)
- [Fastis — torneios de futevôlei](https://www.fastis.com/torneios/17/futevolei)
- [LetzPlay — criação de torneio](https://help.letzplay.me/hc/pt-br/articles/360059484571-Passo-02-Crie-seu-torneio)
- [LetzPlay — gestão de inscrições](https://help.letzplay.me/hc/pt-br/articles/360059484631-Passo-03-Gerencie-as-inscri%C3%A7%C3%B5es)
- [LetzPlay — rankings](https://help.letzplay.me/hc/pt-br/articles/360059528971-Entendendo-a-%C3%A1rea-de-Rankings)
- [LetzPlay — correção de resultado](https://help.letzplay.me/hc/pt-br/articles/7672762653453-Como-corrigir-um-resultado-informado-incorretamente)
- [Rancker](https://rancker.com/atleta)
- [Brabo para futevôlei](https://www.gobrabo.com/futevolei)

### Arenas

- [Super Arena](https://www.superarena.com.br/)
- [ArenaAi](https://arenai.com.br/)
- [Arena Manager para futevôlei](https://arenamanager.com.br/gestao/arena-de-futevolei)

## 12. Próxima rodada da pesquisa

1. Escolher três referências prioritárias para teste completo: uma de
   bilheteria, uma de torneio e uma de arena.
2. Fazer gravação de tela das jornadas permitidas, sem concluir pagamentos
   reais.
3. Preencher a planilha de notas com evidências.
4. Entrevistar pelo menos cinco atletas, três organizadores e três donos de
   arena.
5. Transformar apenas os três maiores problemas confirmados em backlog.
6. Repetir a comparação depois dos primeiros campeonatos reais do RankFTV.
