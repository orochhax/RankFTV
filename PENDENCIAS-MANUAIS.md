# Pendencias manuais do RankFTV

Auditoria atualizada em 06/08/2026. Este documento cobre somente a plataforma Rank Futevolei. O modulo pessoal Performance esta documentado separadamente em `PERFORMANCE.md`.

## Antes de receber trafego real

- [ ] **Identidade legal:** definir razao social ou responsavel, CNPJ quando houver e e-mail oficial de privacidade. Substituir os marcadores `[PENDENTE]` em `app/termos/page.tsx` e `app/privacidade/page.tsx`. Validar termos, privacidade, cancelamento, estorno e atendimento com orientacao juridica e contabil.
- [ ] **Dominio e Vercel:** conectar `rankftv.com`, confirmar HTTPS, configurar `NEXT_PUBLIC_BASE_URL`, revisar Preview/Production e impedir credenciais de sandbox em producao.
- [ ] **Supabase:** ativar backup/PITR, testar restauracao, revisar alertas de consumo, manter MFA administrativa e conferir as migrations de producao em backup recente.
- [ ] **Storage:** conferir policies, MIME e tamanho dos buckets de banners, noticias, arenas, camisas e avatares; remover policies antigas permissivas.
- [ ] **Turnstile e Auth:** confirmar Site URL, Redirect URLs, dominio do Turnstile, protecao de login/cadastro e recuperacao de senha no ambiente final.

## Pagamentos e repasses

- [ ] **Conta Asaas de producao:** concluir KYC, habilitar Pix, cartao, parcelamento, estorno, assinaturas e transferencias Pix. Guardar a nova API key somente no cofre da Vercel.
- [ ] **Conformidade de cartao:** confirmar com o Asaas e um especialista qual SAQ/escopo PCI se aplica aos fluxos atuais. Aprovar checkout hospedado ou tokenizacao direta se disponivel e definir resposta a card testing.
- [ ] **Webhook Asaas:** cadastrar `https://rankftv.com/api/webhooks/asaas`, definir um `ASAAS_WEBHOOK_TOKEN` forte e habilitar os eventos usados. Confirmar entregas HTTP 2xx e remover webhooks antigos de tunnel/sandbox.
- [ ] **Homologacao financeira:** com valores baixos e dados autorizados, testar Pix, cartao aprovado/recusado, parcelamento, timeout, duplicidade, estorno, inadimplencia, cancelamento e repasse. Conciliar Asaas, banco e interface.
- [ ] **Chaves Pix:** testar titularidade, cooldown apos troca, conta sem chave e falha de transferencia. Definir procedimento humano para repasse preso ou divergente.
- [ ] **Preco da plataforma para arenas:** decidir valor, periodo de teste, carencia, inadimplencia, cancelamento e se a oferta sera lancada ou retirada temporariamente.

## Comunicacao e operacao

- [ ] **Resend:** verificar dominio, publicar SPF/DKIM/DMARC, definir `RESEND_FROM_EMAIL` e testar Gmail, Outlook e spam. Criar enderecos oficiais de suporte e privacidade.
- [ ] **Cron de repasse:** definir `CRON_SECRET`, confirmar `/api/cron/repasse-liquidacao` e criar alerta para falhas.
- [ ] Criar contas de teste para atleta, organizador, dono de arena, aluno e equipe.
- [ ] Executar o fluxo completo em celular e desktop: cadastro, campeonato, inscricao, pagamento, ingresso, check-in, chaveamento, comunicacao, arena e cobrancas.
- [ ] Definir canal e prazo de suporte para pagamentos, estornos, ingresso nao recebido, conta bloqueada e exclusao de dados.
- [ ] Definir responsavel por conciliacao diaria e incidentes de seguranca/LGPD.
- [ ] Configurar monitoramento externo, alertas e contato de emergencia.
- [ ] Fazer backup final, registrar o commit implantado e preparar rollback antes de abrir pagamentos.

## Variaveis do RankFTV em producao

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_BASE_URL`, `ADMIN_EMAIL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `ASAAS_BASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` e `CRON_SECRET`.

Nunca colocar `SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_API_KEY`, `CRON_SECRET` ou tokens de webhook em variaveis `NEXT_PUBLIC_*`.
