# Memória de marca e comunicação — RankFTV

Status: **entrevista de descoberta em andamento**.

Última atualização: **11/11/2026 20:20, America/Sao_Paulo**.

Este documento é a fonte canônica para posicionamento público, públicos,
mensagens, tom de voz, identidade visual e criação de conteúdo do RankFTV. Ele
complementa a memória técnica; não substitui `CONTEXTO-PROJETO.md`, `ftv.md`,
`DOCUMENTACAO.md` nem `PENDENCIAS-V1.md`.

## Como interpretar este documento

Cada afirmação estratégica deve ter um destes estados:

- **Aprovado por Carlos:** decisão final que pode orientar conteúdo e peças.
- **Observado:** estado atual do produto, código ou material existente; não é
  automaticamente uma decisão final de marca.
- **Hipótese:** proposta que ainda precisa ser discutida e aprovada.
- **Em aberto:** resposta ainda não coletada na entrevista.

Nenhum agente deve transformar hipótese ou item em aberto em promessa pública.
Quando uma peça depender de decisão ausente, deve pedir a definição antes de
produzir a versão final.

## 1. Base observada

### Produto

- **Observado:** RankFTV é uma plataforma web para descoberta, venda, operação
  e gestão de campeonatos de futevôlei, com uma área de Arenas ainda Beta.
- **Observado:** a V1 comercial está limitada a Campeonatos.
- **Observado:** o produto atende organizadores, atletas, compradores de
  ingressos e staff; Arenas são um público futuro ou secundário enquanto o
  módulo permanecer Beta.
- **Observado:** o produto combina operação, checkout, credenciais, check-in,
  chaveamento, comunicação e financeiro em uma única plataforma.
- **Aprovado por Carlos:** o RankFTV foi criado para hospedar campeonatos de
  futevôlei e permitir que atletas e plateia comprem seus respectivos ingressos
  dentro da plataforma.
- **Aprovado por Carlos:** o cliente comercial prioritário é o organizador do
  evento. Atletas e plateia são usuários e compradores essenciais, mas não são
  o foco principal da aquisição neste momento.
- **Aprovado por Carlos:** o organizador cadastra o evento e divulga o link do
  RankFTV à própria comunidade. As inscrições e compras realizadas nesse fluxo
  geram a receita da plataforma.
- **Aprovado por Carlos:** a monetização atual é por comissão/taxa sobre as
  vendas do evento; o restante pertence ao organizador conforme as regras
  financeiras aplicáveis.
- **Aprovado por Carlos:** anúncios, prospecção e comunicação de aquisição devem
  priorizar organizadores. Uma frente ou perfil separado voltado aos atletas
  pode ser desenvolvido depois, mas não é prioridade agora.

### Identidade visual atual (v3 — aprovada por Carlos em 11/11/2026)

- **Aprovado por Carlos:** símbolo "R" oficial original preservado e recolorido para laranja vívido (`#FF5D00`) com estrela vazada (`app/icon.png` em `512x512` e `public/brand-icon.png` recortado em `448x424`).
- **Aprovado por Carlos:** wordmark em texto usando `Rank` branco + `FTV` `#72BF00` sobre fundo escuro (`#0E4937`) e `Rank` `#0E4937` + `FTV` `#FF5D00` sobre fundo claro.
- **Aprovado por Carlos:** nova paleta oficial **Forest Teal + Light Beige + Lime Green + Vivid Orange** em toda a plataforma comercial (preservando o tema escuro próprio `.life-os-theme` em rotas pessoais de `/admin`), com base clara `#FBE9D1`, escuro estrutural `#0E4937`, ação primária `#FF5D00`, acento `#72BF00` e estados semânticos preservados (`#16A34A`, `#D97706`, `#DC2626`).
- **Aprovado e implementado:** banners promocionais 3D da Home substituídos pelas artes na paleta Forest Teal (`public/banners/para-organizadores-arenas-desktop.webp` em `1600x460` para barra desktop horizontal enxuta `md:max-w-[840px]` e `public/banners/para-organizadores-arenas-mobile.webp` em `1200x800`).

## 2. Fundamentos da marca

