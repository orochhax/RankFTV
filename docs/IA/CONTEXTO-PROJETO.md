# Contexto do projeto RankFTV

## Produto

RankFTV é uma plataforma web responsiva para campeonatos de futevôlei e
operação de arenas. Uma conta pode acumular capacidades de atleta, organizador,
dono/funcionário de arena, staff e administrador, sempre com autorização no
servidor e no banco.

O lançamento comercial V1 está limitado a **Campeonatos**. Arena permanece
Beta. Ferramentas pessoais em `/admin` não fazem parte da V1 e não alteram o
percentual do release.

## Perfis e acesso

- Visitante: páginas públicas, campeonatos, arenas, notícias e recuperação
  protegida de ingresso.
- Atleta: perfil, dupla, inscrições, compras, pagamentos e credenciais próprias.
- Organizador: somente campeonatos que possui e seus recebíveis.
- Staff: somente campeonatos e permissões aceitos no convite.
- Arena: dono, gerente e professor possuem capacidades distintas.
- Administração comercial: `profiles.role` igual a `admin` ou `ceo`; funções
  especialmente sensíveis podem exigir `ceo`.
- `ADMIN_EMAIL` identifica o dono de ferramentas pessoais, mas não concede
  permissão administrativa comercial.

Esconder botão não é autorização. Página, Server Action, API, RLS, grant e RPC
precisam validar identidade, função e propriedade.

## Stack

As versões exatas vêm de `package.json`.

- Next.js App Router, React, TypeScript e Tailwind CSS.
- Supabase: Postgres, Auth, Storage, RLS e RPCs.
- Asaas: Pix, cartão hospedado, antecipações, webhooks e transferências.
- Resend: e-mail transacional.
- Vercel e GitHub Actions: deploy, CI, crons, backups e workers.

## Regras que não podem regredir

- PAN/CVV não entram no RankFTV; cartão usa checkout hospedado ou mecanismo
  homologado.
- Pagamento, estorno, webhook, reserva, saque e transferência precisam de
  idempotência e conciliação de resposta ambígua.
- O organizador não acessa dinheiro de outro organizador nem a parte da
  plataforma. O banco calcula e reserva o saque; o navegador não informa um
  total confiável livre.
- Timeout do provedor não é falha segura: a operação permanece reservada até
  conciliação.
- Credenciais, QR, CPF, e-mail, chave Pix e dados financeiros não entram em
  logs sem sanitização.
- SQLs em `supabase/` são incrementais; não executar em lote ou repetir em
  Production sem verificar estado e recuperação.
- Sandbox e Production usam projetos, URLs e credenciais separados.
- Deploy de código não prova migration remota; migration aplicada não prova o
  fluxo transacional ponta a ponta.

## Fontes canônicas

- `DOCUMENTACAO.md`: arquitetura, rotas, dados e fluxos.
- `PENDENCIAS-V1.md`: pendências do lançamento.
- `AUDITORIA-PRODUCAO.md`: evidências e riscos.
- `RUNBOOK-PRODUCAO.md`: ordem operacional e rollback.
- `REGISTRO-EXECUCOES.md`: histórico datado.
- `ftv.md`: visão de produto.
- `PLANO-PIVO-ARENA.md`: histórico, não estado atual.

## Método de trabalho

1. Identificar pedido, ambiente e impacto.
2. Ler contexto roteado e código real.
3. Preservar mudanças existentes.
4. Implementar o menor conjunto coerente.
5. Validar conforme o risco.
6. Atualizar documentação e registro.
7. Responder com resultado, evidência, pendência e próximo passo exato.
