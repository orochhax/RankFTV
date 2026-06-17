-- =============================================================
-- RANKFTV — Credenciais digitais e check-in (Fase 1)
-- Execute no Supabase SQL Editor (pode rodar mais de uma vez).
--
-- Cada atleta inscrito (com pagamento confirmado) recebe uma linha
-- nessa tabela. O qr_token é o valor gravado no QR code do celular.
-- O organizador escaneia → marca checked_in = true + checkin_at.
-- =============================================================

CREATE TABLE IF NOT EXISTS credentials (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  championship_id  uuid        NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  -- 'atleta' | 'arbitro' | 'staff' | 'organizador'
  role             text        NOT NULL DEFAULT 'atleta'
                     CHECK (role IN ('atleta', 'arbitro', 'staff', 'organizador')),
  -- Valor gravado no QR code. UUID string, único globalmente.
  qr_token         text        NOT NULL DEFAULT gen_random_uuid()::text,
  checked_in       boolean     NOT NULL DEFAULT false,
  checkin_at       timestamptz,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (qr_token),
  UNIQUE (user_id, championship_id, role)
);

CREATE INDEX IF NOT EXISTS idx_credentials_championship ON credentials(championship_id);
CREATE INDEX IF NOT EXISTS idx_credentials_user         ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_qr_token     ON credentials(qr_token);

-- ── SEGURANÇA (RLS) ───────────────────────────────────────────

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- Atleta vê a própria credencial
DROP POLICY IF EXISTS credentials_select_own ON credentials;
CREATE POLICY credentials_select_own ON credentials FOR SELECT
  USING (user_id = auth.uid());

-- Organizador vê todas as credenciais do seu campeonato
DROP POLICY IF EXISTS credentials_select_organizer ON credentials;
CREATE POLICY credentials_select_organizer ON credentials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM championships c
      WHERE c.id = championship_id
        AND c.organizador_id = auth.uid()
    )
  );

-- Inserção pelo próprio usuário (quando a inscrição é confirmada)
DROP POLICY IF EXISTS credentials_insert ON credentials;
CREATE POLICY credentials_insert ON credentials FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Organizador marca checked_in no campeonato dele
DROP POLICY IF EXISTS credentials_update_organizer ON credentials;
CREATE POLICY credentials_update_organizer ON credentials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM championships c
      WHERE c.id = championship_id
        AND c.organizador_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM championships c
      WHERE c.id = championship_id
        AND c.organizador_id = auth.uid()
    )
  );

-- ── GRANTS ────────────────────────────────────────────────────

GRANT SELECT ON credentials TO anon, authenticated;
GRANT INSERT, UPDATE ON credentials TO authenticated;

-- ── SEED DE TESTE ─────────────────────────────────────────────
-- Cria credencial de teste para a conta carlosrocha0923@gmail.com
-- no primeiro campeonato encontrado (RochaCup 2026).
-- Pode rodar mais de uma vez (ON CONFLICT ignora duplicatas).

DO $$
DECLARE
  v_user_id        uuid;
  v_championship_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users
  WHERE email = 'carlosrocha0923@gmail.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuário não encontrado — seed de credencial ignorado.';
    RETURN;
  END IF;

  SELECT id INTO v_championship_id FROM championships
  WHERE organizador_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_championship_id IS NULL THEN
    RAISE NOTICE 'Nenhum campeonato encontrado — seed de credencial ignorado.';
    RETURN;
  END IF;

  INSERT INTO credentials (user_id, championship_id, role, qr_token)
  VALUES (v_user_id, v_championship_id, 'atleta', 'TEST-QR-TOKEN-ROCHHAX')
  ON CONFLICT (user_id, championship_id, role) DO NOTHING;

  RAISE NOTICE 'Credencial de teste criada (ou já existia). Token: TEST-QR-TOKEN-ROCHHAX';
END;
$$;
