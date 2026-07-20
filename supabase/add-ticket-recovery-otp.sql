-- =============================================================
-- RANKFTV — Recuperação de ingresso por OTP (substitui devolução direta
-- de access_token por CPF+e-mail).
--
-- CPF não é segredo no Brasil (circula entre conhecidos, vaza em
-- vazamentos de dados) e e-mail é frequentemente descobrível — devolver o
-- access_token (bearer permanente pro QR de entrada) só com essa dupla
-- era pouco. Agora /api/meus-ingressos manda um código de 6 dígitos pro
-- e-mail informado (só quem tem a caixa de entrada consegue completar) e
-- /api/meus-ingressos/verificar troca o código pelos ingressos.
--
-- Só o hash do código fica salvo (nunca o valor em texto puro), com
-- expiração curta e no máximo N tentativas. Tabela só existe pro
-- service_role — não é uma tela que usuário final acessa via Supabase.
--
-- Idempotente — pode rodar mais de uma vez.
-- =============================================================

CREATE TABLE IF NOT EXISTS ticket_recovery_codes (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  cpf          text        NOT NULL,
  email        text        NOT NULL,
  codigo_hash  text        NOT NULL,
  tentativas   int         NOT NULL DEFAULT 0,
  usado_em     timestamptz,
  expira_em    timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_recovery_cpf_email ON ticket_recovery_codes(cpf, email);
CREATE INDEX IF NOT EXISTS idx_ticket_recovery_expira     ON ticket_recovery_codes(expira_em);

ALTER TABLE ticket_recovery_codes ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy pra authenticated/anon — só service_role acessa (RLS sem
-- policy nenhuma nega tudo por padrão pra quem não é o dono da tabela).
REVOKE ALL ON ticket_recovery_codes FROM authenticated, anon, public;
GRANT ALL ON ticket_recovery_codes TO service_role;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'add-ticket-recovery-otp done';
