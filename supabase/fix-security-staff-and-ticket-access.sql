-- =============================================================
-- FIX SEGURANCA — staff com RLS + token privado para ingressos
--
-- 1) Fecha championship_staff no nivel do banco. A aplicacao continua fazendo
--    checagens, mas RLS passa a ser a barreira principal.
-- 2) Adiciona access_token aos ingressos de visitante. O id do ticket deixa de
--    ser suficiente para abrir dados sensiveis, alterar titularidade ou cancelar.
--
-- Rode no Supabase SQL Editor. Seguro rodar mais de uma vez.
-- =============================================================

-- ── Staff ────────────────────────────────────────────────────
ALTER TABLE championship_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS championship_staff_select ON championship_staff;
CREATE POLICY championship_staff_select ON championship_staff
  FOR SELECT USING (
    user_id = auth.uid()
    OR invited_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM championships c
      WHERE c.id = championship_staff.championship_id
        AND c.organizador_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS championship_staff_insert ON championship_staff;
CREATE POLICY championship_staff_insert ON championship_staff
  FOR INSERT WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM championships c
      WHERE c.id = championship_staff.championship_id
        AND c.organizador_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS championship_staff_update ON championship_staff;
CREATE POLICY championship_staff_update ON championship_staff
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM championships c
      WHERE c.id = championship_staff.championship_id
        AND c.organizador_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM championships c
      WHERE c.id = championship_staff.championship_id
        AND c.organizador_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS championship_staff_delete ON championship_staff;
CREATE POLICY championship_staff_delete ON championship_staff
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM championships c
      WHERE c.id = championship_staff.championship_id
        AND c.organizador_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON championship_staff TO authenticated;
GRANT ALL ON championship_staff TO service_role;

-- ── Ticket access token ──────────────────────────────────────
ALTER TABLE athlete_tickets
  ADD COLUMN IF NOT EXISTS access_token text;

ALTER TABLE spectator_tickets
  ADD COLUMN IF NOT EXISTS access_token text;

CREATE UNIQUE INDEX IF NOT EXISTS athlete_tickets_access_token_unique
  ON athlete_tickets(access_token)
  WHERE access_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS spectator_tickets_access_token_unique
  ON spectator_tickets(access_token)
  WHERE access_token IS NOT NULL;

-- Backfill para tickets antigos. Depois disso, links antigos sem ?token=...
-- param de abrir dados sensiveis, mas "Minhas Compras" e "Meus Ingressos"
-- conseguem montar links novos.
UPDATE athlete_tickets
SET access_token = gen_random_uuid()::text
WHERE access_token IS NULL;

UPDATE spectator_tickets
SET access_token = gen_random_uuid()::text
WHERE access_token IS NULL;

ALTER TABLE athlete_tickets
  ALTER COLUMN access_token SET NOT NULL;

ALTER TABLE spectator_tickets
  ALTER COLUMN access_token SET NOT NULL;

-- Fecha definitivamente o vazamento historico de CPF/telefone em profiles.
-- O codigo deve ler/escrever esses dados apenas em profiles_private.
ALTER TABLE profiles DROP COLUMN IF EXISTS cpf;
ALTER TABLE profiles DROP COLUMN IF EXISTS telefone;

NOTIFY pgrst, 'reload schema';
