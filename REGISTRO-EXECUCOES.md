# Registro de Execuções — RankFTV

Registro permanente de ações técnicas realizadas, evidências e bloqueios. Antes
de iniciar qualquer tarefa, consultar este arquivo, `PENDENCIAS-V1.md`, o Git e
o serviço envolvido. Se houver evidência de conclusão, não repetir a tarefa;
registrar apenas uma revalidação quando ela for necessária.

## 2026-10-20 14:51 (America/Sao_Paulo) — Mix de efeitos sonoros no MP4

- Status: concluído localmente. A versão do vídeo foi re-renderizada com
  efeitos sonoros sincronizados, sem publicação, envio, impulsionamento,
  deploy, migration ou uso de serviço externo.
- Foram sintetizados localmente whooshes de transição, pops dos cards,
  clicks da grade de recursos e um brilho de dois tons no CTA. A faixa foi
  mixada em volume baixo abaixo da locução e possui 32 segundos.
- Export final revalidado: `videos/exports/rankftv-organizadores-v1.mp4`, com
  32 segundos, 1080 x 1920 px, 25 fps, H.264 e AAC mono. O stream de áudio
  apresenta volume nos cinco pontos de transição verificados.
- TypeScript, ESLint focado e `git diff --check` passaram sem erros.

## 2026-10-20 14:45 (America/Sao_Paulo) — Vídeo Motion para organizadores

- Status: primeira versão concluída localmente e aguardando aprovação de
  Carlos. Nenhuma publicação, impulsionamento, envio, deploy, migration ou
  alteração em serviço externo foi executada.
- Briefing: anúncio vertical 9:16 para Instagram Reels/anúncios, voltado a
  organizadores de campeonatos pequenos e médios. A mensagem é centralizar a
  operação do campeonato, com CTA para conhecer o RankFTV.
- Conteúdo: roteiro e cenas apresentam somente funções comprovadas no
  produto — inscrições, duplas, chaveamento, resultados, ingressos, check-in,
  financeiro e suporte próximo — sem números, depoimentos, parceiros ou
  garantias inventadas.
- Produção: criada rota isolada
  `/video-preview/rankftv-organizadores`, animação React com `motion/react`,
  locução local em português do Brasil com a voz Microsoft Maria, efeitos
  sonoros sintetizados para transições/cards/CTA e pipeline Playwright +
  `ffmpeg-static`. A credencial visível no editor não foi lida, usada, copiada
  ou registrada.
- Export: `videos/exports/rankftv-organizadores-v1.mp4`, 32 segundos, 1080 x
  1920 px, 25 fps, H.264 e áudio AAC mono. O arquivo final tem cerca de 4 MB.
- Qualidade: a primeira renderização foi descartada após identificar o
  indicador de desenvolvimento do Next.js. A segunda renderização ocultou o
  indicador; quadros das seis cenas e do encerramento foram inspecionados.

## 2026-10-20 14:11 (America/Sao_Paulo) — Home visual v2 e campeonatos demonstrativos

- Status: concluído no checkout local. O servidor de desenvolvimento ficou
  disponível em `http://localhost:3000`; nenhum deploy, migration, escrita no
  Supabase ou alteração em Production foi executado.
- A modernização visual v2 aprovada foi aplicada sem mudar o conteúdo ou as
  funcionalidades da home. O grid desktop foi corrigido para posicionar os
  destaques e a listagem na coluna esquerda, ao lado do card de acesso rápido,
  removendo o espaço vazio observado.
- Foram adicionados dois fixtures exclusivamente locais, protegidos por
  `NODE_ENV === "development"`: “Circuito Praia Azul — Etapa Rio” e “Copa
  Sunset de Futevôlei”. Os dois aparecem na listagem e somente o primeiro é
  inserido entre os três destaques; os campeonatos reais continuam vindo do
  Supabase.
- Duas imagens esportivas originais foram geradas com o ImageGen integrado,
  sem texto nem logotipos, e otimizadas para WebP em
  `public/banners/demo-circuito-praia-azul.webp` e
  `public/banners/demo-copa-sunset.webp`. Os dados e as imagens são apenas para
  demonstração visual e não representam eventos, clientes ou métricas reais.
- Validação observada: `npm run typecheck` aprovado; ESLint focado aprovado
  sem erros e com quatro avisos estruturais preexistentes em `app/page.tsx`;
  `git diff --check` aprovado. A home e os dois assets retornaram HTTP 200.
  Capturas Playwright finais em desktop e mobile confirmaram as três imagens,
  os dois cards e o alinhamento do grid. A primeira imagem do destaque passou
  a carregar de forma antecipada e a verificação final do navegador terminou
  sem avisos nem erros de console.

## 2026-10-20 10:56 (America/Sao_Paulo) — Limite visual da home definido

- Status: Carlos rejeitou a prévia v1 que transformava a home em uma página de
  aquisição; nenhum conceito foi implementado.
- Decisão aprovada: a home é uma superfície operacional da plataforma. Seu
  conteúdo, opções, seções e arquitetura devem permanecer como estão, sem hero
  comercial ou merchandising para captar organizadores.
- O símbolo e o logotipo atuais permanecem enquanto uma mudança específica não
  for aprovada separadamente.
- Próxima hipótese: modernizar somente o tratamento visual — grafite, azul de
  ação, contraste, superfícies, bordas, raios, sombras, tipografia, ícones e
  estados — sem criar, remover ou reorganizar funcionalidades.
- As imagens em `docs/brand/previews/` foram marcadas como histórico rejeitado
  e não devem orientar implementação.
- Nenhum código de runtime, asset de produção, deploy, serviço externo, banco
  ou dependência foi alterado.

## 2026-10-20 10:50 (America/Sao_Paulo) — Prévia visual v1 da marca e da home

- Status: prévia criada e aguardando aprovação explícita de Carlos; nenhuma
  mudança de UI foi implementada.
- A home local foi capturada em desktop e mobile. Como não havia navegador
  disponível na automação visual conectada, as capturas foram feitas com o
  Playwright já presente no projeto, sem interação com ambiente remoto.
- Foram gerados com ImageGen integrado três conceitos em
  `docs/brand/previews/`: evolução do símbolo “R”, home desktop e home mobile.
- A proposta prioriza o organizador no primeiro fold, apresenta inscrições,
  duplas, chaveamento, check-in e financeiro sem métricas inventadas e mantém a
  busca de campeonatos como jornada secundária do atleta.
- Referências usadas: capturas reais locais e `path1.png`. Os arquivos atuais
  foram preservados; nenhum asset de produção foi substituído.
- Nenhum deploy, serviço externo, banco, dependência ou código de runtime foi
  alterado.

## 2026-10-20 10:37 (America/Sao_Paulo) — Tom aprovado e auditoria visual

- Status: Carlos aprovou as regras práticas de tom; a etapa de identidade
  visual foi iniciada e nenhuma peça nova foi criada ou publicada.
- Tom aprovado: conversa com “você”, linguagem brasileira simples e direta,
  frases curtas, vocabulário do organizador, humor leve, poucos emojis e
  persuasão baseada em problema, benefício, prova e chamada para ação.
- Limites: sem jargão corporativo, pressão artificial, ataques a concorrentes
  ou garantias sem evidência.
- Materiais inspecionados: `app/icon.png`, `path1.png`, `ank FTV.png`,
  `public/rankftv-mockup.png`, os dois banners RankFTV existentes,
  `app/layout.tsx` e `app/globals.css`.
- Base observada: símbolo “R” com estrela, azul `#0000FF`, preto/grafite,
  branco, cinzas claros, tipografia Inter, alto contraste, linhas de movimento,
  fotografia esportiva e apresentações de tela.
- Foi proposta para aprovação uma evolução sport-tech da identidade existente,
  preservando símbolo e azul, com dourado/âmbar reservado ao Elite.
- Próxima etapa: aprovar ou ajustar a direção visual geral antes de fechar
  paleta, tipografia, fotografia, grafismos e templates.
- Nenhum código de runtime, dependência, deploy, serviço externo ou banco foi
  alterado.

## 2026-10-20 10:35 (America/Sao_Paulo) — Limites da marca aprovados

- Status: Carlos aprovou todas as percepções proibidas propostas; a entrevista
  continua aberta e nenhuma peça foi criada ou publicada.
- A marca não deve parecer amadora ou improvisada, fria ou distante,
  complicada ou burocrática, instável ou insegura, exagerada ou agressiva na
  venda.
