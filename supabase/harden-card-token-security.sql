-- =============================================================
-- RANKFTV — Hardening: token de cartão reutilizável (arena_student_cards)
--
-- Pesquisa na documentação oficial da Asaas (docs.asaas.com) confirmou que
-- não existe SDK de tokenização client-side (tipo Stripe.js) — só duas
-- opções oficiais: (1) o próprio backend recebe os dados do cartão e
-- repassa via HTTPS pro endpoint deles (create card ainda usa isso, decisão
-- tomada de manter — ver comentário em lib/asaas.ts), ou (2) checkout
-- hospedado (fora de escopo desta rodada). A Asaas trata a opção (1) como
-- compatível com PCI contanto que a conexão seja HTTPS — o que já é
-- garantido em produção (Vercel).
--
-- O que ESTAVA errado, independente da tokenização em si: a policy
-- "arena_student_cards_own" (FOR ALL) + GRANT SELECT direto pra
-- authenticated deixava o PRÓPRIO ALUNO ler asaas_card_token — um token
-- reutilizável de cobrança — direto do navegador, apesar do comentário na
-- migration original dizer o contrário. GRANT column-level abaixo restringe
-- o que authenticated pode selecionar a bandeira/últimos dígitos/validade;
-- token e asaas_customer_id ficam só pra service_role. INSERT/UPDATE/DELETE
-- também passam a exigir service_role — as Server Actions
-- (salvarCartaoArena/removerCartaoArena) já autenticam e verificam
-- propriedade em TypeScript antes de escrever, então passam a usar o
-- client admin.
--
-- Idempotente — pode rodar mais de uma vez.
-- =============================================================

REVOKE ALL ON arena_student_cards FROM authenticated, anon, public;

GRANT SELECT (id, arena_id, user_id, brand, last4, exp_month, exp_year, created_at, updated_at)
  ON arena_student_cards TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON arena_student_cards TO service_role;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'harden-card-token-security done';
