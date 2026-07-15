# Visão atual do produto — RankFTV

> Atualizado em **2026-07-15**.
>
> Este documento registra a visão, o posicionamento e as decisões atuais do
> produto. A implementação técnica detalhada vive em
> [DOCUMENTACAO.md](DOCUMENTACAO.md), e o que ainda impede uma operação real em
> produção vive em [AUDITORIA-PRODUCAO.md](AUDITORIA-PRODUCAO.md).

## 1. O que é o RankFTV

O **RankFTV** é uma plataforma web responsiva para dois negócios ligados ao
futevôlei e aos esportes de areia:

1. **Campeonatos** — criação, venda, operação e gestão financeira de eventos.
2. **Arenas** — gestão de alunos, planos, aulas, presença, mensalidades,
   aluguel de quadra e diárias.

O produto também atende o atleta ou cliente que quer encontrar um evento,
comprar um ingresso, entrar em uma arena ou acompanhar o que já comprou.

O RankFTV não é uma rede social esportiva nem depende de um ranking nacional.
O foco é resolver operação, cobrança, acesso e gestão com uma experiência
simples para quem organiza e para quem compra.

Formato: **somente site web**, completo em desktop e mobile. Não há aplicativo
nativo para iOS ou Android.

## 2. Uma conta, várias capacidades

Não existe escolha definitiva de “tipo de conta” no cadastro. A mesma pessoa
pode acumular capacidades conforme usa o produto:

| Perfil de uso | Login | O que faz |
|---|---:|---|
| **Visitante/comprador** | Não | Descobre campeonatos e arenas, compra ingresso de atleta ou plateia e recupera compras por CPF + e-mail |
| **Atleta/aluno** | Sim | Mantém perfil, participa de dupla, vê inscrições e compras, entra em arena e confirma presença |
| **Organizador** | Sim | Cria e gerencia campeonatos, inscrições, ingressos, financeiro, check-in, equipe e comunicação |
| **Dono de arena** | Sim | Gerencia uma ou mais arenas, alunos, agenda, planos, cobranças, presenças e relatórios |
| **Staff/árbitro** | Sim | Acessa somente as funções liberadas pelo organizador de um campeonato |
| **Admin/CEO** | Sim | Opera ferramentas internas conforme o role protegido; gestão de usuários é exclusiva de CEO |

A capacidade vem dos vínculos existentes no banco, como
`organizer_accounts`, arenas de propriedade e convites de staff. Ela não deve
ser inferida apenas de um campo editável no perfil.

## 3. Produto implementado no código

### 3.1 Campeonatos

- Criação e edição de campeonato, categorias, datas, local, regulamento e
  publicação.
- Classificação do evento por tier e motor opcional de recomendação de
  categoria para atletas com conta.
- Lotes de preço e cupons de desconto.
- Inscrição de dupla com conta e convite por `@usuário`.
- Checkout de visitante, sem conta, para ingresso de atleta e de plateia.
- Pagamento por Pix ou cartão integrado ao Asaas.
- Credenciais e ingressos com QR Code, check-in e controle de presença.
- Financeiro do campeonato, taxas, repasses e reembolsos.
- Plano de taxas Padrão/Elite por campeonato.
- Camisas/kit, equipe com permissões, comunicação, plateia e chaveamento.
- Agenda pública e vitrine de eventos com dados reais.

O fluxo de pagamento e repasse existe no código, mas dinheiro real só pode ser
recebido depois da configuração e homologação externa descritas na auditoria.

### 3.2 Arenas

- Vitrine pública em `/arenas` e página da arena em `/arenas/[handle]`.
- Cadastro de arena, fotos, descrição, localização e código de entrada.
- Gestão de uma ou várias arenas pela mesma conta.
- Cadastro e aprovação de alunos.
- Planos de mensalidade, aluguel e diária.
- Agenda recorrente de aulas, com duração, nível, limite de alunos e
  visualização da semana de **segunda a domingo**.