- Foram propostas para a próxima aprovação regras práticas de linguagem direta
  e simples, conversa com “você”, humor leve, emojis moderados e persuasão
  baseada em benefício e prova.
- Próxima etapa: fechar as regras operacionais do tom de voz.
- Nenhum código de runtime, dependência, deploy, serviço externo ou banco foi
  alterado.

## 2026-10-20 10:30 (America/Sao_Paulo) — Percepção da marca aprovada

- Status: Carlos aprovou as quatro percepções propostas; a entrevista continua
  aberta e nenhuma peça foi criada ou publicada.
- Percepções prioritárias: confiável; organizada e simples; próxima; moderna e
  profissional.
- Valores derivados para orientar decisões: confiabilidade, organização,
  simplicidade, proximidade, modernidade e profissionalismo.
- Próxima etapa: aprovar os traços que a marca nunca deve transmitir antes de
  detalhar a linguagem verbal e visual.
- Nenhum código de runtime, dependência, deploy, serviço externo ou banco foi
  alterado.

## 2026-10-20 10:25 (America/Sao_Paulo) — Promessa central da marca aprovada

- Status: Carlos aprovou a proposta apresentada na rodada anterior.
- Promessa central aprovada: “Organize seu campeonato inteiro em um só lugar,
  com suporte de verdade e uma experiência profissional.”
- Hierarquia aprovada: organização completa do campeonato lidera a mensagem;
  suporte próximo e taxa competitiva funcionam como diferenciais.
- Próxima etapa da entrevista: definir valores e percepções prioritárias da
  marca antes de fechar tom de voz e identidade visual.
- Nenhum código de runtime, dependência, deploy, serviço externo ou banco foi
  alterado.

## 2026-10-20 10:23 (America/Sao_Paulo) — Entrevista de marca, rodada 6

- Status: formato da call Elite e limite da promessa de suporte registrados; a
  entrevista continua aberta e nenhuma página, campanha ou publicação foi
  criada.
- A call do Evento de Elite será agendada e personalizada, sem limite de tempo
  anunciado; terá o tempo necessário para explicar funcionalidades, revisar a
  configuração e tirar dúvidas.
- O WhatsApp será um canal de suporte normal e ativo durante o período de
  inscrições. Não será comunicado como plantão, atendimento 24 horas,
  disponibilidade ininterrupta ou resposta imediata.
- Horários, prazo esperado de resposta, detalhes de agendamento e eventual
  suporte especial no dia do campeonato permanecem sem promessa definida.
- Foi proposta para aprovação a promessa central “Organize seu campeonato
  inteiro em um só lugar, com suporte de verdade e uma experiência
  profissional”, mantendo taxa competitiva e proximidade como diferenciais.
- Próxima etapa: aprovar ou ajustar a hierarquia da proposta de valor.
- Nenhum código de runtime, dependência, deploy, serviço externo ou banco foi
  alterado.

## 2026-10-20 10:18 (America/Sao_Paulo) — Entrevista de marca, rodada 5

- Status: modelo inicial de acompanhamento registrado na memória de marca; a
  entrevista continua aberta e nenhuma página, campanha ou publicação foi
  criada.
- Carlos definiu orientação autoguiada, com página ou documentação visual,
  para organizadores do plano sem ativação paga e uma call ao vivo
  personalizada com ele para clientes Elite.
- Verificação no código: os nomes atuais são `Evento Padrão`, `Evento de Elite`
  na contratação e `Plano Elite` no financeiro. A call ao vivo com o CEO já é
  apresentada como benefício do Elite.
- A interface mostra `R$ 0 / evento` para criar no Padrão, mas conserva taxas
  normais por transação; por isso, a comunicação não deve chamá-lo de “sem
  taxas”. O código também lista suporte pelo WhatsApp no Padrão e suporte
  priorizado direto pelo WhatsApp no Elite.
- Não foi localizada uma página ou central visual de orientação nos caminhos
  pesquisados em `app/`, `docs/` e `public/`; ela permanece planejada, não
  disponível.
- Próxima etapa: definir duração, quantidade, agendamento e limites da call e
  do suporte Elite.
- Nenhum código de runtime, dependência, deploy, serviço externo ou banco foi
  alterado.

## 2026-10-20 10:14 (America/Sao_Paulo) — Entrevista de marca, rodada 4

- Status: objeção principal indicada por Carlos registrada na memória de
  marca; a entrevista continua aberta e nenhuma peça publicitária foi criada
  ou publicada.
- Objeção aprovada: por ser nova e desconhecida, a plataforma pode gerar medo
  de confiar a operação do campeonato e receio de falha antes ou durante o
  evento.
- A convicção de Carlos de que o valor ficará claro foi preservada, mas dúvidas
  de preço, vantagem ou troca continuam como possibilidades a validar com o
  mercado, não como objeções já descartadas por evidência.
- Foram propostas, ainda como hipóteses, demonstração guiada, acompanhamento
  do primeiro evento, suporte com compromisso definido, evidências reais,
  futuros depoimentos e uma possível condição comercial inicial.
- Próxima etapa: decidir quais mecanismos de confiança o RankFTV realmente
  poderá cumprir para os primeiros organizadores.
- Nenhum código de runtime, dependência, deploy, campanha, anúncio, e-mail ou
  serviço externo foi alterado.

## 2026-10-20 10:12 (America/Sao_Paulo) — Entrevista de marca, rodada 3

- Status: dores indicadas por Carlos organizadas na memória de marca; a
  entrevista continua aberta e nenhuma peça publicitária foi criada ou
  publicada.
- Dores aprovadas: inscrições desorganizadas, dificuldade para controlar
  duplas, dificuldade no chaveamento e no registro dos resultados, taxas
  consideradas altas, plataformas visualmente ruins e sistemas lentos ou com
  travamentos.
- Regra de segmentação: não presumir que todos os organizadores enfrentam todos
  os problemas. Cada anúncio ou abordagem deve trabalhar a dor correspondente
  ao perfil e ao contexto daquele público.
- Consequências como retrabalho, erros, confusão e perda de confiança foram
  registradas como hipóteses, ainda dependentes de validação com organizadores
  reais.
- Próxima etapa: mapear objeções, fatores de confiança e critérios usados para
  escolher ou trocar de plataforma.
- Nenhum código de runtime, dependência, deploy, campanha, anúncio, e-mail ou
  serviço externo foi alterado.

## 2026-10-20 10:09 (America/Sao_Paulo) — Entrevista de marca, rodada 2

- Status: novo bloco de respostas de Carlos registrado na memória de marca; a
  entrevista continua aberta e nenhuma peça publicitária foi criada ou
  publicada.
- Público inicial definido: organizadores de campeonatos pequenos e médios de
  futevôlei. Grandes eventos não são prioridade inicial por normalmente já
  possuírem contratos ou relações com outras plataformas.
- Alcance aprovado: todo o Brasil, pois a prestação do serviço e a aquisição
  podem ocorrer online; cidade e região dos fundadores não limitam o mercado.
- A quantidade de duplas não foi definida como critério de segmentação e não
  deve ser inventada; ela varia conforme cada campeonato.
- Alternativas atuais registradas: WhatsApp, planilhas, processos manuais e
  outras plataformas.
- A intenção é mostrar vantagens para quem já usa outra solução, mas “melhor”
  foi preservado como objetivo competitivo. Comparação pública dependerá de
  critérios e provas verificáveis.
- Próxima etapa: identificar dores, consequências, objeções e critérios de
  escolha desses organizadores.
- Nenhum código de runtime, dependência, deploy, campanha, anúncio, e-mail ou
  serviço externo foi alterado.

## 2026-10-20 10:04 (America/Sao_Paulo) — Entrevista de marca, rodada 1

- Status: respostas de Carlos sintetizadas na memória de marca; a entrevista
  continua aberta e nenhuma peça publicitária foi criada ou publicada.
- Definido: o organizador de campeonato é o cliente comercial prioritário;
  atletas e plateia são compradores/usuários essenciais, mas uma aquisição
  dedicada a atletas fica para o futuro.
- Registrado: o organizador hospeda o evento, divulga o link do RankFTV e as
  compras geram comissão para a plataforma, com o restante destinado ao
  organizador conforme as regras financeiras aplicáveis.
- Direção de valor: site melhor, taxa competitiva e suporte/acompanhamento
  próximo. “Taxa baixa” e “suporte personalizado” só podem virar claims finais
  depois de preço comparável e capacidade operacional definidos.
- Tom aprovado em nível inicial: amigável, sério, profissional, próximo e
  persuasivo, sem aparência corporativa distante.
