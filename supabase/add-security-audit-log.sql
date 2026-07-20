-- =============================================================
-- RANKFTV — Trilha de auditoria pra mudanças sensíveis (gênero após uso
-- competitivo, chave Pix, campos financeiros/administrativos).
-- Idempotente — pode rodar mais de uma vez.
-- =============================================================

CREATE TABLE IF NOT EXISTS security_audit_log (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  acao         text        NOT NULL,
  alvo_tabela  text,
  alvo_id      uuid,
  detalhes     jsonb,
  ip           text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_actor    ON security_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_acao     ON security_audit_log(acao);
CREATE INDEX IF NOT EXISTS idx_security_audit_alvo     ON security_audit_log(alvo_tabela, alvo_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_created  ON security_audit_log(created_at);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Só admin/ceo lê. Ninguém edita/apaga (log é write-once via service_role).
DROP POLICY IF EXISTS security_audit_select ON security_audit_log;
CREATE POLICY security_audit_select ON security_audit_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'ceo')
  ));

REVOKE ALL ON security_audit_log FROM authenticated, anon, public;
GRANT SELECT ON security_audit_log TO authenticated; -- filtrado pela policy acima (só admin/ceo enxerga linha)
GRANT INSERT, SELECT ON security_audit_log TO service_role;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'add-security-audit-log done';
