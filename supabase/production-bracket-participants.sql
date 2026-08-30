-- RankFTV V1: one canonical bracket participant for authenticated teams and
-- guest/quick-checkout athlete tickets. Additive and idempotent.

CREATE TABLE IF NOT EXISTS bracket_participants (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id       uuid NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  category_id           uuid NOT NULL REFERENCES championship_categories(id) ON DELETE CASCADE,
  source_type           text NOT NULL CHECK (source_type IN ('team', 'athlete_ticket')),
  team_id               uuid UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  athlete_ticket_id     uuid UNIQUE REFERENCES athlete_tickets(id) ON DELETE CASCADE,
  display_name_snapshot text NOT NULL,
  active                boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (source_type = 'team' AND team_id IS NOT NULL AND athlete_ticket_id IS NULL)
    OR
    (source_type = 'athlete_ticket' AND athlete_ticket_id IS NOT NULL AND team_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS bracket_participants_champ_category_active_idx
  ON bracket_participants(championship_id, category_id, active, display_name_snapshot, id);

ALTER TABLE bracket_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bracket_participants_select ON bracket_participants;
CREATE POLICY bracket_participants_select ON bracket_participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM championships c
      WHERE c.id = bracket_participants.championship_id
        AND c.organizador_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM championship_staff cs
      WHERE cs.championship_id = bracket_participants.championship_id
        AND cs.user_id = auth.uid()
        AND cs.status = 'aceito'
        AND cs.can_chaveamento = true
    )
  );
REVOKE ALL ON bracket_participants FROM PUBLIC, anon, authenticated;
GRANT SELECT ON bracket_participants TO authenticated;
GRANT ALL ON bracket_participants TO service_role;

-- Keep the participant projection aligned with registration terminal states.
CREATE OR REPLACE FUNCTION sync_team_bracket_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_team teams%ROWTYPE;
  v_name text;
  v_active boolean;
BEGIN
  SELECT * INTO v_team FROM teams WHERE id = NEW.team_id;
  IF NOT FOUND OR v_team.category_id IS NULL THEN RETURN NEW; END IF;

  SELECT concat_ws(
    ' & ',
    COALESCE(NULLIF(BTRIM(p1.nome), ''), 'Atleta'),
    CASE WHEN v_team.atleta2_id IS NOT NULL
      THEN COALESCE(NULLIF(BTRIM(p2.nome), ''), 'Atleta')
      ELSE NULL
    END
  ) INTO v_name
  FROM profiles p1
  LEFT JOIN profiles p2 ON p2.id = v_team.atleta2_id
  WHERE p1.id = v_team.atleta1_id;

  SELECT v_team.status <> 'cancelado' AND EXISTS (
    SELECT 1 FROM registrations r
    WHERE r.team_id = v_team.id AND r.status_pagamento = 'pago'
  ) INTO v_active;

  INSERT INTO bracket_participants (
    championship_id, category_id, source_type, team_id,
    display_name_snapshot, active, updated_at
  ) VALUES (
    v_team.championship_id, v_team.category_id, 'team', v_team.id,
    COALESCE(NULLIF(v_name, ''), 'Atleta'), v_active, now()
  )
  ON CONFLICT (team_id) DO UPDATE SET
    championship_id = EXCLUDED.championship_id,
    category_id = EXCLUDED.category_id,
    display_name_snapshot = EXCLUDED.display_name_snapshot,
    active = EXCLUDED.active,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sync_ticket_bracket_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.category_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO bracket_participants (
    championship_id, category_id, source_type, athlete_ticket_id,
    display_name_snapshot, active, updated_at
  ) VALUES (
    NEW.championship_id,
    NEW.category_id,
    'athlete_ticket',
    NEW.id,
    concat_ws(
      ' & ',
      COALESCE(NULLIF(BTRIM(NEW.comprador_nome), ''), 'Atleta'),
      COALESCE(NULLIF(BTRIM(NEW.parceiro_nome), ''), 'Atleta')
    ),
    NEW.status_pagamento = 'pago',
    now()
  )
  ON CONFLICT (athlete_ticket_id) DO UPDATE SET
    championship_id = EXCLUDED.championship_id,
    category_id = EXCLUDED.category_id,
    display_name_snapshot = EXCLUDED.display_name_snapshot,
    active = EXCLUDED.active,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Backfill paid domain rows before wiring matches to the canonical projection.