- Próxima etapa: identificar o organizador ideal, suas dores atuais, a
  alternativa usada hoje e seus critérios de escolha.
- Nenhum código de runtime, dependência, deploy, campanha, anúncio, e-mail ou
  serviço externo foi alterado.

## 2026-10-20 09:54 (America/Sao_Paulo) — Início da memória própria de marca

- Status: estrutura criada e entrevista de descoberta iniciada; posicionamento,
  público prioritário, tom de voz e identidade final ainda dependem das
  respostas e aprovações de Carlos.
- Criado `docs/IA/MARCA-E-COMUNICACAO.md` com separação explícita entre fatos
  observados, decisões aprovadas, hipóteses e itens em aberto. O baseline atual
  registra produto, públicos possíveis, logo, cores e materiais reais sem
  convertê-los automaticamente em decisão final de marca.
- Criado `videos/AGENTS.md` e atualizado `videos/README.md`: qualquer vídeo,
  carrossel ou anúncio deve carregar a memória de marca, declarar objetivo,
  público, canal, funil, mensagem, prova e CTA, sem inventar claims ou tratar
  geração como autorização de publicação.
- O gerador `scripts/build-ai-context.mjs` recebeu os escopos `brand` e
  `video`; o segundo inclui também as regras locais de `videos/`, permitindo
  que clientes de API carreguem a memória explicitamente em cada requisição.
- Validação: `node --check` aprovou; os escopos `brand`, `video` e `all`
  carregaram as seções esperadas, enquanto `core` e `v1` permaneceram sem o
  conteúdo especializado; `git diff --check` não encontrou erro de whitespace.
- Atualizados `AGENTS.md` e `docs/IA/README.md` para rotear tarefas de marca e
  conteúdo à nova fonte canônica.
- Removidos o clone isolado `tmp/mazyos` e
  `docs/AVALIACAO-MAZYOS.md`. A pasta foi enviada à Lixeira do Windows e pode
  ser recuperada enquanto não houver esvaziamento. Nenhum arquivo, skill ou
  texto do MazyOS foi incorporado ao RankFTV.
- Nenhum código de runtime, dependência, deploy, migration, banco, pagamento,
  anúncio ou canal externo foi alterado.

## 2026-10-20 09:44 (America/Sao_Paulo) — Instalação isolada e avaliação do MazyOS

- Status: repositório público clonado em `tmp/mazyos` como referência local,
  no commit `83ed079d1fde51b334e9ecbee5a154f4821d59fb`. Como `tmp/` já é ignorada,
  a cópia não entrou no Git nem no runtime do RankFTV.
- Evidência: o checkout contém 15 skills Markdown para Claude Code, sem
  `package.json`, binário ou instalador executável. Nenhuma dependência foi
  adicionada e nenhuma skill foi ativada.
- Decisão: não executar `/instalar` na raiz. O fluxo upstream sobrescreveria
  `CLAUDE.md`, recomenda renomear a pasta e inclui automações de `git add .`,
  push, deploy e publicação social incompatíveis com este worktree sujo e com
  o contrato operacional do RankFTV.
- Potencial: adaptar futuramente os conceitos de SEO, calendário/conteúdo,
  carrossel, anúncios, relatórios e respostas a avaliações em uma skill própria
  do RankFTV, com revisão humana, autorização externa e política de segredos.
- Limite jurídico/técnico: o commit avaliado não contém licença e várias
  automações citam scripts, APIs e credenciais que não vêm no repositório.
  Avaliação completa em `docs/AVALIACAO-MAZYOS.md`.
- Nenhum deploy, migration, banco, pagamento, e-mail, anúncio ou rede social
  foi alterado.

## 2026-10-20 — Instalação do Motion e área de vídeos

- Status: concluído localmente; nenhuma alteração externa, deploy, migration,
  pagamento ou serviço de produção foi executado.
- Feito: instalada a dependência `motion@14.4.0` no checkout principal e criada
  a pasta `videos/` com README para organizar cenas, exports e thumbnails.
- Evidência: `npm install motion@14.4.0` concluiu com 4 pacotes adicionados;
  `package.json` e `package-lock.json` registram a dependência.
- Escopo funcional observado no repositório upstream: animações para React,
  JavaScript e Vue, incluindo gestos, springs, transições de layout, efeitos de
  scroll e timelines. O pacote não codifica MP4/WebM por conta própria.
- Observação: a instalação reportou as 8 vulnerabilidades altas já existentes
  no conjunto de dependências; a atualização dessas vulnerabilidades continua
  sendo a pendência P0 documentada e não foi feita como parte desta tarefa.

## 2026-10-20 08:54 (America/Sao_Paulo) — Auditoria completa da documentação e da V1

- Status: documentação canônica reconciliada com o checkout, `origin/master`,
  PRs abertas e o worktree da carteira. Nenhum merge, deploy, migration,
  cobrança, saque, e-mail ou configuração externa foi alterado.
- A linha de base P0 passou para 144 marcos: 126 concluídos (88%) e 18
  pendentes em 14 entradas. Foram adicionados explicitamente parcelamento,
  carteira, correção das vulnerabilidades atuais e promoção dos hardenings P0
  ainda locais.
- `PENDENCIAS-V1.md`, `DOCUMENTACAO.md`, `AUDITORIA-PRODUCAO.md`,
  `RUNBOOK-PRODUCAO.md`, README, smoke transacional, referência da carteira,
  política de segredos e memória de IA foram atualizados. O catálogo agora
  cobre rotas/APIs atuais, Node 24, Next.js 16.3.7 e a separação entre
  implementado localmente, PR e Production.
- Estado remoto observado: `origin/master` em `5c75756`; checkout local em
  `50f4557`, 15 commits atrás e com histórico divergente/alterações abertas. PR
  #33 e #32 estavam abertas com CI/Preview aprovados; PR #30 tinha `verify`
  reprovado; a matriz N01–N15 continuava pendente.
- Carteira: preservada a evidência de 20/20 checks estruturais verdadeiros no
  Sandbox e em Production, sem confundir isso com código implantado ou teste
  transacional do Asaas. O próximo passo ficou definido como homologação da PR
  #33 em Preview ligado exclusivamente ao Sandbox.
- Validação local: `npm run ai:context -- --scope all`, typecheck e build
  aprovados; build gerou 71 páginas. A suíte registrou 813 testes, 812
  aprovados e 1 ignorado. O lint crítico tipado passou com 78 avisos. Links
  Markdown relativos e `git diff --check` passaram.
- Gates bloqueados: lint global possui dois erros `react-hooks/set-state-in-effect`
  em `PortugalMovePlanner.tsx`. `npm run audit:prod` encontrou três
  vulnerabilidades altas em Next.js/Sharp/source-map-js. Nenhuma correção
  automática foi aplicada.
- Smoke somente leitura de Production: interrompido no primeiro contrato,
  porque `/api/health` ainda retorna o payload detalhado antigo e o código local
  espera somente `{ "status": "ok" }`. Nenhuma mutação ocorreu e as etapas
  seguintes não foram usadas como evidência.

## 2026-10-20 08:36 (America/Sao_Paulo) — Memória operacional obrigatória para agentes de IA

- Status: infraestrutura criada também no worktree principal
  `Projeto-RankFTV`, na branch `feat/english-roadmap-personal`, preservando as
  alterações locais preexistentes. Nenhum deploy, migration ou serviço externo
  foi alterado.
- `AGENTS.md` exige em toda mensagem a leitura do núcleo em `docs/IA/`, do
  registro de execuções, do estado Git e dos arquivos reais da tarefa.
- `CLAUDE.md` importa o mesmo núcleo para ferramentas compatíveis. Clientes de
  API stateless recebem o comando `npm run ai:context` para anexar essa memória
  a cada chamada.
- Foram criados contexto do produto, mapa de módulos, estado atual, contrato de
  resposta, política de segredos, guia de integração da API e registro da
  decisão arquitetural.
- Segurança: Carlos pode fornecer ou autorizar a leitura local de credenciais
  para tarefa específica, mas valores continuam proibidos em Git,
  documentação, logs, prints e respostas. Nenhum segredo foi lido ou alterado
  nesta execução.
- Validação concluída: gerador aprovado nos escopos `core`, `v1` e `all`, os
  oito arquivos obrigatórios encontrados no contexto, ESLint focado sem erro,
  script confirmado no `package.json` e `git diff --check` sem erro.

