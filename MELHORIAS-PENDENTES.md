# Melhorias pendentes

Atualizado em 17/09/2026. Este arquivo reúne melhorias que não bloqueiam a
V1. Obrigações de lançamento, segurança e evolução pós-lançamento permanecem
em `PENDENCIAS-V1.md`.

## Identidade visual e banners da home

- [x] Substituir os fundos sólidos em preto puro usados na navegação, cabeçalhos,
  cards escuros e páginas do produto por `#202020`, centralizando a cor em um
  token semântico para evitar substituições isoladas. Preservar preto e suas
  transparências quando tiverem função técnica, como QR Codes, máscaras de
  imagem, backdrop de modal e contraste necessário; validar contraste e estados
  de hover em todas as páginas afetadas.
- [x] Criar na home um carrossel de banners acima de “Campeonatos em destaque”,
  separado do carrossel atual de campeonatos e responsivo para celular e
  desktop.
- [x] Transformar “Campeonatos em destaque” também em carrossel no desktop. Em
  vez de empilhar os cards verticalmente, exibir um campeonato principal por
  vez no espaço disponível e trocar lateralmente, reutilizando a mesma ordem e
  rotação automática do mobile. Incluir arraste, setas e indicadores no PC,
  pausar durante interação e ocultar controles quando houver um único destaque.
  Este carrossel continua independente do carrossel de banners acima dele.
- [x] Adicionar em `/admin/destaques` uma seção independente “Banners da home”,
  exclusiva do CEO/admin, com upload, pré-visualização, adição, remoção,
  ativação/desativação e ordenação. Cada banner deve aceitar imagem, texto
  alternativo obrigatório e link opcional, com validação de tipo MIME, tamanho
  e destino do link.
- [x] Não renderizar o carrossel, card vazio, título nem espaçamento residual
  quando não existir banner ativo. Remover todos os banners pelo admin deve ser
  uma configuração válida e refletir na home sem exigir novo deploy.
- [x] Permitir trocar banners com gesto de arrastar no celular e com controles
  acessíveis no desktop. Avançar automaticamente em ciclo a cada 2 segundos,
  pausar durante interação, hover ou foco e respeitar `prefers-reduced-motion`;
  indicadores e botões devem informar a posição e funcionar por teclado.
- [x] Otimizar as imagens do carrossel, carregando primeiro somente o banner
  visível e evitando mudança de layout, tráfego excessivo ou imagem cortada sem
  pré-visualização das proporções usadas na home.

## Experiência do atleta

- [x] Transformar o início da home em uma vitrine pública de campeonatos,
  inspirada no princípio de descoberta da PódioTicket, mas com identidade do
  RankFTV. Exibir a busca antes dos destaques e permitir filtrar por cidade ou
  estado, período, categoria/nível, faixa de preço e inscrições abertas, sem
  exigir cadastro.
- [x] Tornar os filtros compartilháveis pela URL e preservar busca, filtros e
  posição da lista ao abrir um campeonato e voltar, com experiência equivalente
  no celular e no desktop.
- [x] Enriquecer os cards da home com data, cidade/local, status, categorias,
  menor preço vigente e disponibilidade útil, sem criar falsa urgência nem
  expor contagens que o estoque não consiga garantir em tempo real.
- [x] Mostrar na página pública do campeonato as categorias disponíveis, gênero,
  lote vigente, preço base, taxa, total e estado de vagas antes de solicitar os
  dados dos atletas. Permitir selecionar uma categoria ali e manter a seleção ao
  avançar para a inscrição.
- [x] Preservar como diferencial a inscrição de dupla sem conta. Se o visitante
  estiver autenticado, oferecer preenchimento conveniente com dados permitidos;
  se não estiver, seguir como convidado e disponibilizar ingresso, recuperação
  e pós-venda pelos fluxos protegidos já homologados.
- [x] Medir o funil público por etapa — busca, visualização do campeonato,
  seleção de categoria, início dos dados, revisão e pagamento confirmado — e
  comparar abandono, tempo e conversão antes e depois da nova home.
- [x] Criar lista de espera por categoria, com consentimento, posição clara e
  convite com prazo quando uma vaga for liberada.
- [x] Melhorar a contingência de check-in para conexão instável, sem permitir
  uso duplicado do mesmo ingresso.
- [x] Centralizar avisos importantes do campeonato no ingresso e no e-mail,
  incluindo mudança de data, horário ou local.

## Experiência do organizador

- [x] Criar visão operacional por quadra, com partidas atuais, próximas
  chamadas, atrasos e conflitos.
- [x] Evoluir o placar ao vivo e uma página pública leve para acompanhamento.
- [x] Adicionar relatórios exportáveis de vendas, presença, categorias e
  repasses, preservando os dados pessoais dos atletas.
- [x] Criar alertas internos configuráveis para pagamento pendente, webhook
  falho, reembolso assistido e repasse recusado.

## Administração e suporte

- [x] Evoluir os casos de suporte com filtros, prioridade, responsável, SLA,
  anexos seguros e histórico de resolução.
- [x] Criar painéis de tendência para entrega de e-mails, recuperação de
  ingresso, invalidação de links e alterações assistidas.
- [x] Avaliar permissões administrativas granulares se outras pessoas entrarem
  na operação; enquanto isso, manter o painel sensível exclusivo do papel CEO.

## Evolução de produto

- [x] Priorizar as próximas entregas usando dados reais e a matriz de
  `PESQUISA-CONCORRENTES.md`.
- [x] Planejar Arena comercial, assinaturas recorrentes, aplicativo/PWA
  ampliado e analytics avançado somente depois da estabilização da V1.

## Itens concluídos

As credenciais individuais, recuperação segura, troca protegida, suporte do
CEO, auditoria, webhook/métricas de e-mail, PDF, check-in e proteção contra
exclusão de categoria com histórico já foram implementados e homologados no
Sandbox. As migrations operacionais e de retenção também foram executadas
nesse ambiente; a promoção para Production continua controlada pelo runbook.
A emissão de passes Apple Wallet e Google Wallet foi transferida para o P2 de
`PENDENCIAS-V1.md`.
