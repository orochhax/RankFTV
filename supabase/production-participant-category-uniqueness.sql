-- RankFTV - one active participation per athlete and category.
--
-- Covers both championship registration models:
--   * teams + registrations (authenticated flow)
--   * athlete_tickets (guest/quick checkout)
--
-- The advisory locks close the race between concurrent requests and between
-- the two different tables. A second request is rejected before Asaas is
-- called. Different categories in the same championship remain allowed.

-- Refuse installation while legacy conflicts still require an individual
-- refund/cancellation decision. Terminal rows do not reserve participation.
DO $$
DECLARE
  v_conflicts integer;
  v_missing_categories integer;
BEGIN
  SELECT count(*) INTO v_missing_categories
  FROM athlete_tickets a
  WHERE a.category_id IS NULL
    AND a.status_pagamento NOT IN ('estornado', 'expirado');

  IF v_missing_categories > 0 THEN
    RAISE EXCEPTION
      'P0_PARTICIPANT_CATEGORY_MISSING: % active athlete ticket(s) require an individual category decision before this migration',
      v_missing_categories;
  END IF;

  WITH active_teams AS (
    SELECT t.*
    FROM teams t
    WHERE t.status <> 'cancelado'
      AND (
        NOT EXISTS (SELECT 1 FROM registrations r0 WHERE r0.team_id = t.id)
        OR EXISTS (
          SELECT 1 FROM registrations r1
          WHERE r1.team_id = t.id
            AND r1.status_pagamento NOT IN ('estornado', 'expirado')
        )
      )
  ), identities AS (
    SELECT t.championship_id, t.category_id, 'user:' || u.user_id::text AS participant_key
    FROM active_teams t
    CROSS JOIN LATERAL unnest(ARRAY[t.atleta1_id, t.atleta2_id]) AS u(user_id)
    WHERE u.user_id IS NOT NULL

    UNION ALL

    SELECT t.championship_id, t.category_id,
           'cpf:' || regexp_replace(pp.cpf, '[^0-9]', '', 'g')
    FROM active_teams t
    CROSS JOIN LATERAL unnest(ARRAY[t.atleta1_id, t.atleta2_id]) AS u(user_id)
    JOIN profiles_private pp ON pp.user_id = u.user_id
    WHERE u.user_id IS NOT NULL
      AND regexp_replace(COALESCE(pp.cpf, ''), '[^0-9]', '', 'g') ~ '^[0-9]{11}$'

    UNION ALL

    SELECT a.championship_id, a.category_id, 'user:' || u.user_id::text
    FROM athlete_tickets a
    CROSS JOIN LATERAL unnest(ARRAY[a.user_id, a.parceiro_user_id]) AS u(user_id)
    WHERE a.status_pagamento NOT IN ('estornado', 'expirado')
      AND u.user_id IS NOT NULL

    UNION ALL

    SELECT a.championship_id, a.category_id,
           'cpf:' || regexp_replace(p.cpf, '[^0-9]', '', 'g')
    FROM athlete_tickets a
    CROSS JOIN LATERAL (VALUES (a.comprador_cpf), (a.parceiro_cpf)) AS p(cpf)
    WHERE a.status_pagamento NOT IN ('estornado', 'expirado')
      AND regexp_replace(COALESCE(p.cpf, ''), '[^0-9]', '', 'g') ~ '^[0-9]{11}$'
  ), duplicate_keys AS (
    SELECT championship_id, category_id, participant_key
    FROM identities
    WHERE category_id IS NOT NULL
    GROUP BY championship_id, category_id, participant_key
    HAVING count(*) > 1
  )
  SELECT count(*) INTO v_conflicts FROM duplicate_keys;

  IF v_conflicts > 0 THEN
    RAISE EXCEPTION
      'P0_PARTICIPANT_CATEGORY_CONFLICTS: % identity key(s) require refund/cancellation before this migration',
      v_conflicts;
  END IF;
END;
$$;

-- Align legacy rows with the same terminal-state rule used by the trigger
-- below. A team whose registrations are all terminal must not reserve a
-- category forever.
UPDATE teams t
SET status = 'cancelado'
WHERE t.status <> 'cancelado'
  AND EXISTS (
    SELECT 1 FROM registrations r0 WHERE r0.team_id = t.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM registrations r1
    WHERE r1.team_id = t.id
      AND r1.status_pagamento NOT IN ('estornado', 'expirado')
  );

-- The old rule blocked an athlete from the entire championship. V1 permits
-- different categories and blocks only repeated participation in one category.
DROP INDEX IF EXISTS teams_one_active_per_atleta1;

CREATE UNIQUE INDEX IF NOT EXISTS teams_one_active_category_per_atleta1
  ON teams (championship_id, category_id, atleta1_id)
  WHERE status <> 'cancelado';

CREATE UNIQUE INDEX IF NOT EXISTS teams_one_active_category_per_atleta2
  ON teams (championship_id, category_id, atleta2_id)
  WHERE status <> 'cancelado' AND atleta2_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS athlete_tickets_active_comprador_category_idx
  ON athlete_tickets (
    championship_id,
    category_id,
    regexp_replace(comprador_cpf, '[^0-9]', '', 'g')
  )
  WHERE status_pagamento NOT IN ('estornado', 'expirado');

