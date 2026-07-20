# Prompt para prototipação visual do RankFTV

> Documento auxiliar atualizado em 15/07/2026.
>
> Este prompt serve para gerar propostas visuais. A implementação real deve
> respeitar [DOCUMENTACAO.md](DOCUMENTACAO.md), as permissões existentes e o
> código do repositório.

## Contexto

O RankFTV é uma plataforma brasileira responsiva para:

- descobrir, criar e operar campeonatos de futevôlei;
- inscrever duplas e vender ingressos de atleta e plateia;
- processar Pix/cartão, credenciais, QR Code, check-in e repasses;
- administrar arenas, alunos, aulas, planos, mensalidades, diárias e aluguel.

Uma conta pode acumular os papéis de atleta, organizador, dono de arena e staff.
No lançamento, a administração é destinada à conta principal; o código também
distingue roles protegidos de admin e CEO. O redesign não pode alterar essas
permissões, regras ou fluxos.

## Objetivo

Crie uma proposta visual consistente para desktop e mobile, com aparência
esportiva, moderna e profissional. Redesenhe hierarquia, composição,
tipografia, espaçamento, cards e microinterações sem inventar funcionalidade,
remover dados necessários ou modificar regra de negócio.

Use dados demonstrativos somente dentro do protótipo visual. Eles não devem
virar seed, fixture ou conteúdo de produção.

## Stack de referência

- Next.js 16 com App Router;
- React 19 e TypeScript;
- Tailwind CSS 4;
- Supabase;
- Asaas;
- lucide-react;
- Recharts;
- Vercel.

## Base visual que deve ser preservada

### Cores e superfícies

- azul principal: #0000FF;
- fundo geral desktop e mobile: #F3F5FA;
- cards, campos, modais e superfícies de destaque: brancos ou na cor específica
  do componente;
- preto como superfície forte de navegação e cabeçalhos;
- cantos arredondados, bordas discretas e sombras leves;
- contraste, foco visível e legibilidade são obrigatórios.

### Desktop

- sidebar preta, estreita, ocupando toda a altura;
- logo FTV em círculo branco com letras azuis;
- ícones claros e áreas de clique padronizadas;
- indicador azul único que desliza entre os itens ativos;
- feixe azul decorativo percorrendo verticalmente a borda direita;
- notificações no rodapé: o sino abre um mini menu, e “Ver todas” abre a página
  completa;
- sem barra superior global repetindo “Campeonatos”, “Arenas” ou “Agenda”;
- conteúdo usa toda a largura restante;
- sidebar e layouts contextuais permanecem montados durante a navegação.

### Mobile

- navegação principal em pill flutuante inferior;
- conteúdo com fundo #F3F5FA;
- quando houver transição de cabeçalho preto para conteúdo arredondado, a
  trilha é transparente e somente um feixe azul percorre a curva horizontal;
- o layout mobile não deve parecer apenas o desktop espremido;
- respeitar safe areas, teclado virtual, toque e viewport pequena.

### Perfil

- cabeçalho preto;
- avatar principal circular de 92 px;
- nome com hierarquia maior e username abaixo;
- restante da página sobre #F3F5FA, com cards claros.

## Navegação e áreas

### Navegação global

- Campeonatos;
- Arenas;
- Agenda;
- Meus ingressos;
- Minhas inscrições;
- Perfil;
- Organizador;
- Minhas arenas;
- Staff;
- Administração.

Itens condicionais só aparecem para quem tem a permissão correspondente.

### Público e atleta

- Home e listagem de campeonatos;
- campeonato público, categorias, inscrição e chaveamento;
- checkout e credencial de atleta/plateia;
- Arenas e página pública da arena;
- agenda, notícias e perfil público de atleta;
- login, cadastro e confirmação de e-mail;
- perfil, conta, questionário e ativações;
- minhas compras, ingressos, inscrições, convites e notificações.

### Organizador

- entrada do Painel e lista “Meus campeonatos”;
- criação, edição e publicação;
- visão geral com cards de duplas, categorias, vagas e receita;
- menu contextual abaixo dos cards, não em uma topbar;
- inscrições, financeiro, check-in, chaveamento e camisas;
- equipe, comunicação, cupons, lotes e plateia.

### Arena

- dashboard por /arena/[handle];
- agenda semanal de segunda a domingo;
- visualizações de agenda e filtros por categoria;
- alunos, aulas, detalhe da aula e presença;
- planos, mensalidades, aluguel, diária e financeiro;
- relatórios, configuração e assinatura da plataforma;
- no desktop, manter sidebar global e navegação contextual da Arena;
- no mobile, usar header e drawer adequados à gestão da arena.

### Staff e Admin

- Staff vê somente campeonatos e funções liberados;
- Admin possui telas internas de vitrine, notícias, destaques, taxas, gastos e
  performance; gestão de usuários é exclusiva de CEO.

## Regras obrigatórias do protótipo

1. Não criar uma topbar global para substituir a que foi removida.
2. Não duplicar sidebar em Arena ou Painel.
3. Não colocar todas as ações do campeonato no topo; elas pertencem ao menu
   contextual abaixo dos cards de métricas.
4. Não esconder informação financeira ou status necessário.
5. Não transformar rotas distintas em um estado local sem URL.
6. Preservar acesso direto, voltar/avançar e navegação client-side.
7. Prever estados vazio, carregando, erro, sucesso, bloqueado e sem permissão.
8. Prever teclado, foco, leitores de tela e prefers-reduced-motion.
9. Não usar dados pessoais reais nem credenciais no protótipo.
10. Não propor alteração de Supabase, Asaas, API ou regra de negócio.

## Entrega esperada

- direção visual resumida;
- tokens de cor, tipografia, raio, sombra e espaçamento;
- estrutura desktop e mobile;
- componentes reutilizáveis e seus estados;
- protótipo navegável das áreas Pública, Organizador e Arena;
- amostras representativas de Staff/Admin;
- descrição das microinterações e alternativa com movimento reduzido;
- mapa que associe cada tela proposta à rota real.

Priorize primeiro Home, Campeonatos, inscrição/pagamento, Perfil, Painel do
organizador, Arena pública e dashboard da Arena. Em seguida cubra compras,
inscrições, Staff e Admin.