- **Propósito — hipótese para aprovação:** tornar mais simples e profissional a
  forma como campeonatos de futevôlei são colocados no ar, vendidos e
  acompanhados, sendo uma parceira próxima do organizador.
- **Visão de futuro:** Em aberto.
- **Transformação do organizador — hipótese para aprovação:** ter uma estrutura
  digital melhor para o evento, com taxa competitiva, acompanhamento e suporte
  próximo, enquanto a plataforma processa as inscrições e ingressos.
- **Transformação de atletas e plateia — aprovado por Carlos:** conseguir
  comprar no site o ingresso adequado para participar ou assistir ao evento.
- **Crença central — hipótese para aprovação:** quem organiza um campeonato não
  deveria receber apenas uma ferramenta de cobrança; deveria contar com uma
  plataforma que acompanhe a operação e esteja próxima quando precisar.
- **Personalidade — aprovado por Carlos:** amigável, séria, profissional,
  próxima e persuasiva.
- **Percepções prioritárias — aprovadas por Carlos:**
  1. **Confiável:** transmite segurança para o organizador colocar seu evento e
     sua operação na plataforma.
  2. **Organizada e simples:** centraliza o campeonato sem acrescentar
     complicação desnecessária.
  3. **Próxima:** oferece atendimento humano e acompanha o organizador.
  4. **Moderna e profissional:** entrega uma experiência visual e operacional à
     altura do evento.
- **Valores que precisam aparecer nas decisões — aprovados:** confiabilidade,
  organização, simplicidade, proximidade, modernidade e profissionalismo.
- **Percepções que a marca nunca deve causar — aprovadas por Carlos:**
  amadora ou improvisada; fria e distante; complicada ou burocrática; instável
  ou insegura; exagerada ou agressiva na venda.

## 3. Posicionamento público

- **Categoria mental — hipótese para aprovação:** plataforma parceira do
  organizador de campeonatos de futevôlei.
- **Público primário — aprovado por Carlos:** organizadores de eventos e
  campeonatos de futevôlei.
- **Recorte inicial do público — aprovado por Carlos:** organizadores de
  campeonatos pequenos e médios. Grandes campeonatos não são a prioridade
  inicial porque normalmente já possuem contratos ou relações com outras
  plataformas e tendem a exigir uma troca comercial mais difícil.
- **Abrangência geográfica — aprovada por Carlos:** Brasil inteiro. A entrega é
  online e a aquisição não deve ficar limitada à cidade ou à região dos
  fundadores.
- **Quantidade de duplas:** não usar como filtro por enquanto. Ela varia
  conforme o campeonato e Carlos ainda não possui uma faixa validada.
- **Problema de maior valor — aprovado em nível inicial:** o organizador precisa
  de um lugar melhor para hospedar, vender e acompanhar o evento, com taxa mais
  baixa e suporte mais próximo. As dores concretas ainda serão detalhadas na
  próxima etapa da entrevista.
- **Alternativas usadas hoje — aprovadas em nível inicial:** processos manuais,
  WhatsApp, planilhas e outras plataformas de eventos.
- **Promessa desejada — aprovado por Carlos:** oferecer um site melhor, taxa
  baixa e suporte/acompanhamento personalizado ao organizador.
- **Condição para comunicar a promessa:** “taxa baixa” precisa ser sustentada
  pela tabela comercial e, se houver comparação com concorrentes, por pesquisa
  atual. “Suporte personalizado” precisa ter canal, responsável, horário e
  prazo de resposta que a operação consiga cumprir.
- **Diferencial defendível — hipótese para aprovação:** unir plataforma
  especializada em futevôlei, experiência completa do evento, taxa competitiva
  e relacionamento próximo com o organizador.
- **Objetivo competitivo — aprovado por Carlos:** conquistar também
  organizadores que já utilizam outra plataforma, demonstrando por que o
  RankFTV é uma escolha melhor para a realidade deles.
- **Regra para comparação:** “melhor” é uma intenção de posicionamento, não uma
  alegação publicitária pronta. Toda comparação deve indicar critérios
  verificáveis, como taxa, recursos, facilidade de uso e suporte, sem afirmar
  superioridade genérica ou depreciar concorrentes.