CREATE INDEX IF NOT EXISTS athlete_tickets_active_parceiro_category_idx
  ON athlete_tickets (
    championship_id,
    category_id,
    regexp_replace(parceiro_cpf, '[^0-9]', '', 'g')
  )
  WHERE status_pagamento NOT IN ('estornado', 'expirado');

CREATE OR REPLACE FUNCTION rankftv_lock_participant_keys(p_keys text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key text;
BEGIN
  FOR v_key IN
    SELECT DISTINCT key
    FROM unnest(COALESCE(p_keys, ARRAY[]::text[])) AS key
    WHERE key IS NOT NULL AND key <> ''
    ORDER BY key
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_team_participant_category_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_users uuid[];
  v_cpfs text[];
  v_keys text[];
BEGIN
  IF NEW.status = 'cancelado' THEN RETURN NEW; END IF;
  IF NEW.category_id IS NULL THEN
    RAISE EXCEPTION 'PARTICIPANT_CATEGORY_REQUIRED' USING ERRCODE = '23514';
  END IF;
  IF NEW.atleta2_id IS NOT NULL AND NEW.atleta2_id = NEW.atleta1_id THEN
    RAISE EXCEPTION 'PARTICIPANT_ALREADY_REGISTERED'
      USING ERRCODE = '23505', CONSTRAINT = 'championship_participant_one_per_category';
  END IF;

  v_users := array_remove(ARRAY[NEW.atleta1_id, NEW.atleta2_id], NULL);
  SELECT COALESCE(array_agg(DISTINCT regexp_replace(pp.cpf, '[^0-9]', '', 'g')), ARRAY[]::text[])
  INTO v_cpfs
  FROM profiles_private pp
  WHERE pp.user_id = ANY(v_users)
    AND regexp_replace(COALESCE(pp.cpf, ''), '[^0-9]', '', 'g') ~ '^[0-9]{11}$';

  SELECT COALESCE(array_agg(DISTINCT participant_key ORDER BY participant_key), ARRAY[]::text[])
  INTO v_keys
  FROM (
    SELECT 'champ:' || NEW.championship_id::text || ':cat:' || NEW.category_id::text || ':user:' || u::text AS participant_key
    FROM unnest(v_users) AS u
    UNION ALL
    SELECT 'champ:' || NEW.championship_id::text || ':cat:' || NEW.category_id::text || ':cpf:' || c
    FROM unnest(v_cpfs) AS c
  ) keys;
  PERFORM rankftv_lock_participant_keys(v_keys);

  IF EXISTS (
    SELECT 1
    FROM teams t
    WHERE t.id <> NEW.id
      AND t.championship_id = NEW.championship_id
      AND t.category_id = NEW.category_id
      AND t.status <> 'cancelado'
      AND (
        NOT EXISTS (SELECT 1 FROM registrations r0 WHERE r0.team_id = t.id)
        OR EXISTS (
          SELECT 1 FROM registrations r1
          WHERE r1.team_id = t.id
            AND r1.status_pagamento NOT IN ('estornado', 'expirado')
        )
      )
      AND (
        t.atleta1_id = ANY(v_users)
        OR t.atleta2_id = ANY(v_users)
        OR EXISTS (
          SELECT 1 FROM profiles_private pp
          WHERE pp.user_id IN (t.atleta1_id, t.atleta2_id)
            AND regexp_replace(COALESCE(pp.cpf, ''), '[^0-9]', '', 'g') = ANY(v_cpfs)
        )
      )
  ) OR EXISTS (
    SELECT 1
    FROM athlete_tickets a
    WHERE a.championship_id = NEW.championship_id
      AND a.category_id = NEW.category_id
      AND a.status_pagamento NOT IN ('estornado', 'expirado')
      AND (
        a.user_id = ANY(v_users)
        OR a.parceiro_user_id = ANY(v_users)
        OR regexp_replace(COALESCE(a.comprador_cpf, ''), '[^0-9]', '', 'g') = ANY(v_cpfs)
        OR regexp_replace(COALESCE(a.parceiro_cpf, ''), '[^0-9]', '', 'g') = ANY(v_cpfs)
      )
  ) THEN
    RAISE EXCEPTION 'PARTICIPANT_ALREADY_REGISTERED'
      USING ERRCODE = '23505', CONSTRAINT = 'championship_participant_one_per_category';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_ticket_participant_category_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_users uuid[];
  v_cpfs text[];
  v_keys text[];
BEGIN
  IF NEW.status_pagamento IN ('estornado', 'expirado') THEN RETURN NEW; END IF;
  IF NEW.category_id IS NULL THEN
    RAISE EXCEPTION 'PARTICIPANT_CATEGORY_REQUIRED' USING ERRCODE = '23514';
  END IF;

  v_users := array_remove(ARRAY[NEW.user_id, NEW.parceiro_user_id], NULL);
  SELECT COALESCE(array_agg(DISTINCT cpf), ARRAY[]::text[])
  INTO v_cpfs
  FROM (
    SELECT regexp_replace(COALESCE(NEW.comprador_cpf, ''), '[^0-9]', '', 'g') AS cpf
    UNION ALL
    SELECT regexp_replace(COALESCE(NEW.parceiro_cpf, ''), '[^0-9]', '', 'g')
  ) normalized
  WHERE cpf ~ '^[0-9]{11}$';

  IF regexp_replace(COALESCE(NEW.comprador_cpf, ''), '[^0-9]', '', 'g') =
     regexp_replace(COALESCE(NEW.parceiro_cpf, ''), '[^0-9]', '', 'g') THEN
    RAISE EXCEPTION 'PARTICIPANT_ALREADY_REGISTERED'
      USING ERRCODE = '23505', CONSTRAINT = 'championship_participant_one_per_category';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT participant_key ORDER BY participant_key), ARRAY[]::text[])
  INTO v_keys
  FROM (
    SELECT 'champ:' || NEW.championship_id::text || ':cat:' || NEW.category_id::text || ':user:' || u::text AS participant_key
    FROM unnest(v_users) AS u
    UNION ALL
    SELECT 'champ:' || NEW.championship_id::text || ':cat:' || NEW.category_id::text || ':cpf:' || c
    FROM unnest(v_cpfs) AS c
  ) keys;
  PERFORM rankftv_lock_participant_keys(v_keys);

  IF EXISTS (
    SELECT 1
    FROM athlete_tickets a
    WHERE a.id <> NEW.id
      AND a.championship_id = NEW.championship_id
      AND a.category_id = NEW.category_id
      AND a.status_pagamento NOT IN ('estornado', 'expirado')
      AND (
        a.user_id = ANY(v_users)
        OR a.parceiro_user_id = ANY(v_users)
        OR regexp_replace(COALESCE(a.comprador_cpf, ''), '[^0-9]', '', 'g') = ANY(v_cpfs)
        OR regexp_replace(COALESCE(a.parceiro_cpf, ''), '[^0-9]', '', 'g') = ANY(v_cpfs)
      )
  ) OR EXISTS (
    SELECT 1
    FROM teams t
    WHERE t.championship_id = NEW.championship_id
      AND t.category_id = NEW.category_id
      AND t.status <> 'cancelado'
      AND (
        NOT EXISTS (SELECT 1 FROM registrations r0 WHERE r0.team_id = t.id)
        OR EXISTS (
          SELECT 1 FROM registrations r1
          WHERE r1.team_id = t.id
            AND r1.status_pagamento NOT IN ('estornado', 'expirado')
        )
      )
      AND (
        t.atleta1_id = ANY(v_users)
        OR t.atleta2_id = ANY(v_users)
        OR EXISTS (
          SELECT 1 FROM profiles_private pp
          WHERE pp.user_id IN (t.atleta1_id, t.atleta2_id)
            AND regexp_replace(COALESCE(pp.cpf, ''), '[^0-9]', '', 'g') = ANY(v_cpfs)
        )
      )
  ) THEN
    RAISE EXCEPTION 'PARTICIPANT_ALREADY_REGISTERED'
      USING ERRCODE = '23505', CONSTRAINT = 'championship_participant_one_per_category';
  END IF;

  RETURN NEW;
