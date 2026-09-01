-- RankFTV V1: duas credenciais individuais vinculadas a cada compra de dupla.
-- A compra/pagamento continua em athlete_tickets; cada atleta recebe QR e
-- estado de check-in próprios. Additive, idempotente e com backfill legado.

CREATE TABLE IF NOT EXISTS athlete_ticket_credentials (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_ticket_id     uuid NOT NULL REFERENCES athlete_tickets(id) ON DELETE CASCADE,
  championship_id       uuid NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  athlete_slot          smallint NOT NULL CHECK (athlete_slot IN (1, 2)),
  display_name_snapshot text NOT NULL,
  qr_token              text NOT NULL DEFAULT gen_random_uuid()::text,
  code                  text NOT NULL DEFAULT 'P' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 9)),
  checked_in            boolean NOT NULL DEFAULT false,
  checkin_at            timestamptz,
  checked_in_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (athlete_ticket_id, athlete_slot),
  UNIQUE (qr_token),
  UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS athlete_ticket_credentials_champ_checkin_idx
  ON athlete_ticket_credentials(championship_id, checked_in, athlete_ticket_id, athlete_slot);

ALTER TABLE athlete_ticket_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS athlete_ticket_credentials_select ON athlete_ticket_credentials;
CREATE POLICY athlete_ticket_credentials_select ON athlete_ticket_credentials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM championships c
      WHERE c.id = athlete_ticket_credentials.championship_id
        AND c.organizador_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM championship_staff cs
      WHERE cs.championship_id = athlete_ticket_credentials.championship_id
        AND cs.user_id = auth.uid()
        AND cs.status = 'aceito'
        AND cs.can_qrcode = true
    )
    OR EXISTS (
      SELECT 1
      FROM athlete_tickets t
      WHERE t.id = athlete_ticket_credentials.athlete_ticket_id
        AND (t.user_id = auth.uid() OR t.parceiro_user_id = auth.uid())
    )
  );

REVOKE ALL ON athlete_ticket_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT ON athlete_ticket_credentials TO authenticated;
GRANT ALL ON athlete_ticket_credentials TO service_role;

-- Preserva o QR/código legado como credencial do comprador. Se o ingresso
-- antigo já tinha check-in, não há como saber quem chegou; por segurança e
-- fidelidade histórica, os dois integrantes são marcados como presentes.
INSERT INTO athlete_ticket_credentials (
  athlete_ticket_id, championship_id, athlete_slot, display_name_snapshot,
  qr_token, code, checked_in, checkin_at, updated_at
)
SELECT
  t.id,
  t.championship_id,
  slot.athlete_slot,
  CASE slot.athlete_slot WHEN 1 THEN t.comprador_nome ELSE t.parceiro_nome END,
  CASE slot.athlete_slot
    WHEN 1 THEN COALESCE(t.qr_token, gen_random_uuid()::text)
    ELSE gen_random_uuid()::text
  END,
  CASE slot.athlete_slot
    WHEN 1 THEN COALESCE(t.code, 'A1' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)))
    ELSE 'A2' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  END,
  t.checked_in,
  CASE WHEN t.checked_in THEN t.checkin_at ELSE NULL END,
  now()
FROM athlete_tickets t
CROSS JOIN (VALUES (1::smallint), (2::smallint)) AS slot(athlete_slot)
ON CONFLICT (athlete_ticket_id, athlete_slot) DO UPDATE SET
  championship_id = EXCLUDED.championship_id,
  display_name_snapshot = EXCLUDED.display_name_snapshot,
  updated_at = now();

-- Toda compra nova recebe as duas credenciais automaticamente. Alterações
-- autorizadas nos nomes também mantêm o nome exibido em cada credencial.
CREATE OR REPLACE FUNCTION sync_athlete_ticket_credentials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO athlete_ticket_credentials (
    athlete_ticket_id, championship_id, athlete_slot, display_name_snapshot,
    qr_token, code, updated_at
  ) VALUES (
    NEW.id,
    NEW.championship_id,
    1,
    COALESCE(NULLIF(BTRIM(NEW.comprador_nome), ''), 'Atleta 1'),
    COALESCE(NEW.qr_token, gen_random_uuid()::text),
    COALESCE(NEW.code, 'A1' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
    now()
  )
  ON CONFLICT (athlete_ticket_id, athlete_slot) DO UPDATE SET
    championship_id = EXCLUDED.championship_id,
    display_name_snapshot = EXCLUDED.display_name_snapshot,
    updated_at = now();

  INSERT INTO athlete_ticket_credentials (
    athlete_ticket_id, championship_id, athlete_slot, display_name_snapshot,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.championship_id,
    2,
    COALESCE(NULLIF(BTRIM(NEW.parceiro_nome), ''), 'Atleta 2'),
    now()
  )
  ON CONFLICT (athlete_ticket_id, athlete_slot) DO UPDATE SET
    championship_id = EXCLUDED.championship_id,
    display_name_snapshot = EXCLUDED.display_name_snapshot,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS athlete_tickets_sync_individual_credentials ON athlete_tickets;
CREATE TRIGGER athlete_tickets_sync_individual_credentials
  AFTER INSERT OR UPDATE OF championship_id, comprador_nome, parceiro_nome
  ON athlete_tickets
  FOR EACH ROW EXECUTE FUNCTION sync_athlete_ticket_credentials();

-- O campo legado athlete_tickets.checked_in passa a representar "ao menos
-- um atleta chegou". Isso mantém o bloqueio de cancelamento/reembolso assim
-- que qualquer integrante usar sua credencial.
CREATE OR REPLACE FUNCTION sync_athlete_ticket_checkin_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ticket_id uuid;
  v_any_checked boolean;
  v_first_checkin timestamptz;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_ticket_id := OLD.athlete_ticket_id;
  ELSE
    v_ticket_id := NEW.athlete_ticket_id;
  END IF;

  SELECT
    COALESCE(bool_or(c.checked_in), false),
    MIN(c.checkin_at) FILTER (WHERE c.checked_in)
  INTO v_any_checked, v_first_checkin
  FROM athlete_ticket_credentials c
  WHERE c.athlete_ticket_id = v_ticket_id;

  UPDATE athlete_tickets
  SET checked_in = v_any_checked,
      checkin_at = v_first_checkin
  WHERE id = v_ticket_id
    AND (checked_in IS DISTINCT FROM v_any_checked
      OR checkin_at IS DISTINCT FROM v_first_checkin);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS athlete_ticket_credentials_sync_summary ON athlete_ticket_credentials;
CREATE TRIGGER athlete_ticket_credentials_sync_summary
  AFTER INSERT OR DELETE OR UPDATE OF checked_in, checkin_at
  ON athlete_ticket_credentials
  FOR EACH ROW EXECUTE FUNCTION sync_athlete_ticket_checkin_summary();

REVOKE ALL ON FUNCTION sync_athlete_ticket_credentials() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION sync_athlete_ticket_checkin_summary() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-athlete-ticket-credentials done';