INSERT INTO bracket_participants (
  championship_id, category_id, source_type, team_id,
  display_name_snapshot, active, updated_at
)
SELECT DISTINCT ON (t.id)
  t.championship_id,
  t.category_id,
  'team',
  t.id,
  concat_ws(
    ' & ',
    COALESCE(NULLIF(BTRIM(p1.nome), ''), 'Atleta'),
    CASE WHEN t.atleta2_id IS NOT NULL
      THEN COALESCE(NULLIF(BTRIM(p2.nome), ''), 'Atleta')
      ELSE NULL
    END
  ),
  t.status <> 'cancelado' AND r.status_pagamento = 'pago',
  now()
FROM registrations r
JOIN teams t ON t.id = r.team_id
JOIN profiles p1 ON p1.id = t.atleta1_id
LEFT JOIN profiles p2 ON p2.id = t.atleta2_id
WHERE t.category_id IS NOT NULL
ORDER BY t.id, (r.status_pagamento = 'pago') DESC, r.created_at DESC
ON CONFLICT (team_id) DO UPDATE SET
  championship_id = EXCLUDED.championship_id,
  category_id = EXCLUDED.category_id,
  display_name_snapshot = EXCLUDED.display_name_snapshot,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO bracket_participants (
  championship_id, category_id, source_type, athlete_ticket_id,
  display_name_snapshot, active, updated_at
)
SELECT
  a.championship_id,
  a.category_id,
  'athlete_ticket',
  a.id,
  concat_ws(
    ' & ',
    COALESCE(NULLIF(BTRIM(a.comprador_nome), ''), 'Atleta'),
    COALESCE(NULLIF(BTRIM(a.parceiro_nome), ''), 'Atleta')
  ),
  a.status_pagamento = 'pago',
  now()
FROM athlete_tickets a
WHERE a.category_id IS NOT NULL
ON CONFLICT (athlete_ticket_id) DO UPDATE SET
  championship_id = EXCLUDED.championship_id,
  category_id = EXCLUDED.category_id,
  display_name_snapshot = EXCLUDED.display_name_snapshot,
  active = EXCLUDED.active,
  updated_at = now();

-- Preserve legacy brackets and add canonical participant references alongside
-- the old team references used by the rating ledger.
INSERT INTO bracket_participants (
  championship_id, category_id, source_type, team_id,
  display_name_snapshot, active, updated_at
)
SELECT DISTINCT
  t.championship_id,
  t.category_id,
  'team',
  t.id,
  concat_ws(
    ' & ',
    COALESCE(NULLIF(BTRIM(p1.nome), ''), 'Atleta'),
    CASE WHEN t.atleta2_id IS NOT NULL
      THEN COALESCE(NULLIF(BTRIM(p2.nome), ''), 'Atleta')
      ELSE NULL
    END
  ),
  t.status <> 'cancelado',
  now()
FROM bracket_matches m
CROSS JOIN LATERAL unnest(ARRAY[m.team_a_id, m.team_b_id, m.winner_id]) AS ids(team_id)
JOIN teams t ON t.id = ids.team_id
JOIN profiles p1 ON p1.id = t.atleta1_id
LEFT JOIN profiles p2 ON p2.id = t.atleta2_id
WHERE ids.team_id IS NOT NULL AND t.category_id IS NOT NULL
ON CONFLICT (team_id) DO UPDATE SET
  display_name_snapshot = EXCLUDED.display_name_snapshot,
  updated_at = now();

