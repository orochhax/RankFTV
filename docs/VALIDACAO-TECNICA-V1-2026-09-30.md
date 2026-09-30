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
    `queryid`, em transação somente leitura e sem imprimir SQL. A execução
    `36784797528` confirmou timeouts locais de 30/5/30 segundos, zero conexão
    ativa em espera, zero transação acima de um minuto, zero lock aguardando e
    zero sessão bloqueada.
11. O pico histórico de 26,74 s não se repetiu nem no ensaio rápido nem no
    completo autenticado. O ensaio completo fez 6.297 requisições em 17
    minutos, a 6,17 req/s, com erro HTTP de 0,23%, média de 503,14 ms, p95 de
    752,44 ms e máximo de 3,63 s. Os p95 por fluxo ficaram entre 471,69 ms e
    941,58 ms. Todos os thresholds passaram e nenhuma iteração foi
    interrompida. Os logs do pico histórico já expiraram, por isso não é
    possível atribuir sua causa retroativamente. Nas estatísticas acumuladas do
    banco, o maior `max_exec_time` sanitizado foi 6,88 s; isso também não
    reproduziu o outlier e não permite inferir que a origem antiga foi o banco.
12. Lint passou sem erros, TypeScript e build passaram, 802 testes passaram,
    `npm audit` terminou com zero vulnerabilidades e a busca por padrões de
    segredos não encontrou credenciais versionadas.
13. O smoke somente leitura de Production passou em 12 requisições: média de
    274 ms e máximo de 1.026 ms, com health, páginas públicas, legais, robots,
    sitemap, CSP, fronteira autenticada e rejeições esperadas dos endpoints.
14. O roteiro supervisionado completo está em `docs/SMOKE-TRANSACIONAL-V1.md`.
15. Checklist, runbook e auditoria devem manter os IDs de execução e separar
    claramente o que ainda exige prova externa.
16. A entrega técnica foi mesclada pelos PRs #20 e #21. A versão final da
    `master` passou pela CI `36784784375`; o worker protegido `36784801615` processou a fila
    financeira e o scanner de alertas, ambos com sucesso. A implantação Vercel
    do commit `9c06c2660d75a3b19ca2fb7963e1a8341d9e1893` ficou Ready.

## E2E Sandbox desta rodada

- 3/3 cenários do webhook Asaas passaram e a fixture foi limpa.
- 2/2 cenários de proteção concorrente/cooldown do cartão passaram.
- 6/6 cenários de segurança, acesso e login passaram.
- Reserva autenticada, aceite legal do atleta e bloqueio do checkout de plateia
  sem consentimento passaram.

## Operação externa concluída

- Entrega real comprovada no Gmail e no Microsoft 365/Outlook. O teste do
  Microsoft 365 chegou diretamente à Caixa de Entrada de
  `carlos.rocha@infortel.net.br`, sem criar cobrança.
- O saldo insuficiente foi comprovado no Asaas Sandbox com uma transferência
  Pix de teste R$ 100,00 acima do saldo disponível. A API retornou HTTP 400 e a
  mensagem `Saldo insuficiente para realizar a operação`; a consulta posterior
  confirmou que o saldo permaneceu inalterado.

## Operações externas ainda necessárias

1. Concluir o reembolso parcial no cartão no Asaas Sandbox. A cobrança
   descartável criada em 30/09 foi confirmada, mas o provedor respondeu que o
   parcial só pode ser solicitado depois da carência do cartão. Repetir depois
   da liberação e exigir estado terminal `DONE`; a prova de saldo insuficiente
   deste mesmo item já foi concluída.
2. Executar Pix e cartão reais em Production, supervisionados.
3. Contratar e configurar o e-mail comercial.
4. Aprovar os dados publicados em Termos/Privacidade e obter revisão jurídica.
5. Obter do Asaas a confirmação formal do escopo PCI/SAQ.
6. Definir data de lançamento e horário real de suporte.
