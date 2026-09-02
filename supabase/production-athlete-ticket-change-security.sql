-- RankFTV V1: confirmacao de alteracoes sensiveis em ingressos de atletas.
-- O link gerencial continua necessario, mas sozinho nao autoriza trocar
-- identidade/e-mail. Os dados pedidos ficam congelados junto aos hashes dos
-- codigos de confirmacao e expiram rapidamente.

CREATE TABLE IF NOT EXISTS athlete_ticket_change_challenges (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_ticket_id     uuid NOT NULL REFERENCES athlete_tickets(id) ON DELETE CASCADE,
  requested_changes     jsonb NOT NULL,
  current_email         text NOT NULL,
  new_buyer_email       text,
  current_code_hash     text NOT NULL,
  new_email_code_hash   text,
  attempts              smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  used_at               timestamptz,
  expires_at            timestamptz NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (new_buyer_email IS NULL AND new_email_code_hash IS NULL)
    OR
    (new_buyer_email IS NOT NULL AND new_email_code_hash IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS athlete_ticket_change_challenges_pending_idx
  ON athlete_ticket_change_challenges(athlete_ticket_id, created_at DESC)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS athlete_ticket_change_challenges_expiry_idx
  ON athlete_ticket_change_challenges(expires_at)
  WHERE used_at IS NULL;

ALTER TABLE athlete_ticket_change_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON athlete_ticket_change_challenges FROM PUBLIC, anon, authenticated;
GRANT ALL ON athlete_ticket_change_challenges TO service_role;

-- Confere e consome o desafio sob lock. Assim cinco tentativas simultaneas
-- continuam contando como cinco e somente uma confirmacao correta vence.
CREATE OR REPLACE FUNCTION claim_athlete_ticket_change_challenge(
  p_challenge_id uuid,
  p_athlete_ticket_id uuid,
  p_current_code_hash text,
  p_new_email_code_hash text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_challenge athlete_ticket_change_challenges%ROWTYPE;
BEGIN
  SELECT * INTO v_challenge
  FROM athlete_ticket_change_challenges
  WHERE id = p_challenge_id
    AND athlete_ticket_id = p_athlete_ticket_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_challenge.used_at IS NOT NULL
     OR v_challenge.expires_at <= now()
     OR v_challenge.attempts >= 5 THEN
    RETURN false;
  END IF;

  IF v_challenge.current_code_hash IS DISTINCT FROM p_current_code_hash
     OR v_challenge.new_email_code_hash IS DISTINCT FROM p_new_email_code_hash THEN
    UPDATE athlete_ticket_change_challenges
    SET attempts = attempts + 1
    WHERE id = p_challenge_id;
    RETURN false;
  END IF;

  UPDATE athlete_ticket_change_challenges
  SET used_at = now()
  WHERE id = p_challenge_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION claim_athlete_ticket_change_challenge(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_athlete_ticket_change_challenge(uuid, uuid, text, text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-athlete-ticket-change-security done';