- **Razões para acreditar — observadas:** fluxos de evento, inscrição, ingresso
  de atleta e plateia, pagamentos, credenciais, check-in, chaveamento e
  financeiro existem no produto, respeitando o estado real de cada release.
- **Frase de posicionamento — hipótese:** “O RankFTV é a plataforma parceira de
  quem organiza campeonatos de futevôlei: reúne o evento, as vendas e a operação
  em um só lugar, com taxa competitiva e suporte próximo.”
- **Pitch curto — hipótese:** “Você coloca o campeonato no RankFTV, divulga o
  link e concentra inscrições, ingressos e operação em uma experiência
  profissional para você, para os atletas e para a plateia.”
- **Promessa central — aprovada por Carlos:** “Organize seu
  campeonato inteiro em um só lugar, com suporte de verdade e uma experiência
  profissional.” Organização centralizada deve liderar; suporte próximo e taxa
  competitiva funcionam como diferenciais, não como a única razão de compra.
- **Tagline:** Em aberto.

Uma promessa só pode ser aprovada quando estiver compatível com o produto
real. Não anunciar funcionalidade em PR, Beta ou somente local como disponível
em Production.

## 4. Públicos e decisão de foco

Segmentos observados no produto, com prioridade inicial definida para
aquisição:

| Segmento | Necessidade observada | Estado para comunicação |
| --- | --- | --- |
| Organizador de campeonato | hospedar, divulgar, vender e operar o evento com uma estrutura melhor, taxa competitiva e suporte próximo | **Público comercial primário aprovado** |
| Atleta | descobrir campeonato, formar dupla, pagar e acessar sua credencial | Usuário/comprador essencial; aquisição dedicada fica para etapa futura |
| Comprador/plateia | comprar e recuperar ingresso com segurança | Público transacional da V1 |
| Staff | executar funções autorizadas do evento | Usuário operacional, não necessariamente comprador |
| Dono ou equipe de arena | gerir alunos, aulas e cobranças | Não priorizar comercialmente enquanto Arena permanecer Beta |

### Perfil inicial do organizador — aprovado por Carlos

- organiza campeonatos pequenos ou médios de futevôlei;
- pode estar em qualquer região do Brasil;
- ainda administra partes do evento por WhatsApp, planilhas ou outros processos
  manuais; ou
- já utiliza outra plataforma e pode considerar a troca se o RankFTV provar
  vantagens relevantes para a sua operação.

Esse perfil não possui, por enquanto, uma quantidade mínima ou máxima de
duplas. O porte será refinado depois com dados de clientes e campeonatos reais.

### Dores do organizador — aprovadas por Carlos

O público não precisa enfrentar todas as dores ao mesmo tempo. Cada campanha
ou abordagem pode partir do problema que corresponde à realidade daquele
organizador:

1. **Inscrições desorganizadas:** dificuldade para concentrar e acompanhar as
   inscrições do campeonato.
2. **Controle de duplas:** trabalho e risco de erro para organizar participantes
   e suas respectivas duplas.
3. **Chaveamento e resultados:** dificuldade para definir os confrontos,
   acompanhar quem enfrenta quem e registrar o resultado de cada partida.
4. **Taxas altas:** percepção de que o custo cobrado pela solução atual reduz a
   atratividade ou o resultado financeiro do evento.
5. **Experiência visual ruim:** plataformas que não apresentam o campeonato de
   maneira bonita, moderna e profissional.
6. **Lentidão e travamentos:** páginas e operações que demoram para carregar ou
   falham durante o uso.

### Consequências — hipóteses para validar com organizadores reais

- perda de tempo e excesso de trabalho manual;
- maior chance de erro na operação do campeonato;
- insegurança ou confusão para organizador, atletas e plateia;
- percepção menos profissional do evento;
- desgaste com participantes e perda de confiança na organização.

Essas consequências ajudam a construir mensagens, mas não devem ser tratadas
como fala comprovada do mercado até existirem entrevistas, depoimentos ou
dados reais.

### Objeção principal — aprovada por Carlos

O maior obstáculo esperado é a falta de histórico do RankFTV. Por ser uma
plataforma nova e ainda desconhecida pelo organizador, ele pode:

- ter receio de confiar a operação e as inscrições do campeonato ao RankFTV;
- temer que algo falhe antes ou durante o evento;
- buscar provas de estabilidade, segurança e capacidade de atendimento antes
  de tomar a decisão.

Carlos acredita que a qualidade do trabalho e a clareza das vantagens tornarão
o valor da plataforma evidente. Essa é uma convicção interna importante para a
marca, mas a resposta do mercado ainda precisa ser observada: dúvidas sobre
vantagem, preço ou troca não devem ser descartadas antes de entrevistas e
campanhas reais.

### Resposta à objeção — hipótese estratégica

A comunicação precisa trocar promessas genéricas por demonstrações e redução
de risco. Possíveis mecanismos, ainda sujeitos a aprovação e capacidade real:

- demonstração guiada da plataforma e da jornada completa do campeonato;
- acompanhamento próximo na configuração do primeiro evento;
- canal humano de suporte com disponibilidade e prazo definidos;
- evidências reais de testes, estabilidade e segurança, sem divulgar dados
  sensíveis nem confundir ambiente de teste com Production;
- relatos e resultados dos primeiros campeonatos, somente após acontecerem e
  com autorização;
- condição comercial inicial transparente, se o modelo financeiro permitir.

### Acompanhamento por modalidade — aprovado por Carlos

O RankFTV deve reduzir a insegurança sem transformar todo atendimento em uma
call individual:

- **Evento Padrão:** orientação autoguiada por uma futura página ou central do
  organizador, com explicações e imagens sobre configuração e uso da
  plataforma. Esse material ainda não foi localizado no produto e precisa ser
  produzido antes de ser prometido como disponível.
- **Evento de Elite / Plano Elite:** call ao vivo e personalizada com Carlos
  para apresentar as funcionalidades, explicar a operação e tirar dúvidas do
  organizador.

#### Estado observado no produto

- a contratação usa o nome **Evento de Elite** e o financeiro usa **Plano
  Elite**;
- a alternativa aparece como **Evento Padrão**, com `R$ 0 / evento` para criar;
- o Padrão mantém as taxas normais das transações e, portanto, não deve ser
  anunciado como “totalmente gratuito” ou “sem taxas”;
- a interface já lista suporte pelo WhatsApp no Padrão;
- a interface já lista call ao vivo com o CEO e suporte priorizado direto pelo
  WhatsApp como benefícios do Elite.

#### Estrutura do atendimento — aprovada por Carlos

- **Padrão:** central visual com guias de criação do evento, inscrições,
  pagamentos, duplas, chaveamento, resultados, check-in e financeiro, além da
  indicação clara do canal de suporte disponível.
- **Elite:** uma sessão de implantação por evento, agendada antes da abertura
  das inscrições, sem duração máxima anunciada. A conversa terá o tempo
  necessário para apresentar funcionalidades, revisar a configuração, explicar
  os fluxos críticos e tirar as dúvidas do organizador.
- **WhatsApp:** suporte normal e ativo enquanto as inscrições do campeonato
  estiverem abertas. Carlos pretende acompanhar as mensagens e responder aos
  problemas relatados pelo organizador.

Não anunciar “plantão”, “24 horas”, disponibilidade ininterrupta nem resposta
imediata. Horários, prazo esperado de resposta, agendamento e eventual suporte
especial no dia do campeonato permanecem sem promessa comercial definida.

Para cada público que for aprovado, a entrevista ainda definirá:

- contexto e perfil real;
- dor urgente e impacto financeiro ou operacional;
- objeções;
- gatilho de compra;
- resultado desejado;
- canais onde pode ser alcançado;
- prova necessária para acreditar;
- mensagem e chamada para ação adequadas.

## 5. Tom de voz

- **Atributos principais — aprovado por Carlos:** amigável, sério,
  profissional, próximo e persuasivo.
- **Nível de formalidade — aprovado por Carlos:** profissional sem parecer uma
  empresa distante ou excessivamente formal.
- **Energia e ritmo — aprovado por Carlos:** direto, confiante e ativo, com
  frases claras e foco no benefício concreto para o organizador.
- **Vocabulário do universo do futevôlei:** Em aberto.
- **Uso de humor — aprovado por Carlos:** leve e ocasional, somente quando
  combinar com o canal; nunca em pagamentos, incidentes, suporte crítico ou
  mensagens que precisem transmitir segurança.