## 2026-10-02 — Preparação de homologação de notificações e smoke transacional

- Escopo: auditoria estática de código/documentação e preparação local. Nenhuma
  chamada a Asaas, Resend, Supabase remoto ou Production; sem cobrança, estorno,
  e-mail enviado ou mutação de dados.
- Feito: matriz N01–N15 em
  `docs/MATRIZ-HOMOLOGACAO-NOTIFICACOES-V1.md`, cobrindo destinatários,
  elegibilidade, duplicação, falhas/backoff, limite de tentativas, claim
  concorrente, cron, auditoria, minimização e ativação controlada. Incluídos
  limites conhecidos da revisão estática e critérios de aprovação.
- Feito: atualizado `docs/SMOKE-TRANSACIONAL-V1.md` para indicar checkout
  hospedado via `invoiceUrl`, não tokenização, e para definir modelo seguro de
  evidências sem PAN/CVV, PII, URLs de checkout, QR ou secrets.
- Escopo PCI documentado em `PENDENCIAS-V1.md`: checkout hospedado para
  campeonatos, ingresso-atleta, aluguel e diária; assinatura recorrente de arena
  continua bloqueada; tokenização/cartão salvo do financeiro de aluno da arena
  exige avaliação PCI/SAQ e validação separadas.
- A matriz registra como pendência de homologação confirmar, em Sandbox, a
  elegibilidade de inscrições pendentes/expiradas/estornadas em cada modelo. A
  inspeção encontrou revalidação explícita `pago` para ingresso atleta, mas não
  considerou isso prova ponta a ponta para inscrições autenticadas.
- Validação local: 35 testes focados aprovados; `npm test` aprovou 806/806;
  `npm run typecheck` concluiu sem erros; `git diff --check` sem problemas. ESLint
  não tem configuração para Markdown (quatro arquivos ignorados, zero erros);
  build não foi executada por não envolver código de runtime. Homologação
  supervisionada em Sandbox,
  confirmação PCI/SAQ e ativação de Production continuam bloqueios externos.

## 2026-10-01 — Resolução de conflitos da PR #25 com `master`

- Status: concluído localmente e pendente de validação remota após o envio da
  resolução para a própria PR; nenhum merge para `master` foi feito.
- Escopo: a resolução ocorreu no worktree isolado
  `C:\Users\SnyX\Documents\Projeto-RankFTV-pr25-merge`. As alterações não
  relacionadas que estavam abertas no worktree principal foram preservadas e
  não foram modificadas.
- Feito: todos os conflitos de integração foram resolvidos. Foi incorporada a
  versão atual de `master` para os alertas operacionais, workflows, smoke de
  produção somente leitura, documentação operacional e executor k6 com sessão
  efêmera. Os fluxos de checkout de cartão, schemas e testes de pagamento da
  PR foram preservados para impedir qualquer reintrodução de PAN ou CVV no
  RankFTV; o cartão continua exclusivamente no checkout hospedado do Asaas.
- Correção adicional: removido um import sem uso em
  `SubscriptionPaymentUI.tsx`. O guard de reserva do Sandbox foi corrigido
  para não depender de `.env.sandbox.local`, um arquivo local ignorado pelo
  Git e ausente no CI; quando o arquivo existir, ele continua sendo validado.
- Validação local: `npm audit --omit=dev --audit-level=high` aprovou sem
  vulnerabilidades; lint e typecheck aprovaram (permanecem avisos legados);
  `npm test` aprovou 806/806 testes. `next build` ficou impedido nesta máquina
  por falha de rede ao obter a fonte Inter do Google Fonts, após chegar ao
  bundler. Os E2E locais foram interrompidos porque o worktree isolado não
  recebeu configuração pública do Supabase; segredos não foram copiados. A
  Preview da Vercel da PR já havia concluído com sucesso antes desta resolução.
- Próxima evidência obrigatória: enviar a resolução, aguardar os checks remotos
  `verify` e Vercel e só então decidir sobre o merge, respeitando a proteção
  da branch `master`.

## 2026-10-01 — Validação remota da resolução da PR #25

- Status: concluído. O commit de resolução `482f179` foi enviado para
  `feat/refund-policy-homologation`; o GitHub passou a classificar a PR #25
  como `MERGEABLE`, sem conflitos.
- Evidência: workflow CI `36860832203` aprovado em 3 min 58 s, com auditoria
  de dependências, lint, typecheck, 806 testes unitários/contrato, build e
  testes Playwright aprovados. Os testes de navegador reportaram 30 aprovados
  e 55 cenários financeiros ignorados por configuração segura.
- Observações não bloqueantes: permanecem avisos legados de lint e um aviso de
  depreciação do Node 20 em actions do GitHub; não houve falha de qualidade,
  segurança ou teste. A PR permanece aberta e nenhum merge foi executado.
## 2026-10-02 — Revalidação técnica local e divergência de branches

- Escopo: validação local do checkout `feat/refund-policy-homologation`, sem
  pagamentos, reembolsos, mutações financeiras no Sandbox ou alterações em
  Production. Os segredos locais não foram exibidos nem usados nos testes.
- Segurança do estado local: antes da integração foi criado um patch binário e
  cópias dos arquivos locais não rastreados em
  `C:\Users\SnyX\AppData\Local\Temp\rankftv-preserve-20261002-104358`.
  As alterações rastreadas foram guardadas temporariamente em stash, a branch
  foi avançada por fast-forward até `7538a1a` e o stash foi reaplicado. Os
  arquivos de Estudos/Performance permaneceram na worktree e foram conferidos
  por SHA-256 contra o backup.
- Branches: `feat/v1-technical-completion` aponta para `0fc2702` e contém cinco
  commits exclusivos em relação à branch local. A atualização de refs confirmou
  que essa antiga branch candidata foi removida do remoto; os commits-base da
  V1 aparecem no histórico da linha `feat/refund-policy-homologation`. A PR #25
  foi mesclada em `master` no commit `255a85e` em 01/10/2026.
- Estado GitHub consultado: a branch local estava 13 commits atrás de
  `origin/feat/refund-policy-homologation`; a integração foi concluída sem
  conflitos de código e agora o checkout aponta para `7538a1a`.
- Validação do checkout local: `npm run audit:prod` encontrou zero
  vulnerabilidades; `npm run typecheck` concluiu sem diagnósticos; `npm test`
  aprovou 806/806 testes; `npm run build` concluiu e gerou 67 páginas estáticas,
  incluindo `/admin/estudos`.
- E2E local: `npm run test:e2e` aprovou 25 testes e ignorou 60 em Chromium,
  Firefox, WebKit e mobile. Os ignorados dependem de contas, dados ou flags
  mutáveis; nenhum pagamento ou reembolso foi disparado. O servidor local
  registrou erro externo do Turnstile, sem falha nos testes aprovados.
- Lint: foram identificados e corrigidos o import React `useTransition` não
  usado em `app/arenas/[handle]/assinar/[planId]/SubscriptionPaymentUI.tsx` e a
  inclusão explícita de `.codex-artifacts/` e `.codex-worktrees/` nos ignores do
  ESLint, para não analisar worktrees locais aninhadas. O resultado final é
  zero erros e 1.240 avisos; `npm run lint` terminou com código zero nesta
  execução. `npx eslint` nos dois arquivos modificados passou
  sem erros (avisos de tamanho/complexidade permanecem no componente).
- Limite de validação da candidata remota: typecheck, lint sem warnings (`--quiet`),
  audit e 806/806 testes passaram em worktree isolada no commit `7538a1a`. Build
  e E2E não puderam executar nessa worktree porque o Turbopack recusa o junction
  temporário de `node_modules` apontando para fora da raiz da worktree. A
  validação completa de build/E2E do commit remoto exige dependências instaladas
  dentro da worktree ou runner CI.
- Migrations: a ordem de 26 itens e dependências descritas em
  `RUNBOOK-PRODUCAO.md` foram revisadas. Não houve replay nem consulta a banco;
  Supabase CLI, `psql` e base descartável não estão disponíveis localmente.
- Bloqueios humanos/externos continuam: homologação real ou mutante com Asaas,
  decisão jurídica/comercial, aprovações/credenciais externas, restauração de
  backup em ambiente isolado e autorização final de produção. Nada disso foi
  marcado como concluído.

## 2026-10-01 — Ampliação do teste de capacidade V1

- Status: concluído no Sandbox/Preview; a correlação de infraestrutura continua
  pendente como item próprio no checklist.