- Confirmação de presença por aula e acompanhamento de frequência.
- Cobranças de mensalidade, aluguel de quadra e diária, com Pix/cartão.
- Financeiro e relatórios da arena.

As rotas canônicas de gestão usam o handle:

```text
/arena/[handle]
/arena/[handle]/agenda
/arena/[handle]/alunos
/arena/[handle]/financeiro
/arena/[handle]/planos
/arena/[handle]/aulas
/arena/[handle]/aula/[classId]
/arena/[handle]/relatorios
/arena/[handle]/assinatura
/arena/[handle]/configuracoes
```

Rotas antigas como `/arena/planos` e `/arena/financeiro` continuam apenas como
redirecionamentos de compatibilidade.

### 3.3 Atleta e comprador

- Cadastro e login com uma conta única.
- Perfil privado e perfil público básico do atleta.
- Compras e inscrições com status, credencial e reembolso.
- Consulta pública de ingresso por CPF + e-mail para quem comprou sem conta.
- Convites de dupla e de staff.
- Notificações dentro do site e e-mails transacionais.

O **ranking nacional**, `/rank` e `/perfil/evolucao` foram removidos por decisão
de produto. O rating ainda pode existir como dado técnico para o motor de
categoria, sem virar uma rede social ou um ranking público nacional.

## 4. Como a plataforma ganha dinheiro

### Receita implementada no modelo

1. **Taxa sobre vendas de campeonatos** — aplicada a inscrições e ingressos,
   conforme a configuração do plano Padrão ou Elite.
2. **Plano Elite do campeonato** — reduz taxas e gera a cobrança de ativação
   definida pelo produto.
3. **Taxa de serviço da Arena** — os checkouts atuais de plano recorrente,
   aluguel e diária somam 10% ao valor pago pelo cliente. O valor-base é
   repassado à Arena e a diferença permanece na plataforma antes dos custos do
   gateway.

### Receita planejada ou ainda incompleta

4. **Assinatura mensal do dono de arena** — é uma receita adicional planejada,
   mas o preço, o checkout, as regras de trial, inadimplência,
   cancelamento e bloqueio ainda não estão concluídos.

O valor-base de mensalidade, aluguel e diária pertence à Arena; somente a taxa
de serviço é receita bruta da plataforma, sujeita a gateway e estornos. A
emissão manual de Pix de mensalidade ainda não soma os mesmos 10% no ponto em
que cria a cobrança. Essa divergência deve ser decidida e harmonizada antes da
operação real.

## 5. Experiência visual e navegação atual

### Desktop

- O site usa um **shell persistente** com barra lateral preta de largura fixa.
- A marca “FTV” aparece em um círculo branco com letras azuis.
- Ícones são claros e o item ativo recebe um indicador azul que desliza entre
  as posições.
- Uma luz azul percorre verticalmente a borda direita transparente da sidebar.
- A barra global que repetia o nome de cada página foi removida.
- O conteúdo troca por navegação client-side do Next.js, mantendo URL, link
  direto e histórico do navegador.
- O sino fica na parte inferior da sidebar e abre uma prévia das notificações;
  “Ver todas” leva ao feed completo.

### Mobile

- As páginas gerais preservam a navegação inferior em formato de pílula.
- Telas focadas, como autenticação, convite e pagamento, usam layout reduzido.
- O painel de arena usa cabeçalho e drawer próprios no mobile.
- Home, Arenas e Painel usam a transição entre cabeçalho escuro e conteúdo
  arredondado; a trilha é transparente e uma luz azul percorre o contorno.

### Linguagem visual comum

- Fundo geral: `#F3F5FA`, pelo token `app-bg`, em desktop e mobile.
- Cards, formulários e modais permanecem como superfícies claras sobre o
  fundo.
- Azul da marca: `#0000FF`, reservado para ações, seleção e detalhes.
- Perfil: cabeçalho preto, foto central em destaque e nome com hierarquia
  maior.

## 6. Navegação principal

### Público e conta

