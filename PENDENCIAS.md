# Pendencias tecnicas do RankFTV

Atualizado em 07/08/2026. Este documento cobre somente o produto Rank Futevolei. As areas pessoais hospedadas temporariamente no repositorio permanecem fora deste escopo.

## Estado atual

As pendencias tecnicas levantadas na auditoria de 06/08/2026 foram implementadas no codigo local. Nao ha bloqueador tecnico conhecido nesta lista que exija inventar credenciais, dados empresariais ou configuracoes externas.

O RankFTV ainda nao deve receber dinheiro real ate que as migrations deste release sejam aplicadas, os servicos externos sejam configurados e a homologacao financeira com dados descartaveis seja concluida. Esses passos dependem do responsavel pelo projeto e estao em `PENDENCIAS-MANUAIS.md` e `RUNBOOK-PRODUCAO.md`.

## Entregue nesta rodada

1. **Dependencias:** Next.js e `eslint-config-next` em 16.3.0, overrides corrigidos para DOMPurify, PostCSS e Sharp, e auditoria de producao sem vulnerabilidade alta ou critica.
2. **Idempotencia financeira:** ledger `financial_operations`, outbox duravel, lease transacional, uma operacao por `operation_type + external_reference`, tratamento de timeout ambiguo e reconciliacao automatica. Todos os fluxos de cobranca do RankFTV passam por essa camada.
3. **Webhook, estorno e repasse:** ledger monotonicamente ordenado para eventos Asaas, repeticao segura, conciliacao por referencia externa, estorno idempotente e repasse que so termina quando a transferencia chega a `DONE`.
4. **Plateia multi-item:** itens normalizados, backfill conservador com relatorio, reserva/liberacao atomica por tipo e lote, e devolucao exatamente uma vez de estoque e cupom.
5. **Card testing:** limites duraveis por IP, usuario, pedido e fingerprint HMAC do cartao, cooldown progressivo, bloqueio, alertas e persistencia exclusiva dos quatro ultimos digitos. PAN e CVV nao entram no banco nem nos logs.
6. **Assinatura da plataforma para arenas:** oferta indefinida removida da navegacao; as rotas de assinatura da plataforma retornam 404 enquanto nao existir produto e preco aprovados. Planos vendidos por cada arena aos seus alunos continuam ativos.
7. **Escala:** arenas, campeonatos, plateia, alunos, check-ins, financeiro e diretorios administrativos relevantes usam paginacao/aggregates no servidor. Consultas alteradas receberam indices e eliminacao de N+1 com `auth.users`.
8. **CSP e headers:** nonce por requisicao no `proxy.ts`, `script-src` sem `unsafe-inline`, correlation ID e headers aplicados a respostas publicas, protegidas, redirecionamentos e erros.
9. **Observabilidade:** logs JSON com redacao de PII, endpoint HTTP configuravel, webhook de alertas, captura de erros do Next.js, `/api/health`, alertas de cron/webhook/repasse e retencao automatizada.
10. **Testes e CI:** Playwright, fixtures Asaas, testes unitarios/contratuais, testes sandbox condicionais de concorrencia e um workflow que executa audit, lint, tipos, testes, build e E2E.

## Excecoes conscientes

- `style-src` ainda usa `unsafe-inline`: React e Recharts geram atributos `style` dinamicos que nao aceitam nonce. `script-src` esta estrito. Remover a excecao de estilo exige migrar esses atributos para classes ou propriedades CSS antes, sem quebrar graficos e layout.
- O fluxo atual de cartao continua backend-to-backend com o Asaas. PAN/CVV vivem apenas na memoria da requisicao e nao sao persistidos ou registrados. A disponibilidade de checkout hospedado/tokenizacao direta e o enquadramento PCI da conta real precisam ser confirmados externamente.
- Testes E2E que alteram pagamentos ou rate limits ficam desativados por padrao e exigem uma base sandbox descartavel. Eles nunca devem apontar para producao.

## Validacao local

Os resultados finais dos gates ficam registrados em `AUDITORIA-PRODUCAO.md`. O
escopo RankFTV esta verde em tipos e em 165 testes proprios. A verificacao
global do repositorio ainda encontra quatro ocorrencias no produto pessoal em
desenvolvimento: dois erros de fixture TypeScript em `study-organization` e
dois testes de comportamento em `study-roadmap-ai`. Esses arquivos nao foram
alterados porque o escopo desta rodada proibe mudancas no produto pessoal.

A aplicacao das migrations e os testes em Asaas/Supabase reais nao podem ser
inferidos a partir do repositorio.