- Escopo: somente Sandbox/Preview, exclusivamente GETs; sem pagamentos,
  inscrições, contas reais ou dados financeiros.
- Feito: o k6 passou a cobrir home, listagem de campeonatos, arenas, notícias,
  login, cadastro, detalhes do campeonato, categorias, chaveamento e placar.
  O executor autenticado cria sessões efêmeras, sem imprimir ou persistir
  cookies.
- Evidência: a primeira amostra pública de 14 requisições teve p95 de 1,76 s
  por uma resposta isolada de 2,22 s. A repetição autenticada, em 01/10/2026,
  aprovou 32/32 checks, 0% de erros e p95 geral de 773,76 ms.
- Evidência principal: perfil autenticado de 17 minutos em
  `rank-ftv-git-sandbox-homologacao-devcarlosrochas-projects.vercel.app`, com
  rampa até 25 VUs e cinco minutos sustentados, concluiu 6.497 requisições
  (6,37 RPS), 12.994/12.994 checks, 0% de falhas e 0 interrupções. Média
  420,71 ms; p95 geral 669,19 ms; p95 público 448,08 ms; p95 de campeonato
  411,58 ms; p95 autenticado 756,81 ms; máximo 2,27 s.
- Artefatos locais ignorados pelo Git: `.codex-artifacts/k6-authenticated-smoke-2026-10-01.json`
  e `.codex-artifacts/k6-authenticated-capacity-2026-10-01.json`.
- Revalidação do executor após refatoração: smoke autenticado aprovou 28/28
  checks, 0% de falhas e p95 geral de 716,32 ms; a checagem sintática e o lint
  dos scripts não apresentaram erros nem avisos.
- Limite: não foram feitas mutações, pagamentos ou inscrições. A análise de
  banco, queries lentas, bloqueios, Vercel e serviços externos exige acesso às
  métricas correspondentes e permanece explicitamente pendente.

## 2026-10-01 — Verificação de secrets dos workers P0

- Status: concluído, sem alteração de segredo.
- Evidência: a listagem segura do GitHub Environment `Production` confirmou a
  existência de `FINANCIAL_RECONCILIATION_URL` e `CRON_SECRET` em 01/10/2026.
  Nenhum valor foi exibido, copiado ou registrado.
- Resultado: o bloqueio remanescente é promover os workflows para a branch
  padrão e comprovar sua execução periódica; não é mais o cadastro dos secrets.

## 2026-10-01 — Smoke E2E não financeiro no Sandbox

- Status: concluído parcialmente, dentro do escopo não financeiro.
- Evidência: `scripts/test-e2e-sandbox.ps1` preparou a conta descartável de
  atleta e executou Playwright contra o Preview/Sandbox. Resultado: 40 testes
  aprovados em Chromium, Firefox, WebKit e versões mobile, em 59 segundos.
- Cobertura aprovada: CSP, robots/sitemap, bloqueio de admin anônimo, layout
  de login em viewport estreito, compras do atleta e painel do organizador;
  também rejeitou token e schema inválidos de webhook antes de tocar estado
  financeiro.
- Limite: 45 cenários mutantes foram deliberadamente ignorados porque a
  execução manteve `E2E_ASAAS_MUTATION_TESTS=0`,
  `E2E_CARD_GUARD_MUTATION_TESTS=0` e
  `E2E_CHECKOUT_MUTATION_TESTS=0`. A homologação completa de compra,
  pagamento, cancelamento e estorno continua pendente e não foi repetida.

## 2026-10-01 — Versionamento da entrega de capacidade

- Status: concluído. O commit `544736d` (`test: ampliar carga autenticada no
  sandbox`) foi enviado para `feat/refund-policy-homologation`, na PR #25.
- Evidência remota no momento da consulta: Preview da Vercel aprovado; a PR
  permaneceu aberta com um check ainda pendente e estado de merge `DIRTY`.
  Nenhum merge ou promoção foi executado.

## 2026-09-30 — Checkout hospedado e hardening de V1

- Status: concluído e versionado na PR #25.
- Evidências principais: checkout hospedado do Asaas para cartão, sem PAN/CVV
  no RankFTV; migration `supabase/hosted-arena-card-checkout.sql` aplicada em
  Production; observabilidade Better Stack/Slack e backup verificados.
- Verificação de código: typecheck, build e testes automatizados passaram no
  ciclo de 30/09. Para detalhes, consultar commits `7c26636`, `2db8e5a`,
  `0949d3f`, `cc19773`, `f3417c3` e `b4aea09`.

## 2026-10-20 — Reconciliação documental do P0

- O estado da documentação foi reconciliado com a execução Production dos
  workflows `39477700522` e `39477800357`: hardening RPC, health mínimo e
  deduplicação do funil deixam de ser classificados como somente locais.
- A P0 geral permanece incompleta; as pendências financeiras, parcelamento,
  PCI/SAQ e homologações de reembolso continuam abertas. Nenhum segredo foi
  registrado.

## 2026-10-20 — Revalidação técnica da V1

- `npm audit --omit=dev` retornou zero vulnerabilidades no `master` atual;
  Next.js/`eslint-config-next` estão em 16.4.2, Sharp em 0.35.5 e
  source-map-js em 1.2.2.
- O worktree da carteira executou 813 testes unitários sem falhas.
- A suíte financeira mutável no Preview antigo registrou 50 aprovados, 10
  falhas de contrato e 25 ignorados; as falhas ocorreram antes de mutações
  financeiras úteis (token de webhook divergente e foco de consentimento).
  O guard bloqueou corretamente a tentativa de executar a mesma suíte no
  Preview da PR #33 e em localhost, pois exige o alias protegido
  `sandbox-homologacao`. Nenhum teste mutável foi executado em Production.

## 2026-10-20 20:12 -03:00 — Pulso.AI no painel RankFTV

- Status: publicado em Production. O card **Inteligência para YouTube** foi
  incluído no topo de `/admin`, antes de Roadmap de inglês, e abre o módulo
  privado em `/admin/youtube`.
- Escopo entregue: dashboard, tendências, oportunidades, ideias, fontes e
  configurações; coleta RSS, pesquisa manual/cron protegidas, agenda em três
  horários de America/Bahia e referências aos canais Maestros da IA e O Custa
  João.
- Banco: migration incremental aplicada ao projeto Production; nove tabelas
  `yt_*` com RLS, sem grants de cliente e com acesso de serviço. A verificação
  após a aplicação registrou 9 tabelas protegidas, 9 fontes (8 ativas) e zero
  grants indevidos. A primeira coleta persistiu 138 itens sem falhas de fonte.
- IA: a chamada ao provedor retornou ausência de créditos na conta da API. Para
  evitar retentativas e custo, `ai_provider` foi colocado em `none`; a coleta
  permanece ativa. Reativação depende de crédito na conta da API e da seleção
  de OpenAI pelo CEO em `/admin/youtube/configuracoes`.
- Verificação: typecheck, build, 814 testes aprovados e audit de produção sem
  vulnerabilidades altas. O deploy `dpl_BygE6yY4e6eWyaCu364SJzF842KV` ficou
  READY e associado a `www.rankftv.com`; health respondeu 200, admin anônimo
  redirecionou para login e endpoints protegidos recusaram chamadas sem sessão
  ou segredo com 401.

## 2026-10-20 20:45 -03:00 — Pulso.AI: pesquisa manual pelo Codex

- Estratégia alterada por solicitação do proprietário: os crons Vercel e
  GitHub foram desligados, as rotas automáticas retornam 410 para o CEO e a
  OpenAI permanece desativada. O fluxo ativo é pesquisa web manual pelo Codex
  seguida de importação validada pelo script local.
- Banco Production: migration aditiva criou `yt_content_observations`,
  `yt_trends`, `yt_trend_evaluations`, `yt_idea_evaluations` e
  `yt_research_run_changes`, além dos campos de ranking/histórico. A validação
  observada confirmou 14 tabelas `yt_*` com RLS, zero grants para cliente e a
  função transacional `yt_apply_codex_research` disponível para `service_role`.
- Primeira carga real: 8 itens de fontes oficiais verificáveis, 5 tendências e
  6 ideias de vídeo foram gravados. A repetição do mesmo arquivo retornou
  `idempotent: true`, sem nova notícia, ideia, tendência ou evento histórico.
- Interface/documentação: dashboard mostra melhor vídeo atual, tendências e
  ideias possuem detalhes/histórico, e `docs/YOUTUBE-RADAR-CODEX.md` descreve
  o procedimento obrigatório para futuras sessões. Nenhum segredo foi exibido.
