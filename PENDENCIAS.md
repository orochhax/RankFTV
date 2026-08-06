# Pendencias tecnicas do RankFTV

Auditoria atualizada em 06/08/2026. Este documento cobre somente a plataforma Rank Futevolei: atletas, organizadores, campeonatos, ingressos, plateia, arenas, alunos e operacao financeira. As paginas pessoais `/admin/performance`, `/admin/gastos` e `/admin/gasto-mensal` nao fazem parte do produto RankFTV.

Configuracoes externas e decisoes do responsavel estao em `PENDENCIAS-MANUAIS.md`. A arquitetura pessoal do Performance e sua futura extracao estao em `PERFORMANCE.md`.

## Bloqueadores para trafego e dinheiro reais

1. **Atualizar dependencias vulneraveis.** `npm audit --omit=dev` encontrou 4 pacotes afetados: Next.js, PostCSS e Sharp com severidade alta, alem de DOMPurify com severidade baixa. Atualizar `next`, `eslint-config-next` e dependencias transitivas somente depois de ler os guias da versao instalada e executar regressao completa.
2. **Criar idempotencia financeira duravel.** Ainda existe uma janela ambigua entre enviar uma cobranca ao Asaas e persistir o ID retornado. Implementar operacao/outbox, chave interna unica, estados de tentativa e reconciliacao por `externalReference` para inscricoes, ingressos, mensalidades, aluguel, diaria e aula avulsa.
3. **Normalizar os itens dos pedidos de plateia.** Pedidos com varios tipos guardam parte dos itens em JSON. Quando um Pix multi-item expira, o cupom e liberado, mas o estoque por tipo pode continuar reservado. Criar `spectator_ticket_items`, migrar dados e reservar/liberar cada item atomicamente.
4. **Reduzir card testing e o escopo PCI.** Os checkouts publicos iniciais possuem rate limit, mas as acoes que enviam cartao ao Asaas precisam de limite por IP, usuario, pedido e identificador mascarado, cooldown progressivo e alerta de recusas. Preferir checkout hospedado ou tokenizacao direta quando o provedor oferecer suporte adequado.

## Produto e escala

5. **Finalizar ou ocultar a assinatura da plataforma para arenas.** `/arena/[handle]/assinatura` ainda mostra valor "A definir" e nao oferece contratacao real. Integrar um produto homologado ou remover a oferta das rotas de producao ate a decisao comercial.
6. **Adicionar paginacao server-side.** A listagem publica de arenas ainda carrega o conjunto inteiro para filtrar no cliente. Paginar no servidor, preservar busca e filtros na URL e revisar outras listas grandes para evitar consultas ilimitadas ou N+1.
7. **Implantar CSP com nonce.** O cabecalho ainda permite `unsafe-inline` em scripts e estilos. Migrar para nonce por requisicao sem quebrar Next.js, Tailwind, Turnstile, Supabase ou imagens.
8. **Criar observabilidade operacional.** Adicionar rastreamento de erros, health checks, logs estruturados sem PII, alertas para webhook/cron/repasse, identificador de correlacao e painel de conciliacao.

## Qualidade antes do lancamento

9. **Criar suite E2E com Playwright.** Cobrir cadastro, login, campeonato, inscricao, Pix, cartao, estorno, ingressos, check-in, equipes, arena, mensalidade, aluguel, diaria e repasse.
10. **Criar testes de contrato do Asaas.** Usar fixtures assinadas e sandbox para eventos duplicados, fora de ordem, invalidos, recusas, estornos, timeout e reconciliacao.
11. **Adicionar gates de deploy.** A CI deve executar lint, TypeScript, testes unitarios, E2E critico, build e `npm audit --omit=dev`, bloqueando deploy quando houver falha relevante.

## Prompt completo para executar tudo