END;
$$;

-- A terminal registration releases its team's category reservation while
-- keeping every historical row available for finance and audit.
CREATE OR REPLACE FUNCTION cancel_team_after_terminal_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status_pagamento IN ('estornado', 'expirado')
     AND OLD.status_pagamento IS DISTINCT FROM NEW.status_pagamento THEN
    UPDATE teams SET status = 'cancelado' WHERE id = NEW.team_id AND status <> 'cancelado';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teams_participant_category_uniqueness ON teams;
CREATE TRIGGER teams_participant_category_uniqueness
  BEFORE INSERT OR UPDATE OF championship_id, category_id, atleta1_id, atleta2_id, status
  ON teams
  FOR EACH ROW EXECUTE FUNCTION enforce_team_participant_category_uniqueness();

DROP TRIGGER IF EXISTS athlete_tickets_participant_category_uniqueness ON athlete_tickets;
CREATE TRIGGER athlete_tickets_participant_category_uniqueness
  BEFORE INSERT OR UPDATE OF championship_id, category_id, comprador_cpf, parceiro_cpf,
    user_id, parceiro_user_id, status_pagamento
  ON athlete_tickets
  FOR EACH ROW EXECUTE FUNCTION enforce_ticket_participant_category_uniqueness();

DROP TRIGGER IF EXISTS registrations_release_participant_category ON registrations;
CREATE TRIGGER registrations_release_participant_category
  AFTER UPDATE OF status_pagamento ON registrations
  FOR EACH ROW EXECUTE FUNCTION cancel_team_after_terminal_registration();

REVOKE ALL ON FUNCTION rankftv_lock_participant_keys(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION enforce_team_participant_category_uniqueness() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION enforce_ticket_participant_category_uniqueness() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION cancel_team_after_terminal_registration() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-participant-category-uniqueness done';
