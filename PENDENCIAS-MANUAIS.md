# Pendencias manuais do RankFTV

Atualizado em 07/08/2026. Somente o responsavel pelas contas, dominio e dados legais pode concluir os itens abaixo. O passo a passo de deploy, validacao, backfill e rollback esta em `RUNBOOK-PRODUCAO.md`.

## Release tecnico atual

- [ ] Fazer snapshot recuperavel do Supabase e confirmar que as migrations-base citadas no runbook ja existem no projeto remoto.
- [ ] Aplicar, na ordem do runbook, `financial-operations.sql`, `payment-card-attempt-security.sql`, `production-spectator-ticket-items.sql`, `production-order-inventory-release.sql`, `asaas-webhook-idempotency.sql`, `production-query-indexes.sql` e `production-data-retention.sql`.
- [ ] Conferir `spectator_ticket_items_backfill_report`. Todo item `partial` ou `unmigrated` deve ser analisado antes de liberar expiracao/estorno de pedidos legados.
- [ ] Configurar os novos segredos e endpoints: `PAYMENT_FINGERPRINT_SECRET`, `OBSERVABILITY_HTTP_ENDPOINT`, `OBSERVABILITY_HTTP_TOKEN` e `OPERATIONS_ALERT_WEBHOOK_URL`.
- [ ] Confirmar no Vercel os crons de repasse, conciliacao financeira e retencao; testar cada rota com `CRON_SECRET` e conferir o alerta de falha.
- [ ] Executar Playwright com contas e dados descartaveis de atleta/organizador. Ativar os testes mutantes de Asaas e card guard somente em Supabase/Asaas sandbox.
- [ ] Fazer deploy em Preview, validar `/api/health`, CSP, login, painel e pagamentos sandbox; so depois promover exatamente o mesmo commit.

## Antes de receber trafego real

- [ ] **Identidade legal:** definir razao social ou responsavel, CNPJ quando houver e e-mail oficial de privacidade. Substituir `[PENDENTE]` em `app/termos/page.tsx` e `app/privacidade/page.tsx`; validar termos, cancelamento, estorno e atendimento com orientacao juridica/contabil.
- [ ] **Dominio e Vercel:** conectar `rankftv.com`, confirmar HTTPS, definir `NEXT_PUBLIC_BASE_URL`, separar Preview/Production e impedir credenciais sandbox em producao.
- [ ] **Supabase:** ativar backup/PITR, testar restauracao, alertas de consumo e MFA administrativo; revisar RLS com anon, atleta, organizador, staff, dono de arena e service role.
- [ ] **Storage:** conferir policies, MIME e tamanho dos buckets de banners, noticias, arenas, camisas e avatares; remover policies antigas permissivas.
- [ ] **Turnstile/Auth:** confirmar Site URL, Redirect URLs, dominio do Turnstile, politica de senha, recuperacao e protecao contra abuso no ambiente final.

## Pagamentos e repasses

- [ ] **Conta Asaas de producao:** concluir KYC e habilitar Pix, cartao, parcelamento, estorno, assinaturas e transferencias. Guardar a chave apenas no cofre da Vercel.
- [ ] **Conformidade de cartao:** confirmar com Asaas/especialista o SAQ e escopo PCI aplicavel. Verificar se a conta vigente oferece checkout hospedado ou tokenizacao direta capaz de reduzir o escopo atual.
- [ ] **Webhook:** cadastrar `https://rankftv.com/api/webhooks/asaas`, usar `ASAAS_WEBHOOK_TOKEN` forte e habilitar confirmacao, recebimento, solicitacao de estorno, estorno, exclusao e chargeback. Remover URLs antigas de tunnel/sandbox.
- [ ] **Homologacao:** com valores baixos e autorizados, testar Pix, cartao aprovado/recusado, parcelamento, timeout apos escrita, clique repetido, evento duplicado/fora de ordem, estorno, assinatura, inadimplencia e repasse. Conciliar Asaas, ledger, pedido e interface.
- [ ] **Chaves Pix:** testar titularidade, cooldown apos troca, falta de chave e transferencia recusada. Definir procedimento humano para outbox/repasse preso.
- [ ] **Assinatura da plataforma para arenas:** a oferta esta oculta e as rotas retornam 404. Antes de reativa-la, decidir preco, teste, carencia, inadimplencia e cancelamento e implementar um produto financeiro separado.

## Operacao e comunicacao

- [ ] Verificar dominio do Resend, publicar SPF/DKIM/DMARC, definir `RESEND_FROM_EMAIL` e testar Gmail/Outlook/spam.
- [ ] Criar contas sandbox de atleta, organizador, dono de arena, aluno e staff e preencher as variaveis `E2E_*` somente no ambiente de CI apropriado.
- [ ] Configurar monitoramento externo em `/api/health`, coleta no provedor escolhido e canal de emergencia para `OPERATIONS_ALERT_WEBHOOK_URL`.
- [ ] Definir responsavel, SLA e roteiro para conciliacao diaria, estorno, ingresso nao recebido, conta bloqueada, incidente de seguranca e solicitacao LGPD.
- [ ] Fazer backup final, registrar commit/migrations implantados e ensaiar rollback antes de abrir pagamentos.

## Variaveis do RankFTV

Publicas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BASE_URL` e `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

Privadas: `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `ASAAS_BASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `PAYMENT_FINGERPRINT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`, `OBSERVABILITY_HTTP_ENDPOINT`, `OBSERVABILITY_HTTP_TOKEN`, `OPERATIONS_ALERT_WEBHOOK_URL` e, opcionalmente, `APP_VERSION`.

Nunca usar prefixo `NEXT_PUBLIC_` em service role, chave Asaas, fingerprint secret, cron, observabilidade ou token de webhook.