- Validação: `npm test` terminou com 814 aprovados e 1 ignorado. O typecheck
  global continua bloqueado por erro pré-existente em
  `app/api/webhooks/resend/route.ts` (campo `to` de variante de evento), fora
  do módulo YouTube; não foi alterado nesta execução.

## 2026-10-20 21:20 -03:00 — Pulso.AI: comparação de vídeos do YouTube

- Banco Production: migration incremental criou `yt_idea_youtube_references`
  e a RPC restrita `yt_apply_codex_youtube_references`. A verificação observada
  confirmou tabela existente, RLS ativo, zero grants para cliente e execução
  pela `service_role`.
- Dados: foram gravadas quatro referências verificadas para a ideia de ChatGPT
  Slides, equilibrando atualidade e alcance. Cada referência preserva URL,
  canal, data publicada, visualizações observadas e justificativa editorial.
- Fluxo futuro: `scripts/youtube-import-research.ts` agora rejeita uma ideia
  nova sem três a cinco referências do YouTube. A página de detalhe local passa
  a exibir os comparativos.
- Validação local: `npm test` passou com 814 aprovados e 1 ignorado; lint
  dirigido aos arquivos alterados e `git diff --check` não encontraram erros.
- Publicação: o deploy Production `dpl_F6kRBugz8M9xmUPPkhokEpcSkfPz` ficou
  READY e foi associado a `www.rankftv.com`. O health público retornou 200 e
  `/admin/youtube/ideias` permaneceu protegido, redirecionando usuário anônimo
  com HTTP 307.

## 2026-10-21 08:49 -03:00 — Pulso.AI: briefing curado e reavaliação completa

- Pesquisa: foram conferidas fontes oficiais de OpenAI, Anthropic/Claude e
  Google, a conversa comunitária recente e os vídeos de referência enviados
  pelo proprietário. Não foi encontrado grande anúncio oficial dessas empresas
  datado de 21/10 até o horário da execução; a aquisição da Orchestra Bio pela
  OpenAI, de 20/10, foi registrada com prioridade editorial 70.
- Dados Production: a execução `57fdf516-f9c0-4d74-b1ab-51a2f9e6f35e`
  terminou `completed`, com 4 itens inseridos, 6 tendências avaliadas, 8 ideias
  reavaliadas, 2 ideias novas e 10 referências de YouTube gravadas. O perfil
  editorial do canal foi atualizado sem ativar provedor pago.