ALTER TABLE bracket_matches
  ADD COLUMN IF NOT EXISTS participant_a_id uuid REFERENCES bracket_participants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS participant_b_id uuid REFERENCES bracket_participants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS winner_participant_id uuid REFERENCES bracket_participants(id) ON DELETE SET NULL;

UPDATE bracket_matches m SET participant_a_id = p.id
FROM bracket_participants p
WHERE m.team_a_id = p.team_id AND m.participant_a_id IS DISTINCT FROM p.id;
UPDATE bracket_matches m SET participant_b_id = p.id
FROM bracket_participants p
WHERE m.team_b_id = p.team_id AND m.participant_b_id IS DISTINCT FROM p.id;
UPDATE bracket_matches m SET winner_participant_id = p.id
FROM bracket_participants p
WHERE m.winner_id = p.team_id AND m.winner_participant_id IS DISTINCT FROM p.id;

CREATE INDEX IF NOT EXISTS bracket_matches_participant_a_idx ON bracket_matches(participant_a_id);
CREATE INDEX IF NOT EXISTS bracket_matches_participant_b_idx ON bracket_matches(participant_b_id);

-- A participant reference must always belong to the match domain. Historical
-- participants may later become inactive, so activity is checked by the app
-- when assigning and not by this integrity trigger.
CREATE OR REPLACE FUNCTION enforce_bracket_match_participant_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.participant_a_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM bracket_participants p
    WHERE p.id = NEW.participant_a_id
      AND p.championship_id = NEW.championship_id
      AND p.category_id = NEW.category_id
  ) THEN
    RAISE EXCEPTION 'BRACKET_PARTICIPANT_DOMAIN_MISMATCH' USING ERRCODE = '23514';
  END IF;
  IF NEW.participant_b_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM bracket_participants p
    WHERE p.id = NEW.participant_b_id
      AND p.championship_id = NEW.championship_id
      AND p.category_id = NEW.category_id
  ) THEN
    RAISE EXCEPTION 'BRACKET_PARTICIPANT_DOMAIN_MISMATCH' USING ERRCODE = '23514';
  END IF;
  IF NEW.participant_a_id IS NOT NULL
     AND NEW.participant_a_id = NEW.participant_b_id THEN
    RAISE EXCEPTION 'BRACKET_PARTICIPANT_DUPLICATED' USING ERRCODE = '23514';
  END IF;
  IF NEW.winner_participant_id IS NOT NULL
     AND NEW.winner_participant_id IS DISTINCT FROM NEW.participant_a_id
     AND NEW.winner_participant_id IS DISTINCT FROM NEW.participant_b_id THEN
    RAISE EXCEPTION 'BRACKET_WINNER_INVALID' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bracket_matches_participant_domain ON bracket_matches;
CREATE TRIGGER bracket_matches_participant_domain
  BEFORE INSERT OR UPDATE OF championship_id, category_id, participant_a_id,
    participant_b_id, winner_participant_id
  ON bracket_matches
  FOR EACH ROW EXECUTE FUNCTION enforce_bracket_match_participant_domain();

DROP TRIGGER IF EXISTS registrations_sync_bracket_participant ON registrations;
CREATE TRIGGER registrations_sync_bracket_participant
  AFTER INSERT OR UPDATE OF status_pagamento, team_id, category_id, championship_id
  ON registrations
  FOR EACH ROW EXECUTE FUNCTION sync_team_bracket_participant();

DROP TRIGGER IF EXISTS athlete_tickets_sync_bracket_participant ON athlete_tickets;
CREATE TRIGGER athlete_tickets_sync_bracket_participant
  AFTER INSERT OR UPDATE OF status_pagamento, championship_id, category_id,
    comprador_nome, parceiro_nome
  ON athlete_tickets
  FOR EACH ROW EXECUTE FUNCTION sync_ticket_bracket_participant();

REVOKE ALL ON FUNCTION sync_team_bracket_participant() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION sync_ticket_bracket_participant() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION enforce_bracket_match_participant_domain() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-bracket-participants done';
