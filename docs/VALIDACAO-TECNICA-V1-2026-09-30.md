# Validação técnica da V1 — 30/09/2026

Este registro separa evidência técnica automatizada de operações que ainda
dependem de uma pessoa, do Asaas ou de caixas de e-mail reais. Nenhum teste
financeiro mutável apontou para Production.

## Evidências concluídas

1. A fila de avisos financeiros ganhou detecção de acúmulo e de falha
   definitiva. A migration de produção foi aplicada e verificada pela execução
   GitHub Actions `36779269155`.
2. O painel `/admin/alertas` ganhou configuração e contingência específicas de
   e-mail, acessíveis somente ao CEO.
3. O E2E descartável do webhook confirmou uma única transição, duas credenciais
   e um aviso por evento mesmo após repetição, estorno e evento fora de ordem.
4. A falha temporária mantém a entrega na fila com backoff; a quinta falha a
   suprime. O contrato está coberto por teste unitário.
5. Cancelamento, timeout, cobrança inelegível e estados de reembolso têm
   contratos automatizados; a proteção concorrente de cartão passou no banco
   Sandbox.
6. O worker de alteração de campeonato está ativo em Production. Os contratos
   cobrem data, horário/local, auditoria, retentativa e conteúdo.
7. A resolução de destinatários acontece no envio, deduplica o e-mail por hash
   e exclui pedidos não pagos, expirados ou estornados.
8. A suíte cobre entradas válidas e inválidas de autenticação, cadastro,
   inscrição, compra, consentimento e recuperação. No Preview, atleta e
   organizador autenticaram; os checkouts de atleta e plateia recusaram envio
   sem consentimento.
9. O k6 autenticado cobre público, atleta, organizador, campeonato,
   chaveamento, placar ao vivo e consulta privada de ingresso/QR.
10. O workflow `production-performance-audit.yml` mede conexões, esperas,
    transações longas, locks, deadlocks, temporários e tempos agregados por
    `queryid`, em transação somente leitura e sem imprimir SQL.
11. O pico histórico de 26,74 s não se repetiu nem no ensaio rápido nem no
    completo autenticado. O ensaio completo fez 6.297 requisições em 17
    minutos, a 6,17 req/s, com erro HTTP de 0,23%, média de 503,14 ms, p95 de
    752,44 ms e máximo de 3,63 s. Os p95 por fluxo ficaram entre 471,69 ms e
    941,58 ms. Todos os thresholds passaram e nenhuma iteração foi
    interrompida. Os logs do pico histórico já expiraram, por isso não é
    possível atribuir sua causa retroativamente.
12. Lint passou sem erros, TypeScript e build passaram, 802 testes passaram,
    `npm audit` terminou com zero vulnerabilidades e a busca por padrões de
    segredos não encontrou credenciais versionadas.
13. O smoke somente leitura de Production passou em 12 requisições: média de
    274 ms e máximo de 1.026 ms, com health, páginas públicas, legais, robots,
    sitemap, CSP, fronteira autenticada e rejeições esperadas dos endpoints.
14. O roteiro supervisionado completo está em `docs/SMOKE-TRANSACIONAL-V1.md`.
15. Checklist, runbook e auditoria devem manter os IDs de execução e separar
    claramente o que ainda exige prova externa.
16. A entrega técnica está no PR #20, protegida por CI e Preview da Vercel.

## E2E Sandbox desta rodada

- 3/3 cenários do webhook Asaas passaram e a fixture foi limpa.
- 2/2 cenários de proteção concorrente/cooldown do cartão passaram.
- 6/6 cenários de segurança, acesso e login passaram.
- Reserva autenticada, aceite legal do atleta e bloqueio do checkout de plateia
  sem consentimento passaram.

## Operações externas ainda necessárias

1. Comprovar entrega real em Gmail e Outlook.
2. Executar reembolso parcial no cartão e saldo insuficiente no Asaas Sandbox.
3. Executar Pix e cartão reais em Production, supervisionados.
4. Contratar e configurar o e-mail comercial.
5. Aprovar os dados publicados em Termos/Privacidade e obter revisão jurídica.
6. Obter do Asaas a confirmação formal do escopo PCI/SAQ.
7. Definir data de lançamento e horário real de suporte.