- Ranking: Claude Motion entrou em #1 com 96 e Dots em #2 com 93. ChatGPT
  Slides foi de 91 para 90 (#3); “O que acontece quando um agente de IA passa
  dos limites?” foi de 89 para 82 (#4); voz foi de 86 para 80 (#5); algoritmo
  conversável foi de 81 para 76 (#6); golpes foi de 78 para 73 (#7); e
  pós-treinamento de agentes foi de 88 para 65 (#8). O histórico anterior foi
  preservado.
- Banco: a migration incremental
  `supabase/youtube-full-refresh-rank-fix.sql` criou a RPC de recálculo com
  execução exclusiva de `service_role`. A validação confirmou posições 1–8,
  notas anteriores corretas, zero acesso de `anon`/`authenticated` e dez
  referências ligadas à execução.
- Interface: o Briefing Editorial ficou limitado a seis notícias em português
  segundo recência, oportunidade, confiança e confiabilidade. O Radar de
  Oportunidades ganhou filtros funcionais e contagens; as páginas explicam a
  separação entre notícia, oportunidade, tendência e ideia.
- Integridade do fluxo: `scope: "full"` exige reavaliar todas as ideias ativas;
  títulos de notícias passam por validação de português; toda ideia nova segue
  exigindo de três a cinco vídeos comparáveis. O guard do webhook Resend passou
  a verificar também a presença de destinatário para compatibilidade com o
  tipo atual do SDK e liberar o typecheck do build.
- Verificação/publicação: lint dirigido sem erros, build Next.js completo com
  73 páginas aprovado e deploy Production
  `dpl_GSsFXdjwXyT6LDG4ppq8FzL1Fefd` READY em `www.rankftv.com`. Dashboard,
  oportunidades, tendências e ideias retornaram 307 para `/login` em acesso
  anônimo, como esperado. Nenhum segredo foi exibido.

## 2026-10-21 08:55 -03:00 — Pulso.AI: arraste horizontal do quadro

- A Biblioteca de ideias agora permite segurar o botão esquerdo no cabeçalho
  ou no espaço vazio das colunas e arrastar para navegar horizontalmente.
- O arraste iniciado sobre um cartão continua alterando a etapa editorial;
  elementos interativos e cartões foram excluídos do gesto de navegação, e a
  ordem das colunas permanece fixa.
- A instrução visível no topo do quadro foi atualizada para explicar os dois
  gestos. Lint dirigido, build Next.js completo e `git diff --check` passaram.
- Publicação: deploy Production `dpl_CFbc6wM1s74oKAiME8utvR1rYETa` READY e
  associado a `www.rankftv.com`.

## 2026-10-21 09:08 -03:00 — Pulso.AI: fontes administráveis

- Interface: a página Fontes recebeu cadastro por nome/link/tipo, edição,
  ativação, desativação e remoção segura. A navegação lateral agora usa o nome
  curto **Fontes**, e o texto explica que somente registros ativos orientam a
  próxima atualização manual.
- Banco Production: `supabase/youtube-source-management.sql` adicionou
  `archived_at`, ampliou o tipo de fonte e manteve RLS/grants privados. A
  verificação observada confirmou coluna e constraint novas, RLS ativo, zero
  acesso de `anon`/`authenticated`, acesso de `service_role`, 12 fontes totais,
  10 ativas e nenhuma arquivada. Os canais Maestros da IA e O Custa João foram
  migrados para o controle de fontes.
- Integridade: `npm run youtube:sources` lista o conjunto ativo de Production;
  pesquisas completas agora precisam declarar exatamente esse conjunto e o
  importador rejeita fonte inativa. Desligar OpenAI News impede que o próximo
  levantamento completo inclua OpenAI.
- Validação: lint dirigido sem erros, typecheck aprovado, 817 testes aprovados
  e 1 ignorado, build Next.js completo com 74 páginas e `git diff --check`
  aprovado. O deploy `dpl_8vMXtKjZEy5njdYRGwGHAKQeqTQi` ficou READY em
  `www.rankftv.com`; a página anônima redirecionou a `/login` (307) e o POST
  anônimo da API foi recusado com 401.

## 2026-10-21 09:16 -03:00 — Pulso.AI: inspeção profunda e corte de IA

- Procedimento: cada atualização manual deve abrir a listagem/feed de cada
  fonte ativa e a página individual dos itens candidatos, conferindo data,
  título, conteúdo e URL. A home sozinha não serve como evidência.
- Importador: `scripts/youtube-import-research.ts` agora exige `aiRelevance`
  com nota mínima 70 e justificativa em notícias, tendências e ideias. Itens
  de Tesla, SpaceX ou outras empresas só passam quando IA for o tema central;
  tecnologia genérica fica de fora.
- Limitações: login, paywall, robots, JavaScript dinâmico e ausência de
  transcrição podem impedir leitura completa em X/Twitter, YouTube ou sites.
  O procedimento manda registrar essa limitação em vez de inferir conteúdo.

## 2026-10-21 09:29 -03:00 — Pulso.AI: rodada completa com procedência

- Pesquisa: as 10 fontes ativas foram declaradas no payload e usadas como
  conjunto primário. Foram abertos itens oficiais recentes de Anthropic,
  Google, NVIDIA e Higgsfield; Tesla/SpaceX e os perfis do X foram mantidos sob
  o filtro de IA central, sem importar publicações genéricas ou não verificáveis.
  A pesquisa de mercado separada acompanhou a recorrência de agentes e sinais
  de busca com fontes mais visíveis.
- Banco Production: a migration `supabase/youtube-research-provenance.sql`
  adicionou `source_origin` a conteúdo, tendências e ideias, com constraints
  `primary`/`market`/`mixed`, RLS preservado e acesso de cliente bloqueado. A
  RPC `yt_apply_codex_research` foi atualizada para persistir a procedência.
- Execução: a rodada `1f779786-f70c-4be1-8d7c-8772ea9b614e` terminou
  `completed`, com 10 itens analisados, zero fontes falhas, 8 avaliações nas
  posições 1–8 e 10 referências do YouTube. As notas ficaram 95, 94, 88, 84,
  80, 76, 73 e 62, preservando o histórico e a ordem do quadro.
- Procedência observada: entre os itens de conteúdo atuais, 5 são primários,
  4 combinados e 9 de mercado; entre as ideias ativas, 2 são primárias, 3
  combinadas e 3 de mercado. A UI agora mostra a etiqueta correspondente em
  notícias, cartões e detalhe de ideias.
- Validação: `npm run typecheck`, lint dirigido e `git diff --check` passaram.
  O provider de IA permaneceu `none`; não houve tentativa de cobrança por API.

## 2026-10-21 — Central de Evolução: implementação local isolada

- Foi criado o worktree `Projeto-RankFTV-evolucao`, branch
  `feat/central-evolucao`, a partir do estado observado do projeto. O Pulso.AI
  atual foi preservado em commit local antes das mudanças.
- Foi implementada `/admin/evolucao` com menu único, home de métricas,
  DataScience, Rocha Tech/Pulso.AI, Insta/Shape e RankFTV. A interface é clara,
  responsiva, minimalista e usa o azul da RankFTV.
- O cálculo registra 2h mínimas por dia útil, 10h semanais, dívida pagável por
  horas extras/fim de semana e falha diária permanente. O score é 50/30/20;
  RankFTV não entra no cálculo.
- O roadmap de 81 dias e o estado 88% do RankFTV foram sincronizados dos
  arquivos reais. Foram criados scripts separados para gerar snapshots locais
  e, futuramente, importá-los manualmente no Supabase.
- A migration `supabase/evolution-center.sql` cria tabelas `evo_*`, constraints,
  índices, grants mínimos e RLS por proprietário. Ela permanece não aplicada.
- Validação local: typecheck aprovado, 818 testes aprovados, lint dirigido sem
  erros, `npm audit --omit=dev` sem vulnerabilidades e build Next.js 16.4.2
  aprovado. Nenhum serviço externo, Preview ou Production foi alterado.

## 2026-10-21 — Central de Evolução: correção visual da navegação

- O conteúdo de todas as páginas passou a ocupar a largura disponível logo
  depois do menu lateral, removendo a margem vazia criada pelo `max-width`
  centralizado.
- Quando Rocha Tech está ativo, o menu exibe Visão do canal, Biblioteca de
  ideias, Radar de tendências, Oportunidades, Fontes e Configurações. Os mesmos
  destinos também aparecem no menu móvel.
- Os círculos de score herdados do tema escuro do Pulso.AI agora usam centro
  branco e trilha clara dentro da Central.
- Alteração somente local; Supabase, Preview e Production não foram alterados.
- Correção complementar: a faixa persistia porque o `AppShell` global ainda
  reservava a largura de sua `DesktopSidebar` atrás do menu próprio da Central.
  `/admin/evolucao` e suas subrotas agora ignoram somente esse shell global,
  eliminando a largura invisível sem alterar as demais páginas do Admin.

## 2026-10-21 15:07 -03:00 — Central de Evolução: padronização visual e escala de leitura

- A paleta clara da Central foi aplicada de forma completa aos componentes
  herdados do Pulso.AI. Foram corrigidos fundos escuros residuais, textos com
  contraste insuficiente, divisórias pretas e estados inconsistentes em
  cards, filtros, oportunidades, tendências, Kanban, fontes, configurações e
  páginas de detalhe.
- O azul RankFTV ficou reservado a ações, seleção, links e progresso. Verde,
  âmbar e vermelho permanecem somente em estados semânticos. O menu lateral
  grafite foi mantido como contraste intencional e recebeu texto mais legível.
- A escala de leitura da Central foi ampliada em aproximadamente 10% por meio
  de tipografia, controles e espaçamentos próprios, sem depender do zoom do
  navegador e sem alterar regras, dados, rotas ou Supabase.
- Validação local: CSS analisado com PostCSS, `npm run typecheck`, ESLint
  dirigido e `git diff --check` concluíram sem erros. O servidor local
  permaneceu ativo na porta 3000. Nenhum push, Preview, deploy, migration ou
  alteração externa foi executado.
## 2026-10-21 15:34 -03:00 — Central de Evolução: candidato de Production e backup

- Carlos aprovou publicar toda a Central e operar a atualização assistida pelo
  PC enquanto ele estiver ligado.
- A branch `feat/central-evolucao` foi reconciliada com `origin/master` para
  preservar os hardenings que já estavam em Production.
- Foi implementada uma fila privada com aprovação em duas fases: o site cria o
  pedido, o Codex local produz e valida a prévia, e a importação só ocorre após
  aprovação explícita de Carlos.
- O agente local usa a sessão ChatGPT/Codex já autenticada, não depende de API
  paga, recusa outro projeto Supabase e mantém logs locais ignorados pelo Git.
- O workflow protegido da Central aplica 13 tabelas `evo_*`, repete o hardening
  público e verifica RLS, grants e a RPC de claim exclusiva do serviço.
- Evidência local: audit sem vulnerabilidades altas, lint sem erros, typecheck,
  847 testes (846 aprovados e 1 ignorado) e build Next.js com 72 páginas.
- Proteção anterior à migration: backup criptografado de Production no run
  `39653560790`, concluído e com artefato verificado.
- Estado ao registrar: candidato ainda não promovido; merge, migration, deploy,
  importação inicial, tarefa local e smoke devem ser registrados em uma
  entrada posterior.

## 2026-10-21 15:47 -03:00 — Central de Evolução: publicação e operação inicial

- PR #54 foi aprovada por CI e Preview, mesclada em Production; a PR #55 tornou
  diagnósticos da verificação SQL mais específicos e também foi mesclada.
- Backup criptografado prévio: workflow `39653560790`, sucesso.
- A primeira execução da migration aplicou as estruturas; o check agregado
  final não diagnosticava a condição divergente. Nenhuma estrutura foi
  revertida ou apagada. Após a melhoria do workflow, a execução `39655806592`
  confirmou com sucesso as 13 tabelas, RLS/force RLS, ausência de grants
  anônimos e RPC de claim restrita ao serviço.
- `evolution:sync` encontrou 81 dias no roadmap e 36 pendências RankFTV (88%);
  `evolution:import` registrou esses snapshots em Production.
- A tarefa agendada `RankFTV Central Agent` foi instalada no Windows e está
  ativa. O primeiro ciclo confirmou heartbeat `online`, versão `1.0.0`, sem
  executar pesquisa ou importar radar, pois não havia job solicitado.
- Smoke pós-deploy: `https://www.rankftv.com/api/health` retornou 200 com
  `{"status":"ok"}`; `/admin/evolucao` anônimo retornou 307 para `/login`.

## 2026-10-21 16:48 -03:00 — Central de Evolução: compatibilidade do agente Codex

- Diagnóstico: duas solicitações de atualização falharam antes de pesquisar ou
  escrever dados. O Codex local rejeitou opções removidas e o wrapper do
  PowerShell interpretou argumentos destinados ao CLI quando o agente o
  iniciou por `spawn`.
- Correção local: o agente Windows passou a executar diretamente o entrypoint
  JavaScript do Codex com o Node do processo. A flag de busca obsoleta foi
  removida porque a versão instalada já oferece busca web por padrão; a análise
  continua em sandbox `read-only` e a aplicação continua dependente da
  aprovação explícita de Carlos.
- Evidência local: verificação de sintaxe, três testes específicos do agente,
  `git diff --check`, um smoke do entrypoint e `npm run evolution:agent:once`
  foram aprovados. Os smokes não pesquisaram nem importaram conteúdo.
- Estado ao registrar: correção ainda aguardando CI, merge em `master`, deploy
  e reinício da tarefa agendada. Nenhum segredo foi exibido.

## 2026-10-21 17:13 -03:00 — Central de Evolução: schema de ideias do agente

- Diagnóstico: depois de superar a inicialização do Codex, uma solicitação
  falhou na leitura de métricas porque o agente consultava `locked_title` e
  `user_notes`, nomes ausentes em `yt_ideas` de Production. A falha aconteceu
  antes de qualquer pesquisa ou escrita.
- Correção local: a consulta passou a usar `title_locked_by_user` e `notes`,
  os nomes definidos pelo schema editorial real. Um teste de regressão protege
  essa seleção contra retorno aos nomes inexistentes.
- Evidência local: a leitura somente consulta em Production foi aprovada; a
  suíte específica do agente passou com quatro testes e
  `npm run evolution:agent:once` iniciou sem job. Nenhuma pesquisa, importação
  ou alteração de métricas ocorreu.
- Estado ao registrar: correção aguardando CI, merge em `master`, deploy e
  reinício da tarefa. Nenhum segredo foi exibido.

## 2026-10-21 17:46 -03:00 — Central de Evolução: schema estruturado compatível

- Diagnóstico: a execução posterior falhou antes de gerar resposta. A
  documentação oficial de Structured Outputs confirma que toda propriedade
  declarada no schema precisa constar em `required`; campos opcionais devem ser
  representados como união com `null`.
- Correção local: `editorialProfile`, `entity` e `youtubeReferences` passaram
  a ser obrigatórios no schema e aceitam `null`. O agente remove apenas os
  valores nulos antes de encaminhar o resultado ao pré-validador já existente.
  As restrições de schema foram mantidas, usando `enum` em vez de `const`.
  O prompt instrui explicitamente quando usar `null`.
- Observabilidade: falhas longas preservam começo e fim no log sanitizado,
  continuando a remover URLs e valores que pareçam sensíveis.
- Evidência local: `node --check`, parse do schema JSON, nove testes específicos
  e `git diff --check` passaram. Não houve importação, alteração de métricas ou
  conteúdo. A correção aguarda CI, merge, deploy e reinício da tarefa local.

## 2026-10-21 18:09 -03:00 — Central de Evolução: URLs no schema do Codex

- Diagnóstico: após o schema aceitar os campos opcionais, o Codex recusou a
  próxima solicitação antes da pesquisa porque `format: uri` não é suportado
  pelo modo de saída estruturada usado pelo agente. Não houve importação,
  alteração de métricas ou conteúdo.
- Correção local: URLs do schema passaram a usar a referência `url`, com padrão
  `^https?://`. A validação completa de URLs continua sendo feita pelo
  pré-validador do importador depois da resposta estruturada.
- Evidência local: parse do schema, dez testes específicos e `git diff --check`
  passaram. A correção aguarda CI, merge e reinício da tarefa antes de uma nova
  solicitação de análise.

## 2026-10-21 18:18 -03:00 — Central de Evolução: pré-validação local da resposta

- Diagnóstico: o smoke direto mostrou que o Codex aceitou o schema corrigido,
  mas uma prévia completa do radar foi interrompida por limite de saída antes
  de concluir. A tentativa não pesquisou, não importou e não alterou métricas.
- Correção local: a opção `--output-schema` e seu arquivo auxiliar foram
  removidos do agente. O prompt mantém a forma JSON e as regras editoriais; a
  resposta continua passando pela pré-validação local do importador antes de
  poder virar uma prévia. A fase de aplicação segue exigindo aprovação de
  Carlos.
- Evidência local: `node --check`, sete testes específicos e `git diff --check`
  passaram. A correção aguarda CI, merge, reinício da tarefa e nova análise.

## 2026-10-21 18:26 -03:00 — Central de Evolução: completude editorial do agente

- Diagnóstico: a primeira análise sem schema remoto chegou à pré-validação
  local, que bloqueou duas entradas por ausência de `aiRelevance` e
  `sourceOrigin`. Não houve importação ou alteração de métricas.
- Correção local: o prompt agora exige explicitamente, em toda notícia,
  tendência e ideia, `aiRelevance` com nota e justificativa e `sourceOrigin`
  igual a `primary`, `market` ou `mixed`, sem tradução ou omissão.
- Evidência local: `node --check`, sete testes específicos e `git diff --check`
  passaram. A alteração aguarda CI, merge, reinício da tarefa e nova análise.

## 2026-10-21 18:34 -03:00 — Central de Evolução: contrato editorial no prompt

- Diagnóstico: a análise retornou um objeto de erro porque a política do
  sandbox recusou a leitura de `scripts/youtube-import-research.ts`. A
  pré-validação local bloqueou o objeto sem `items`, `trends` e `ideas`; nada
  foi importado ou alterado.
- Correção local: o prompt passa a conter o contrato literal das três coleções,
  proíbe comandos de shell para ler arquivos e exige payload completo, sem
  propriedade `error`. As regras de fontes autorizadas, pesquisa verificável,
  sandbox somente leitura e aprovação antes da aplicação permanecem.
- Evidência local: `node --check`, sete testes específicos e `git diff --check`
  passaram. A alteração aguarda CI, merge, reinício da tarefa e nova análise.

## 2026-10-21 17:39 -03:00 — Central de Evolução: títulos do radar em português

- Diagnóstico: a pré-validação do payload completo bloqueou uma única notícia
  cujo título exibido não possuía construção em português. O bloqueio ocorreu
  antes de importação ou alteração de métricas.
- Correção local: o JSON Schema de saída e o prompt agora exigem em
  `item.title` um conector português, espelhando a regra do importador. Isso
  impede que títulos em inglês sejam apresentados diretamente na Central.
- Evidência local: parse do schema, sintaxe do agente, sete testes específicos
  e `git diff --check` passaram. A pesquisa anterior continua não aplicada.
- Estado ao registrar: correção aguardando CI, merge em `master`, deploy e
  reinício da tarefa. Nenhum segredo foi exibido.

## 2026-10-21 17:28 -03:00 — Central de Evolução: schema estrito e runner do Windows

- Diagnóstico: a pesquisa retornou uma prévia com conteúdo, porém os campos do
  payload do YouTube seguiam um formato antigo e a pré-validação a bloqueou
  antes de importar. A tentativa também revelou que `npm.cmd` não é um alvo
  executável diretamente pelo `spawn` seguro do Node no Windows.
- Correção local: `scripts/evolution-agent-output.schema.json` tornou o
  contrato de resposta do Codex explícito e estrito. As chamadas a importador,
  sincronização e importação passaram a executar Node/TSX diretamente, sem
  wrappers `.cmd`. O sandbox do Codex e a aprovação antes da aplicação foram
  preservados.
- Evidência local: sintaxe do agente, parse do schema JSON, seis testes
  específicos e `git diff --check` foram aprovados. A prévia pesquisada não
  foi importada nem aplicou métricas.
- Estado ao registrar: correção aguardando CI, merge em `master`, deploy e
  reinício da tarefa. Nenhum segredo foi exibido.

## 2026-10-21 17:20 -03:00 — Central de Evolução: contrato da prévia de pesquisa

- Diagnóstico: a primeira análise que chegou ao Codex produziu a cobrança
  pessoal, mas declarou `youtube: null`. Ela interpretou a exigência de
  executar `youtube:sources` como incompatível com o sandbox de somente leitura
  e, corretamente, não inventou uma pesquisa incompleta. Nada foi importado.
- Correção local: o agente agora consulta `yt_sources` em modo leitura junto
  das métricas e fornece os IDs/URLs ativos no campo `activeSources`. O prompt
  esclarece que leituras e pesquisa web são permitidas, proíbe escrita e deixa
  de exigir esse comando dentro do Codex. O objeto `youtube` não pode ser nulo.
- Evidência local: consultas somente leitura de ideias e fontes em Production
  concluíram, com 16 fontes ativas retornadas; cinco testes específicos e
  `git diff --check` passaram. Nenhuma pesquisa, importação ou escrita de
  métricas foi executada nesta correção.
- Estado ao registrar: correção aguardando CI, merge em `master`, deploy e
  reinício da tarefa. Nenhum segredo foi exibido.
## 2026-10-21 20:32 -03:00 — Central: atualização manual e retirada do agente local

- Decisão de Carlos: retirar o botão “Atualizar tudo com IA” e fazer futuras
  atualizações diretamente pelo chat. A home deixou de consultar e exibir jobs
  ou heartbeat; a tarefa do Windows `RankFTV Central Agent` foi parada e
  desativada, sem excluir históricos nem tabelas.
- Sincronização autorizada: `evolution:sync` encontrou 81 dias no roadmap e 36
  pendências RankFTV (88%); `evolution:import` atualizou os dois snapshots em
  Production.
- Radar Rocha Tech: `youtube:sources` retornou 16 fontes ativas. A pesquisa
  registrou limitações explícitas de X/Twitter e SpaceX. O preflight passou com
  4 itens, 4 tendências, 8 ideias e cobertura das 16 fontes; a importação
  `93a11bf9-f76f-4a12-9a06-06c3b7b268da` atualizou 3 conteúdos, incluiu 1,
  criou 1 tendência e reordenou as 8 ideias. Nenhuma ideia nova foi criada.
- Evidência local: `npm run typecheck` e `git diff --check` passaram. Nenhum
  segredo foi registrado.
