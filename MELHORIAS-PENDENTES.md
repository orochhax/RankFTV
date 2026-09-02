# Melhorias pendentes

Os itens de segurança das credenciais, operação de e-mails, central de
suporte, PDF e painel de check-in foram implementados. O histórico permanece
registrado no Git.

## Dependência externa: carteiras digitais

- [ ] Emitir passes oficiais para Apple Wallet e Google Wallet. A integração
  exige conta de emissor, certificados/chaves privadas e aprovação das duas
  plataformas. Até essas credenciais existirem, o link online limpo e o PDF
  individual são as opções suportadas; não será criado um passe não assinado
  que pareça oficial.

## Ativação operacional necessária

- [ ] Executar `supabase/production-credential-operations.sql` no projeto de
  homologação e, depois, executar novamente
  `supabase/production-data-retention.sql`.
- [ ] Configurar `RESEND_WEBHOOK_SECRET` e `EMAIL_EVENT_HASH_SECRET` na Vercel,
  cadastrar o endpoint `/api/webhooks/resend` no provedor de e-mail e fazer
  novo deploy.

Depois da validação em homologação, estas duas tarefas de ativação também
devem ser removidas deste arquivo.