- **Uso de emojis — aprovado por Carlos:** moderado em redes sociais e
  WhatsApp; mínimo ou ausente em páginas comerciais, financeiro, termos e
  comunicações sensíveis.
- **Como persuadir sem exagerar — aprovado em princípio:** vender os benefícios
  reais da plataforma, destacando qualidade do site, proximidade do suporte e
  taxa competitiva. Não usar comparação absoluta, urgência falsa ou promessa
  operacional que ainda não possa ser cumprida.
- **Expressões preferidas:** Em aberto.
- **Expressões proibidas:** Em aberto.
- **Exemplos aprovados de headline, legenda, anúncio e e-mail:** Em aberto.

### Regras práticas aprovadas

1. Falar com o organizador usando **“você”**, como uma conversa profissional e
   próxima.
2. Usar frases curtas, linguagem brasileira simples e verbos de ação.
3. Apresentar primeiro o problema real, depois o benefício concreto, uma prova
   disponível e uma chamada para ação simples.
4. Preferir termos do trabalho do organizador, como campeonato, inscrições,
   duplas, chaveamento, resultados, check-in e financeiro.
5. Evitar jargão corporativo, texto rebuscado, excesso de exclamações e pressão
   artificial.
6. Persuadir mostrando o produto e a vantagem, sem atacar concorrentes nem
   prometer resultado garantido.

Até a conclusão da entrevista, usar português brasileiro claro, direto e
humano. Evitar jargão de marketing, urgência artificial, garantias de resultado
e afirmações que não possam ser demonstradas.

## 6. Identidade visual

### Auditoria dos materiais existentes — observado em 20/10/2026

- `app/icon.png` e `path1.png` usam o símbolo azul em forma de **R**, com uma
  estrela branca integrada.
- `ank FTV.png` e `public/rankftv-mockup.png` combinam o símbolo com o nome
  **RankFTV** e uma apresentação da plataforma em desktop e celular.
- `public/banners/rankftv-organizadores-v1.png` usa fundo preto e azul,
  textura de areia, linhas de movimento e um monitor com painel ilustrativo.
- `public/banners/rankftv-atletas-futevolei-v1.png` usa fotografia esportiva,
  alto contraste, azul intenso, céu e areia.
- o produto usa **Inter** como tipografia principal.
- painéis ou números ilustrativos de peças existentes não servem como prova de
  funcionalidade ou resultado; anúncios finais devem usar telas e dados reais
  quando a intenção for demonstrar o produto.

### Direção visual recomendada — hipótese para aprovação

Evoluir a identidade atual para uma linguagem **sport-tech profissional**:

1. manter o símbolo “R” com estrela e desenvolver versões consistentes do
   símbolo, logotipo horizontal, monocromático, negativo e avatar;
2. manter azul elétrico, preto/grafite, branco e cinzas claros como núcleo da
   paleta;
3. usar alto contraste, áreas limpas e hierarquia forte para transmitir
   tecnologia, segurança e velocidade;
4. combinar fotografias reais de futevôlei com telas reais do RankFTV;
5. usar linhas, trajetórias e pontos inspirados na bola, no deslocamento e no
   chaveamento, sem poluir a composição;
6. manter Inter no produto e avaliar uma tipografia de impacto somente para
   títulos publicitários, preservando legibilidade e consistência;
7. reservar dourado/âmbar para o Evento de Elite e cores funcionais para
   sucesso, aviso e erro, sem competir com o azul da marca.

### Prévia visual v1 — rejeitada

Em 20/10/2026, a hipótese acima foi materializada em três imagens para revisão:

- `docs/brand/previews/simbolo-r-conceito-v1.png`: evolução do “R” com estrela;
- `docs/brand/previews/home-conceito-desktop-v1.png`: home desktop com o
  organizador no primeiro plano e a descoberta de campeonatos abaixo;
- `docs/brand/previews/home-conceito-mobile-v1.png`: a mesma hierarquia em
  mobile, preservando busca e navegação inferior.

As capturas reais usadas para comparação estão no mesmo diretório. Carlos
rejeitou a mudança de conteúdo e hierarquia porque a home é uma superfície da
plataforma, não uma landing page de aquisição. Os conceitos ficam somente como
histórico e não devem ser implementados.