```text
Trabalhe no repositorio RankFTV e resolva todas as pendencias tecnicas descritas em PENDENCIAS.md, de ponta a ponta. Antes de editar, leia AGENTS.md, CLAUDE.md, DOCUMENTACAO.md, AUDITORIA-PRODUCAO.md, PENDENCIAS-MANUAIS.md e os guias relevantes da versao instalada em node_modules/next/dist/docs/. O projeto pode ter alteracoes locais: preserve tudo que nao for seu e nao reverta trabalho existente.

Escopo obrigatorio: somente o produto Rank Futevolei, incluindo atletas, organizadores, campeonatos, inscricoes, ingressos de atleta e plateia, check-in, equipes, arenas, alunos, planos de arena, cobrancas e repasses. Nao altere `/admin/performance`, `/admin/gastos`, `/admin/gasto-mensal`, tabelas `perf_*` ou tabelas financeiras pessoais.

Objetivo: deixar o RankFTV tecnicamente pronto para trafego e pagamentos reais, sem inventar credenciais, dados empresariais ou configuracoes externas.

1. Dependencias e framework
- Rode npm audit --omit=dev e atualize Next.js, eslint-config-next e dependencias transitivas para versoes corrigidas e compativeis.
- Leia os guias locais da nova versao antes de adaptar APIs.
- Garanta zero vulnerabilidades altas ou criticas e documente qualquer excecao restante.

2. Operacoes financeiras idempotentes
- Modele uma tabela de operacoes/outbox com chave interna unica, external_reference, fluxo, registro relacionado, estado, tentativas, erro sanitizado, provider_payment_id e timestamps.
- Refatore todos os pontos que criam cobranca: inscricao, ingresso atleta, ingresso plateia, mensalidade, aluguel, diaria e aula avulsa.
- Um retry nunca pode criar duas cobrancas. Timeout ambiguo deve manter a operacao conciliavel e nunca liberar estoque prematuramente.
- Crie reconciliador seguro por externalReference e integre-o ao cron ou a uma rota administrativa protegida.
- Preserve idempotencia de webhook, estorno e repasse.

3. Pedido multi-item de plateia
- Crie migration aditiva e idempotente para spectator_ticket_items com ticket_id, ticket_type_id, nome fotografado, valor unitario, quantidade, indices e FKs.
- Faca backfill do JSON quando o tipo puder ser identificado sem ambiguidade e gere relatorio para casos nao migraveis.
- Reserve e libere estoque por item em transacao/RPC atomica.
- Atualize checkout, exibicao, webhook, cancelamento, estorno e expiracao de Pix.
- Garanta que cupom e estoque sejam liberados exatamente uma vez.

4. Protecao contra card testing e reducao de escopo PCI
- Aplique rate limit duravel nas acoes que enviam cartao ao Asaas, combinando IP, usuario, pedido e identificador mascarado sem persistir PAN ou CVV.
- Implemente cooldown progressivo, limite de recusas, bloqueio temporario e alerta operacional.
- Prefira checkout hospedado ou tokenizacao direta do Asaas quando a documentacao e a conta vigente oferecerem essa opcao.
- Caso nao seja possivel, mantenha PAN/CVV apenas em memoria pelo menor tempo, nunca registre esses campos e documente os controles aplicaveis.
- Adicione testes de limite, concorrencia, desbloqueio e mascaramento de logs.

5. Assinatura da plataforma de arenas
- Localize `/arena/[handle]/assinatura`. Implemente o produto usando preco centralizado e cobranca confiavel, ou remova/oculte completamente a oferta enquanto o preco estiver indefinido.
- Nao deixe texto "A definir", botao falso ou promessa de cobranca em producao.

6. Paginacao e indices
- Implemente paginacao server-side na listagem de arenas, com busca/filtros na URL, total e estados vazios.
- Audite listagens de campeonatos, plateia, alunos e paineis para evitar carregamento ilimitado e N+1.
- Adicione indices SQL com justificativa e testes para as consultas alteradas.

7. CSP e headers
- Implemente nonce por requisicao conforme a documentacao oficial do Next.js instalado.
- Remova unsafe-inline de script-src e, quando tecnicamente possivel, de style-src.
- Preserve Turnstile, Supabase, fontes, imagens e desenvolvimento sem abrir wildcards desnecessarios.
- Crie testes de headers para paginas publicas, autenticadas e respostas de erro.

8. Observabilidade
- Integre um provedor configuravel de erros e performance.
- Use logs JSON com correlation_id, fluxo e registro, mascarando CPF, telefone, e-mail, tokens, chaves Pix e dados de cartao.
- Crie `/api/health` sem segredos, alertas para falha de webhook/cron/repasse e politica de retencao.

9. Testes e CI
- Adicione Playwright e cubra os fluxos criticos do RankFTV com usuarios e dados descartaveis.
- Crie fixtures de webhook Asaas para eventos duplicados, fora de ordem, invalidos, estorno e timeout.
- Configure CI para executar lint, npx tsc --noEmit, npm test, E2E, npm run build e npm audit --omit=dev.
- Nao use mocks para a logica central; use sandbox e fixtures somente nas fronteiras externas.

Requisitos gerais:
- Use migrations aditivas, idempotentes e com RLS minimo necessario.
- Nunca exponha service role, chave Asaas, CRON_SECRET ou tokens no navegador.
- Nao altere as paginas e dados pessoais hospedados temporariamente no projeto.
- Atualize .env.example e a documentacao sem colocar segredos reais.
- Preserve dados existentes e descreva backfill e rollback.
- Antes de concluir, rode todos os gates e corrija falhas reais sem desativar regras.
- Entregue resumo por bloco, migrations criadas, configuracoes manuais restantes e resultados exatos dos testes.
```
