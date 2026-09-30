-- RankFTV: trilha operacional de credenciais, e-mails e casos de suporte.
-- Nenhuma tabela abaixo armazena token de acesso, QR ou e-mail em texto puro.

CREATE TABLE IF NOT EXISTS athlete_ticket_credential_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL,
  athlete_ticket_id uuid NOT NULL,
  championship_id uuid NOT NULL,
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS athlete_ticket_credential_events_credential_idx
  ON athlete_ticket_credential_events(credential_id, created_at DESC);
CREATE INDEX IF NOT EXISTS athlete_ticket_credential_events_ticket_idx
  ON athlete_ticket_credential_events(athlete_ticket_id, created_at DESC);
ALTER TABLE athlete_ticket_credential_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON athlete_ticket_credential_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON athlete_ticket_credential_events TO service_role;

CREATE TABLE IF NOT EXISTS transactional_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'resend',
  provider_message_id text,
  template_key text NOT NULL,
  recipient_hash text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'accepted', 'delivered', 'delayed', 'bounced', 'complained', 'failed', 'suppressed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  delivered_at timestamptz,
  last_event_at timestamptz NOT NULL DEFAULT now(),
  failure_category text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS transactional_email_events_provider_message_uidx
  ON transactional_email_events(provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS transactional_email_events_status_idx
  ON transactional_email_events(status, requested_at DESC);
ALTER TABLE transactional_email_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON transactional_email_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON transactional_email_events TO service_role;

CREATE TABLE IF NOT EXISTS support_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_ticket_id uuid,
  credential_id uuid,
  case_type text NOT NULL DEFAULT 'outro',
  status text NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'aguardando_prova', 'resolvido')),
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 10 AND 500),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES support_cases(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  note text NOT NULL CHECK (char_length(note) BETWEEN 3 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_cases_status_idx ON support_cases(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS support_case_notes_case_idx ON support_case_notes(case_id, created_at);
ALTER TABLE support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_case_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON support_cases, support_case_notes FROM PUBLIC, anon, authenticated;
GRANT ALL ON support_cases, support_case_notes TO service_role;

CREATE OR REPLACE FUNCTION log_athlete_ticket_credential_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO athlete_ticket_credential_events (
      credential_id, athlete_ticket_id, championship_id, event_type, created_at
    ) VALUES (NEW.id, NEW.athlete_ticket_id, NEW.championship_id, 'issued', NEW.created_at);
    RETURN NEW;
  END IF;

  IF OLD.access_token IS DISTINCT FROM NEW.access_token
     OR OLD.qr_token IS DISTINCT FROM NEW.qr_token
     OR OLD.code IS DISTINCT FROM NEW.code THEN
    INSERT INTO athlete_ticket_credential_events (
      credential_id, athlete_ticket_id, championship_id, event_type, details
    ) VALUES (
      NEW.id, NEW.athlete_ticket_id, NEW.championship_id, 'rotated',
      jsonb_build_object('reason', 'credential_material_changed')
    );
  END IF;

  IF OLD.access_email_sent_at IS NULL AND NEW.access_email_sent_at IS NOT NULL THEN
    INSERT INTO athlete_ticket_credential_events (
      credential_id, athlete_ticket_id, championship_id, event_type, details, created_at
    ) VALUES (
      NEW.id, NEW.athlete_ticket_id, NEW.championship_id, 'email_sent',
      jsonb_build_object('athlete_slot', NEW.athlete_slot), NEW.access_email_sent_at
    );
  END IF;

  IF NOT OLD.checked_in AND NEW.checked_in THEN
    INSERT INTO athlete_ticket_credential_events (
      credential_id, athlete_ticket_id, championship_id, event_type, actor_id, created_at
    ) VALUES (
      NEW.id, NEW.athlete_ticket_id, NEW.championship_id, 'checked_in',
      NEW.checked_in_by, COALESCE(NEW.checkin_at, now())
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS athlete_ticket_credentials_event_log ON athlete_ticket_credentials;
CREATE TRIGGER athlete_ticket_credentials_event_log
  AFTER INSERT OR UPDATE OF access_token, qr_token, code, access_email_sent_at, checked_in, checkin_at
  ON athlete_ticket_credentials
  FOR EACH ROW EXECUTE FUNCTION log_athlete_ticket_credential_event();

INSERT INTO athlete_ticket_credential_events (
  credential_id, athlete_ticket_id, championship_id, event_type, created_at
)
SELECT c.id, c.athlete_ticket_id, c.championship_id, 'issued', c.created_at
FROM athlete_ticket_credentials c
WHERE NOT EXISTS (
  SELECT 1 FROM athlete_ticket_credential_events e
  WHERE e.credential_id = c.id AND e.event_type = 'issued'
);

REVOKE ALL ON FUNCTION log_athlete_ticket_credential_event() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-credential-operations done';