### Limite aprovado para a home

- preservar as opções, seções, conteúdo e arquitetura atuais;
- não inserir hero comercial, promessa de venda ou merchandising para captar
  organizadores dentro da home da plataforma;
- manter o símbolo e o logotipo atuais enquanto uma mudança específica não for
  aprovada separadamente;
- permitir apenas uma modernização visual: paleta, contraste, superfícies,
  bordas, raios, sombras, tipografia, ícones e estados de interação;
- qualquer prévia seguinte deve ser uma edição visual da home real, sem criar,
  remover ou reorganizar funcionalidades.

### Modernização visual v2 — aprovada e implementada localmente

Carlos aprovou os sete pontos abaixo em 20/10/2026. A implementação preserva
o conteúdo, as opções e a arquitetura da home; ela ainda é estado do checkout
local e não evidência publicação em Production.

1. trocar o preto puro das áreas estruturais por grafite profundo, mantendo o
   azul elétrico como cor de ação, seleção e foco;
2. manter fundo azul-acinzentado claro e cartões brancos, mas aumentar a
   separação por borda fria e sombra curta, sem aparência pesada;
3. padronizar raios em 16 px para cartões e 20–24 px para superfícies amplas,
   reservando formato circular para ícones e controles próprios;
4. destacar cartão ou item selecionado com fundo azul muito claro, borda azul
   e ícone azul, em vez de colorir blocos inteiros sem necessidade;
5. manter Inter e reforçar a hierarquia com peso, tamanho e espaçamento, sem
   trocar textos ou acrescentar chamadas comerciais;
6. usar animações discretas de hover, foco e seleção, respeitando preferência
   por movimento reduzido;
7. manter a navegação e os componentes nos mesmos lugares em desktop e mobile.

### Identidade visual v3 — aprovada e implementada localmente (11/11/2026)

Carlos aprovou em 11/11/2026 a substituição definitiva do tema anterior (`#0000FF` + `#202020`/`#17191F` + `#F3F5FA`) pela paleta oficial **Forest Teal + Light Beige + Lime Green + Vivid Orange**, aplicada em toda a plataforma comercial na branch local `feat/paleta-forest-teal-vivid-orange` (preservando intacto o `.life-os-theme` das ferramentas pessoais em `/admin`):

1. **Base clara (`Light Beige`):** `#FBE9D1` (`--color-app-bg`) para fundo e sheet principal, `#FFFFFF` (`--color-surface`) para cards/modais/inputs (inclusive cards financeiros e DRE em fundo branco limpo), `#FFF8EE` (`--color-surface-2`) para superfícies internas sutis e `#E5CFAF` (`--color-border`) para bordas quentes. Texto principal `#0E4937` (`--color-ink`) e secundário `#3E685A` (`--color-ink-muted`).
2. **Escuro estrutural (`Forest Teal`):** `#0E4937` (`--color-brand-dark`) na sidebar desktop, cabeçalho da Home, cards escuros e rodapés, `#155C46` (`--color-brand-dark-2`) para superfícies/hover escuros e divisores translúcidos `rgba(251, 233, 209, 0.18)`.
3. **Primária de ação (`Vivid Orange`):** `#FF5D00` (`--color-brand`), `#E05100` (`--color-brand-hover`), `#B84300` (`--color-brand-ink` para texto acessível em fundo claro suave) e `#FFF0E6` / `#FFB385` (`--color-brand-soft` / `--color-brand-border`) em CTAs principais, busca, foco, pill flutuante e item ativo.
4. **Energia & acento (`Lime Green`):** `#72BF00` (`--color-accent`), `#64A800` (`--color-accent-hover`), `#EAF8D2` / `#97D439` (`soft` / `border`) e `#092B20` (`--color-accent-ink`). **Regra obrigatória de contraste:** nunca usar texto branco ou texto `#72BF00` sobre fundo claro; sempre usar `#092B20` sobre fundo `#72BF00`, e restringir texto `#72BF00` ao escuro `#0E4937`. Feixes luminosos da sidebar e das sheets usam gradiente `#72BF00 -> #FF5D00`.
5. **Semânticas preservadas:** sucesso/pago `#16A34A` / `#ECFDF3` (mantido distinto do `#72BF00`), aviso `#D97706` / `#FFFAEB` e erro/ao vivo `#DC2626` / `#FEF3F2` (botão `Ver ao vivo` em branco com borda/pulso `#DC2626` para não competir com `#FF5D00`).
6. **Logotipo, wordmark e CTAs chave:** símbolo `R` com estrela (`app/icon.png` e `public/brand-icon.png`) recolorido para `#FF5D00` com estrela branca; wordmark `Rank` branco + `FTV` `#72BF00` no escuro e `Rank` `#0E4937` + `FTV` `#FF5D00` no claro. No detalhe do campeonato, `Sou atleta` usa `#FFF3EB -> #FFFFFF` com borda `2px solid #FF5D00`, caixa do ícone `#FF5D00` e selo `INSCRIÇÃO` `#72BF00`/`#092B20`; `Vou assistir o evento` usa `bg-brand-dark` + acento `#72BF00`.

