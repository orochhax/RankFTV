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
  access_token          text NOT NULL DEFAULT gen_random_uuid()::text,
  access_email_sent_at  timestamptz,
  access_email_claimed_at timestamptz,
  checked_in            boolean NOT NULL DEFAULT false,
  checkin_at            timestamptz,
  checked_in_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (athlete_ticket_id, athlete_slot),
  UNIQUE (qr_token),
  UNIQUE (code)
);

-- Compatibilidade para quem já executou a primeira versão desta migration.
-- O DEFAULT temporário em access_email_sent_at marca somente as linhas que já
-- existiam antes desta versão. Assim o cron não dispara e-mails retroativos;
-- credenciais criadas depois continuam nascendo com NULL e serão entregues.
ALTER TABLE athlete_ticket_credentials
  ADD COLUMN IF NOT EXISTS access_token text DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS access_email_sent_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS access_email_claimed_at timestamptz;

ALTER TABLE athlete_ticket_credentials
  ALTER COLUMN access_email_sent_at DROP DEFAULT;

UPDATE athlete_ticket_credentials
SET access_token = gen_random_uuid()::text
WHERE access_token IS NULL;

ALTER TABLE athlete_ticket_credentials
  ALTER COLUMN access_token SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN access_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS athlete_ticket_credentials_access_token_uidx
  ON athlete_ticket_credentials(access_token);

CREATE INDEX IF NOT EXISTS athlete_ticket_credentials_pending_email_idx
  ON athlete_ticket_credentials(created_at, access_email_claimed_at)
  WHERE access_email_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS athlete_ticket_credentials_champ_checkin_idx
  ON athlete_ticket_credentials(championship_id, checked_in, athlete_ticket_id, athlete_slot);

ALTER TABLE athlete_ticket_credentials ENABLE ROW LEVEL SECURITY;

-- O parceiro não pode selecionar athlete_tickets diretamente: essa linha tem
-- o token gerencial do comprador. A função abaixo expõe somente um booleano
-- para a RLS da credencial individual, sem vazar token, CPF ou e-mail.
DROP POLICY IF EXISTS athlete_tickets_select_owner_user ON athlete_tickets;
CREATE POLICY athlete_tickets_select_owner_user ON athlete_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION can_select_athlete_ticket_credential(
  p_athlete_ticket_id uuid,
  p_athlete_slot smallint
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM athlete_tickets t
    WHERE t.id = p_athlete_ticket_id
      AND (
        (p_athlete_slot = 1 AND t.user_id = auth.uid())
        OR
        (p_athlete_slot = 2 AND t.parceiro_user_id = auth.uid())
      )
  );
$$;

REVOKE ALL ON FUNCTION can_select_athlete_ticket_credential(uuid, smallint)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION can_select_athlete_ticket_credential(uuid, smallint)
  TO authenticated;

DROP POLICY IF EXISTS athlete_ticket_credentials_select ON athlete_ticket_credentials;
CREATE POLICY athlete_ticket_credentials_select ON athlete_ticket_credentials
  FOR SELECT TO authenticated
  USING (
    can_select_athlete_ticket_credential(athlete_ticket_id, athlete_slot)
  );

REVOKE ALL ON athlete_ticket_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT ON athlete_ticket_credentials TO authenticated;
GRANT ALL ON athlete_ticket_credentials TO service_role;

-- Preserva o QR/código legado como credencial do comprador. Se o ingresso
-- antigo já tinha check-in, não há como saber quem chegou; por segurança e
-- fidelidade histórica, os dois integrantes são marcados como presentes.
INSERT INTO athlete_ticket_credentials (
  athlete_ticket_id, championship_id, athlete_slot, display_name_snapshot,
  qr_token, code, access_email_sent_at, checked_in, checkin_at, updated_at
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
  now(),
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

  -- Se a identidade de um atleta mudar, o link antigo deixa de funcionar e
  -- uma nova entrega por e-mail poderá ser feita ao novo titular.
  IF TG_OP = 'UPDATE' THEN
    IF OLD.championship_id IS DISTINCT FROM NEW.championship_id
       OR OLD.comprador_cpf IS DISTINCT FROM NEW.comprador_cpf
       OR LOWER(COALESCE(OLD.comprador_email, '')) IS DISTINCT FROM LOWER(COALESCE(NEW.comprador_email, '')) THEN
      UPDATE athlete_ticket_credentials
      SET access_token = gen_random_uuid()::text,
          qr_token = gen_random_uuid()::text,
          code = 'A1' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
          access_email_sent_at = NULL,
          access_email_claimed_at = NULL,
          updated_at = now()
      WHERE athlete_ticket_id = NEW.id AND athlete_slot = 1;
    END IF;

    IF OLD.championship_id IS DISTINCT FROM NEW.championship_id
       OR OLD.parceiro_cpf IS DISTINCT FROM NEW.parceiro_cpf
       OR LOWER(COALESCE(OLD.parceiro_email, '')) IS DISTINCT FROM LOWER(COALESCE(NEW.parceiro_email, '')) THEN
      UPDATE athlete_ticket_credentials
      SET access_token = gen_random_uuid()::text,
          qr_token = gen_random_uuid()::text,
          code = 'A2' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
          access_email_sent_at = NULL,
          access_email_claimed_at = NULL,
          updated_at = now()
      WHERE athlete_ticket_id = NEW.id AND athlete_slot = 2;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS athlete_tickets_sync_individual_credentials ON athlete_tickets;
CREATE TRIGGER athlete_tickets_sync_individual_credentials
  AFTER INSERT OR UPDATE OF championship_id, comprador_nome, comprador_cpf,
    comprador_email, parceiro_nome, parceiro_cpf, parceiro_email
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

-- Impede que uma credencial seja ligada por engano a um campeonato diferente
-- do pedido pai, mesmo em escritas privilegiadas via service_role.
CREATE OR REPLACE FUNCTION enforce_athlete_ticket_credential_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM athlete_tickets t
    WHERE t.id = NEW.athlete_ticket_id
      AND t.championship_id = NEW.championship_id
  ) THEN
    RAISE EXCEPTION 'ATHLETE_TICKET_CREDENTIAL_DOMAIN_MISMATCH'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS athlete_ticket_credentials_domain ON athlete_ticket_credentials;
CREATE TRIGGER athlete_ticket_credentials_domain
  BEFORE INSERT OR UPDATE OF athlete_ticket_id, championship_id
  ON athlete_ticket_credentials
  FOR EACH ROW EXECUTE FUNCTION enforce_athlete_ticket_credential_domain();

REVOKE ALL ON FUNCTION sync_athlete_ticket_credentials() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION sync_athlete_ticket_checkin_summary() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION enforce_athlete_ticket_credential_domain() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-athlete-ticket-credentials done';