```text
/                         Home/campeonatos em destaque
/agenda                   Agenda pública
/campeonatos/*            Lista, detalhe, compra e operação do atleta
/arenas/*                 Vitrine e serviços públicos de arenas
/meus-ingressos           Recuperação pública de ingresso
/perfil                   Conta do usuário
/minhas-compras           Compras ligadas à conta
/minhas-inscricoes        Inscrições ligadas à conta
/notificacoes             Feed completo
```

### Organizador, arena, staff e administração

```text
/painel
/painel/campeonatos
/painel/campeonatos/[id]/*
/painel/novo-campeonato
/arena
/arena/[handle]/*
/staff/*
/admin/*
```

O painel principal consolida campeonatos e arenas. Dentro de um campeonato,
`ChampionshipShell` fornece navegação contextual. Dentro de uma arena,
`ArenaShell` preserva a área atual e troca apenas a seção de conteúdo.

## 7. Stack e arquitetura

- **Frontend e backend:** Next.js 16, App Router, TypeScript e Tailwind CSS 4.
- **Banco, autenticação e storage:** Supabase/Postgres com RLS.
- **Pagamentos:** Asaas.
- **E-mail transacional:** Resend.
- **Deploy e cron:** Vercel.
- **Ícones:** Lucide.
- **Gráficos:** Recharts.

Server Components são o padrão. Client Components ficam restritos a
interatividade, animações e estados locais. Relações internas usam UUID; nome,
e-mail e `@username` não são chaves de relacionamento.

## 8. Implementado versus pronto para produção

| Área | Estado |
|---|---|
| Navegação, autenticação e telas principais | Implementado no código |
| Campeonato, checkout, QR, financeiro e repasse | Implementado no código; depende de homologação externa |
| Arena, aulas, alunos, mensalidades, aluguel e diária | Implementado no código; depende de homologação externa |
| Segurança, RLS e hardening | Scripts e correções implementados; validar cada ambiente |
| Assinatura paga do dono da arena | Incompleta |
| Testes ponta a ponta com Asaas de produção | Pendentes |
| Configuração de domínio, Auth, Resend, DNS, backups e alertas | Externa e pendente de confirmação |
| Aviso de privacidade LGPD e processo de incidentes | Pendentes |
| Recursos de IA/WhatsApp e highlights | Futuro, fora do lançamento inicial |

“Implementado no código” não significa “configurado em produção”. A fonte
obrigatória para essa distinção é
[AUDITORIA-PRODUCAO.md](AUDITORIA-PRODUCAO.md).

## 9. Regras de produto e segurança

- Não criar conta separada por papel.
- Não usar dados, atletas, campeonatos ou credenciais falsos em produção.
- Não expor CPF, telefone, nascimento, tokens privados ou segredos do gateway.
- Nunca confiar em preço, permissão ou status de pagamento enviado pelo
  navegador.
- Toda operação sensível deve validar usuário, posse/permissão e estado do
  registro também no servidor.
- Segredos ficam somente em variáveis de ambiente.
- Interface em português do Brasil e valores em BRL.

## 10. Prioridades atuais

1. Concluir a configuração e homologação de produção.
2. Executar roteiro E2E de cadastro, compra, pagamento, webhook, estorno,
   check-in, painel e arena.
3. Decidir e implementar a assinatura do dono da arena ou ocultá-la no
   lançamento.
4. Publicar aviso de privacidade e processo operacional de incidentes.
5. Só depois ampliar automações, IA e canais como WhatsApp.

## 11. Manutenção deste documento

- Mudança de posicionamento ou regra de negócio: atualizar este arquivo.
- Mudança de rota, arquitetura ou fluxo implementado: atualizar
  [DOCUMENTACAO.md](DOCUMENTACAO.md).
- Mudança de risco, configuração externa ou prontidão: atualizar
  [AUDITORIA-PRODUCAO.md](AUDITORIA-PRODUCAO.md).
- Planos históricos devem ser mantidos como histórico, sem substituir a
  documentação do estado atual.