### Elementos a decidir

- arquitetura e versões complementares do logotipo horizontal/negativo;
- paleta oficial definida em v3 (em uso local na plataforma comercial);
- tipografia de títulos, corpo e números;
- grid, espaçamento, cantos e sombras;
- estilo fotográfico e direção de cena;
- grafismos, ícones, textura e tratamento das novas artes dos banners da Home;
- linguagem de movimento para vídeos;
- diferenças entre comunicação para organizador e atleta;
- regras para carrossel, anúncio, thumbnail e vídeo vertical;
- usos proibidos e requisitos de legibilidade/acessibilidade.

### Baseline técnico atual (v3 aprovada localmente em 11/11/2026)

| Papel | Valor atual |
| --- | --- |
| Ação primária / CTA (`Vivid Orange`) | `#FF5D00` (hover `#E05100`; ink claro `#B84300`) |
| Energia / Acento (`Lime Green`) | `#72BF00` (sobre escuro `#0E4937` ou fundo `#72BF00` + `#092B20`) |
| Base clara / Sheet (`Light Beige`) | `#FBE9D1` |
| Fundo escuro estrutural (`Forest Teal`) | `#0E4937` (secundário `#155C46`) |
| Superfície e cards | `#FFFFFF` e `#FFF8EE` (borda `#E5CFAF`) |
| Texto principal e secundário | `#0E4937` / `#3E685A` |
| Raio de card | 16 px; 24 px em superfícies maiores |

Esses valores refletem a implementação local da v3 na plataforma comercial e orientam novas peças e atualizações de interface.

## 7. Mensagens e provas

### Mensagens aprovadas

Pilares aprovados em nível conceitual, ainda sem copy final:

1. o organizador é o cliente prioritário;
2. o RankFTV hospeda o campeonato e centraliza a jornada de compra;
3. o organizador divulga um único link à comunidade do evento;
4. atletas e plateia compram os ingressos correspondentes pela plataforma;
5. a receita do RankFTV vem da comissão sobre as vendas;
6. taxa competitiva, plataforma melhor e suporte próximo devem sustentar a
   preferência pelo RankFTV, depois de definidos e comprovados.
7. a comunicação pode abordar separadamente organização das inscrições,
   controle de duplas, chaveamento e resultados, taxa, qualidade visual ou
   desempenho; não presumir que todo organizador enfrenta todas essas dores.

### Provas permitidas

- funcionalidades comprovadamente presentes no mesmo estado que será
  divulgado;
- demonstrações reais da interface;
- evidências operacionais sanitizadas e autorizadas;
- depoimentos e números somente com origem e autorização registradas.

### Alegações proibidas sem evidência específica

- “100% pronto”, “sem risco”, “garantido” ou equivalentes;
- promessa de aumento de receita, vendas ou lotação;
- números fictícios de campeonatos, atletas, arenas ou transações;
- disponibilidade pública de recurso Beta, em PR ou somente local;
- parceria, certificação ou aprovação não documentada;
- comparação depreciativa ou impossível de provar sobre concorrentes.

## 8. Contrato para conteúdo, vídeo e anúncios

Antes de criar roteiro, carrossel, anúncio, landing page, e-mail, thumbnail ou
vídeo, o agente deve ler este documento e confirmar:

1. objetivo da peça;
2. público aprovado;
3. etapa do funil;
4. canal e formato;
5. mensagem principal;
6. prova disponível;
7. chamada para ação;
8. decisão visual aplicável;
9. ambiente real do recurso divulgado.

Se um desses itens ainda estiver em aberto e for necessário para a peça, o
agente deve perguntar em vez de inventar.

Toda entrega deve indicar quais decisões aprovadas orientaram a peça e separar
preview de publicação. Criar conteúdo não autoriza publicar, impulsionar,
enviar e-mail, alterar campanha ou usar credenciais externas.

## 9. Uso pela pasta `videos/`

Qualquer trabalho em `videos/` deve seguir também `videos/AGENTS.md`. A ordem
de leitura específica é:

1. este documento;
2. `ftv.md` para produto e escopo;
3. `videos/README.md` para organização e limites técnicos;
4. assets reais em `public/`, `assets/` e na raiz;
5. briefing específico da peça.

O pacote Motion anima cenas React, mas não substitui roteiro, identidade,
renderização ou codificação de MP4/WebM.

## 10. Entrevista de descoberta

### Progresso

- Etapa concluída: público comercial prioritário, modelo de receita, direção de
  aquisição e atributos centrais do tom de voz.
- Etapa concluída: recorte inicial do organizador ideal, abrangência geográfica
  e alternativas usadas hoje.
- Etapa concluída: dores iniciais de operação, chaveamento, custo, experiência
  visual e desempenho.
- Etapa concluída: objeção principal ligada à novidade, confiança e risco de
  falha operacional.
- Etapa concluída: separação inicial entre orientação autoguiada do Evento
  Padrão e call personalizada do Evento de Elite.
- Etapa concluída: formato inicial da call Elite e limites da promessa de
  suporte pelo WhatsApp.
- Etapa concluída: hierarquia da proposta de valor e promessa central da marca.
- Etapa concluída: valores e percepção desejada da marca.
- Etapa concluída: percepções proibidas e limites de personalidade.
- Etapa concluída: regras práticas do tom de voz, humor e emojis.
- Etapa concluída: modernização visual v2 aprovada e implementada localmente,
  sem mudança de conteúdo ou arquitetura da home.
- Etapa concluída: identidade visual v3 aprovada e implementada localmente em
  toda a plataforma comercial (**Forest Teal `#0E4937` + Light Beige `#FBE9D1` +
  Lime Green `#72BF00` + Vivid Orange `#FF5D00`**), preservando `.life-os-theme`.
- Etapa atual: aguardar novas artes do banner promocional da Home em paleta
  Forest Teal enviadas por Carlos e concluir revisão visual final antes do PR.
- Respostas aprovadas: organizador como cliente principal; atleta e plateia
  como compradores/usuários; aquisição inicialmente B2B; monetização por
  comissão; comunicação amigável, profissional, próxima e persuasiva;
  prioridade inicial para campeonatos pequenos e médios em todo o Brasil;
  quantidade de duplas ainda sem recorte; aquisição tanto de operações manuais
  quanto de organizadores dispostos a trocar de plataforma; dores relacionadas
  a inscrições, duplas, chaveamento e resultados, taxas, aparência e
  lentidão/travamentos; principal objeção esperada ligada à falta de histórico
  e ao medo de falha antes ou durante o evento; documentação visual planejada
  para o Padrão; call personalizada, agendada e sem duração pública fixa no
  Elite; suporte pelo WhatsApp durante o período de inscrições, sem promessa de
  plantão ou atendimento 24 horas; promessa central de organizar o campeonato
  inteiro em um só lugar, com suporte de verdade e experiência profissional;
  percepções prioritárias de confiança, organização e simplicidade,
  proximidade, modernidade e profissionalismo; proibição de parecer amadora,
  improvisada, fria, complicada, instável, insegura ou agressiva na venda; tom
  direto, simples e próximo, com humor leve, poucos emojis e persuasão baseada
  em benefício e prova.

As respostas serão registradas primeiro como fala de Carlos e depois
sintetizadas em propostas. Nenhuma síntese vira decisão final sem aprovação
explícita.
