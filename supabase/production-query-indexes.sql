-- Bounded production list queries and supporting indexes.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS arenas_nome_search_idx
  ON arenas USING gin (LOWER(nome) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS arenas_estado_created_idx
  ON arenas(estado, created_at DESC, id);
CREATE INDEX IF NOT EXISTS arenas_created_idx
  ON arenas(created_at DESC, id);
CREATE INDEX IF NOT EXISTS arena_students_arena_status_idx
  ON arena_students(arena_id, status);
CREATE INDEX IF NOT EXISTS arena_classes_arena_active_idx
  ON arena_classes(arena_id, ativo);
CREATE INDEX IF NOT EXISTS arena_photos_first_idx
  ON arena_photos(arena_id, ordem, id);

CREATE INDEX IF NOT EXISTS championships_public_status_date_idx
  ON championships(status, data_inicio DESC, id);
CREATE INDEX IF NOT EXISTS championships_organizer_created_idx
  ON championships(organizador_id, created_at DESC, id);
CREATE INDEX IF NOT EXISTS spectator_tickets_champ_created_idx
  ON spectator_tickets(championship_id, created_at DESC, id);
CREATE INDEX IF NOT EXISTS spectator_tickets_champ_payment_idx
  ON spectator_tickets(championship_id, status_pagamento, created_at DESC);
CREATE INDEX IF NOT EXISTS spectator_tickets_champ_checkin_idx
  ON spectator_tickets(championship_id, status_pagamento, checked_in, created_at DESC);
CREATE INDEX IF NOT EXISTS arena_students_owner_list_idx
  ON arena_students(arena_id, created_at DESC, id);
CREATE INDEX IF NOT EXISTS registrations_champ_payment_idx
  ON registrations(championship_id, status_pagamento, created_at DESC, id);
CREATE INDEX IF NOT EXISTS athlete_tickets_champ_payment_idx
  ON athlete_tickets(championship_id, status_pagamento, created_at DESC, id);
CREATE INDEX IF NOT EXISTS credentials_champ_checkin_idx
  ON credentials(championship_id, checked_in, created_at DESC, id);
CREATE INDEX IF NOT EXISTS arena_attendance_arena_date_idx
  ON arena_attendance(arena_id, data DESC, id);
CREATE INDEX IF NOT EXISTS arena_attendance_class_date_idx
  ON arena_attendance(class_id, data DESC, id);
CREATE INDEX IF NOT EXISTS arena_rentals_metrics_idx
  ON arena_rentals(arena_id, status_pagamento, data);
CREATE INDEX IF NOT EXISTS arena_daily_passes_metrics_idx
  ON arena_daily_passes(arena_id, status_pagamento, data);
CREATE INDEX IF NOT EXISTS student_charges_metrics_idx
  ON student_charges(arena_id, status_pagamento);
CREATE INDEX IF NOT EXISTS profiles_role_created_idx
  ON profiles(role, created_at DESC, id);

CREATE OR REPLACE FUNCTION list_public_arena_cards(
  p_query text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_ids uuid[] DEFAULT NULL,
  p_limit integer DEFAULT 12,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  nome text,
  handle text,
  cidade text,
  estado text,
  descricao text,
  avatar_url text,
  banner_url text,
  alunos bigint,
  dias_semana integer[],
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT a.*
    FROM arenas a
    WHERE (NULLIF(BTRIM(p_query), '') IS NULL OR LOWER(a.nome) LIKE '%' || LOWER(BTRIM(p_query)) || '%')
      AND (NULLIF(BTRIM(p_estado), '') IS NULL OR a.estado = UPPER(BTRIM(p_estado)))
      AND (p_ids IS NULL OR a.id = ANY(p_ids))
  ), paged AS (
    SELECT f.*, COUNT(*) OVER() AS total_count
    FROM filtered f
    ORDER BY f.created_at DESC, f.id
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT
    p.id,
    p.nome,
    p.handle,
    p.cidade,
    p.estado,
    p.descricao,
    p.avatar_url,
    COALESCE(
      (SELECT photo.url FROM arena_photos photo WHERE photo.arena_id = p.id ORDER BY photo.ordem, photo.id LIMIT 1),
      p.banner_url
    ) AS banner_url,
    (SELECT COUNT(*) FROM arena_students student WHERE student.arena_id = p.id AND student.status = 'ativo') AS alunos,
    COALESCE((
      SELECT ARRAY_AGG(DISTINCT day ORDER BY day)
      FROM arena_classes class
      CROSS JOIN LATERAL UNNEST(COALESCE(class.dias_semana, '{}'::integer[])) AS day
      WHERE class.arena_id = p.id AND class.ativo = true
    ), '{}'::integer[]) AS dias_semana,
    p.total_count
  FROM paged p
  ORDER BY p.created_at DESC, p.id;
$$;

REVOKE ALL ON FUNCTION list_public_arena_cards(text,text,uuid[],integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_public_arena_cards(text,text,uuid[],integer,integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION organizer_dashboard_metrics(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  WITH owned_champs AS (
    SELECT id, status FROM championships WHERE organizador_id = p_user_id
  ), owned_arenas AS (
    SELECT id FROM arenas WHERE dono_id = p_user_id
  ), champ_counts AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status IN ('inscricoes_abertas', 'em_andamento')) AS open,
      COUNT(*) FILTER (WHERE status = 'inscricoes_abertas') AS registrations_open,
      COUNT(*) FILTER (WHERE status = 'em_andamento') AS in_progress,
      COUNT(*) FILTER (WHERE status = 'encerrado') AS closed
    FROM owned_champs
  ), registration_metrics AS (
    SELECT
      COUNT(*) FILTER (WHERE r.status_pagamento = 'pago') AS paid_count,
      COALESCE(SUM(r.valor) FILTER (WHERE r.status_pagamento = 'pago'), 0) AS paid_value,
      COALESCE(SUM(r.valor) FILTER (WHERE r.status_pagamento = 'pendente'), 0) AS pending_value,
      COALESCE(SUM(r.valor) FILTER (WHERE r.status_pagamento = 'estornado'), 0) AS refunded_value
    FROM registrations r JOIN owned_champs c ON c.id = r.championship_id
  ), athlete_ticket_metrics AS (
    SELECT
      COUNT(*) FILTER (WHERE t.status_pagamento = 'pago') AS paid_count,
      COALESCE(SUM(t.valor) FILTER (WHERE t.status_pagamento = 'pago'), 0) AS paid_value,
      COALESCE(SUM(t.valor) FILTER (WHERE t.status_pagamento = 'pendente'), 0) AS pending_value,
      COALESCE(SUM(t.valor) FILTER (WHERE t.status_pagamento = 'estornado'), 0) AS refunded_value
    FROM athlete_tickets t JOIN owned_champs c ON c.id = t.championship_id
  ), spectator_metrics AS (
    SELECT
      COALESCE(SUM(t.valor) FILTER (WHERE t.status_pagamento = 'pago'), 0) AS paid_value,
      COALESCE(SUM(COALESCE(t.quantidade, 1)) FILTER (WHERE t.status_pagamento = 'pago'), 0) AS paid_quantity
    FROM spectator_tickets t JOIN owned_champs c ON c.id = t.championship_id
  ), student_metrics AS (
    SELECT
      COUNT(*) FILTER (WHERE s.status = 'ativo') AS active_count,
      COALESCE(SUM(s.valor_mensalidade) FILTER (WHERE s.status = 'ativo'), 0) AS active_mrr
    FROM arena_students s JOIN owned_arenas a ON a.id = s.arena_id
  ), rental_metrics AS (
    SELECT
      COUNT(*) FILTER (
        WHERE r.status_pagamento = 'pago'
          AND r.data >= date_trunc('month', CURRENT_DATE)::date
          AND r.data < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
      ) AS month_count,
      COALESCE(SUM(r.valor) FILTER (
        WHERE r.status_pagamento = 'pago'
          AND r.data >= date_trunc('month', CURRENT_DATE)::date
          AND r.data < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
      ), 0) AS month_value,
      COALESCE(SUM(r.valor) FILTER (WHERE r.status_pagamento = 'pago'), 0) AS paid_value
    FROM arena_rentals r JOIN owned_arenas a ON a.id = r.arena_id
  ), daily_metrics AS (
    SELECT
      COUNT(*) FILTER (
        WHERE d.status_pagamento = 'pago'
          AND d.data >= date_trunc('month', CURRENT_DATE)::date
          AND d.data < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
      ) AS month_count,
      COALESCE(SUM(d.valor) FILTER (
        WHERE d.status_pagamento = 'pago'
          AND d.data >= date_trunc('month', CURRENT_DATE)::date
          AND d.data < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
      ), 0) AS month_value,
      COALESCE(SUM(d.valor) FILTER (WHERE d.status_pagamento = 'pago'), 0) AS paid_value
    FROM arena_daily_passes d JOIN owned_arenas a ON a.id = d.arena_id
  ), charge_metrics AS (
    SELECT COALESCE(SUM(ch.valor) FILTER (WHERE ch.status_pagamento = 'pago'), 0) AS paid_value
    FROM student_charges ch JOIN owned_arenas a ON a.id = ch.arena_id
  )
  SELECT jsonb_build_object(
    'championshipTotal', cc.total,
    'championshipOpen', cc.open,
    'championshipRegistrationsOpen', cc.registrations_open,
    'championshipInProgress', cc.in_progress,
    'championshipClosed', cc.closed,
    'arenaCount', (SELECT COUNT(*) FROM owned_arenas),
    'registrationPaidCount', rm.paid_count + atm.paid_count,
    'registrationPaidValue', rm.paid_value + atm.paid_value,
    'registrationPendingValue', rm.pending_value + atm.pending_value,
    'registrationRefundedValue', rm.refunded_value + atm.refunded_value,
    'spectatorPaidValue', sm.paid_value,
    'spectatorPaidQuantity', sm.paid_quantity,
    'activeStudentCount', stm.active_count,
    'activeMrr', stm.active_mrr,
    'rentalMonthCount', rlm.month_count,
    'rentalMonthValue', rlm.month_value,
    'rentalPaidValue', rlm.paid_value,
    'dailyMonthCount', dm.month_count,
    'dailyMonthValue', dm.month_value,
    'dailyPaidValue', dm.paid_value,
    'chargePaidValue', cm.paid_value
  ) INTO v_result
  FROM champ_counts cc, registration_metrics rm, athlete_ticket_metrics atm, spectator_metrics sm,
       student_metrics stm, rental_metrics rlm, daily_metrics dm, charge_metrics cm;
  RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION organizer_dashboard_metrics(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION organizer_dashboard_metrics(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION organizer_profile_contacts(
  p_championship_id uuid,
  p_user_ids uuid[]
)
RETURNS TABLE(id uuid, nome text, username text, telefone text, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.championships
    WHERE championships.id = p_championship_id
      AND championships.organizador_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF COALESCE(cardinality(p_user_ids), 0) > 1000 THEN
    RAISE EXCEPTION 'TOO_MANY_CONTACTS';
  END IF;

  RETURN QUERY
  SELECT p.id, p.nome, p.username, pp.telefone, u.email::text
  FROM public.profiles p
  LEFT JOIN public.profiles_private pp ON pp.user_id = p.id
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id = ANY(COALESCE(p_user_ids, '{}'::uuid[]));
END;
$$;

REVOKE ALL ON FUNCTION organizer_profile_contacts(uuid,uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION organizer_profile_contacts(uuid,uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION organizer_championship_recipients(
  p_championship_id uuid,
  p_user_ids uuid[] DEFAULT NULL
)
RETURNS TABLE(user_id uuid, nome text, email text, genero text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.championships
    WHERE championships.id = p_championship_id
      AND championships.organizador_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF COALESCE(cardinality(p_user_ids), 0) > 2000 THEN
    RAISE EXCEPTION 'TOO_MANY_RECIPIENTS';
  END IF;

  RETURN QUERY
  WITH eligible AS (
    SELECT t.atleta1_id AS id, COALESCE(c.genero, 'mista') AS gender
    FROM public.registrations r
    JOIN public.teams t ON t.id = r.team_id
    LEFT JOIN public.championship_categories c ON c.id = r.category_id
    WHERE r.championship_id = p_championship_id AND r.status_pagamento = 'pago'
    UNION
    SELECT t.atleta2_id, COALESCE(c.genero, 'mista')
    FROM public.registrations r
    JOIN public.teams t ON t.id = r.team_id
    LEFT JOIN public.championship_categories c ON c.id = r.category_id
    WHERE r.championship_id = p_championship_id
      AND r.status_pagamento = 'pago'
      AND t.atleta2_id IS NOT NULL
  )
  SELECT DISTINCT ON (e.id)
    e.id, COALESCE(p.nome, 'Atleta'), u.email::text, e.gender
  FROM eligible e
  JOIN auth.users u ON u.id = e.id
  LEFT JOIN public.profiles p ON p.id = e.id
  WHERE u.email IS NOT NULL
    AND (p_user_ids IS NULL OR e.id = ANY(p_user_ids))
  ORDER BY e.id;
END;
$$;

REVOKE ALL ON FUNCTION organizer_championship_recipients(uuid,uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION organizer_championship_recipients(uuid,uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION organizer_championship_financial_metrics(p_championship_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM championships
    WHERE id = p_championship_id AND organizador_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  WITH sales AS (
    SELECT r.valor, r.status_pagamento, r.billing_type, r.category_id,
           r.created_at, c.nome AS category_name, c.genero AS category_gender
    FROM registrations r
    LEFT JOIN championship_categories c ON c.id = r.category_id
    WHERE r.championship_id = p_championship_id
    UNION ALL
    SELECT t.valor, t.status_pagamento, t.billing_type, t.category_id,
           t.created_at, t.categoria_nome, NULL::text
    FROM athlete_tickets t
    WHERE t.championship_id = p_championship_id
  ), statuses AS (
    SELECT status_pagamento AS status, COUNT(*) AS count, COALESCE(SUM(valor), 0) AS total
    FROM sales GROUP BY status_pagamento
  ), billing AS (
    SELECT billing_type, COALESCE(SUM(valor), 0) AS total
    FROM sales WHERE status_pagamento = 'pago' GROUP BY billing_type
  ), categories AS (
    SELECT category_id, MAX(category_name) AS name, MAX(category_gender) AS gender,
           COUNT(*) AS count, COALESCE(SUM(valor), 0) AS total
    FROM sales
    WHERE status_pagamento = 'pago' AND category_id IS NOT NULL
    GROUP BY category_id
  ), daily AS (
    SELECT created_at::date AS day, COUNT(*) AS count, COALESCE(SUM(valor), 0) AS total
    FROM sales WHERE status_pagamento = 'pago' GROUP BY created_at::date
  )
  SELECT jsonb_build_object(
    'statuses', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'status', status, 'count', count, 'total', total
    ) ORDER BY status) FROM statuses), '[]'::jsonb),
    'billing', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'type', billing_type, 'total', total
    ) ORDER BY billing_type) FROM billing), '[]'::jsonb),
    'categories', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', category_id, 'name', name, 'gender', gender, 'count', count, 'total', total
    ) ORDER BY name) FROM categories), '[]'::jsonb),
    'daily', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'day', day, 'count', count, 'total', total
    ) ORDER BY day) FROM daily), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION organizer_championship_financial_metrics(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION organizer_championship_financial_metrics(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION organizer_spectator_financial_metrics(p_championship_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM championships
    WHERE id = p_championship_id AND organizador_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  WITH statuses AS (
    SELECT status_pagamento AS status, COUNT(*) AS orders,
           COALESCE(SUM(COALESCE(quantidade, 1)), 0) AS quantity,
           COALESCE(SUM(valor), 0) AS total,
           COALESCE(SUM(CASE WHEN checked_in THEN COALESCE(quantidade, 1) ELSE 0 END), 0) AS checked_in
    FROM spectator_tickets
    WHERE championship_id = p_championship_id
    GROUP BY status_pagamento
  ), normalized_lines AS (
    SELECT i.ticket_id, i.tipo_nome_snapshot AS name, i.quantidade,
           t.valor * (
             (i.valor_unitario * i.quantidade)
             / NULLIF(SUM(i.valor_unitario * i.quantidade) OVER (PARTITION BY i.ticket_id), 0)
           ) AS allocated_total
    FROM spectator_ticket_items i
    JOIN spectator_tickets t ON t.id = i.ticket_id
    WHERE t.championship_id = p_championship_id AND t.status_pagamento = 'pago'
  ), legacy_lines AS (
    SELECT t.id, COALESCE(t.tipo_nome, 'Sem tipo'), COALESCE(t.quantidade, 1), t.valor
    FROM spectator_tickets t
    WHERE t.championship_id = p_championship_id
      AND t.status_pagamento = 'pago'
      AND NOT EXISTS (SELECT 1 FROM spectator_ticket_items i WHERE i.ticket_id = t.id)
  ), lines AS (
    SELECT * FROM normalized_lines UNION ALL SELECT * FROM legacy_lines
  ), ticket_types AS (
    SELECT name, COALESCE(SUM(quantidade), 0) AS quantity,
           COALESCE(SUM(allocated_total), 0) AS total
    FROM lines GROUP BY name
  )
  SELECT jsonb_build_object(
    'statuses', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'status', status, 'orders', orders, 'quantity', quantity, 'total', total,
      'checkedIn', checked_in
    ) ORDER BY status) FROM statuses), '[]'::jsonb),
    'ticketTypes', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'name', name, 'quantity', quantity, 'total', ROUND(total, 2)
    ) ORDER BY total DESC) FROM ticket_types), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION organizer_spectator_financial_metrics(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION organizer_spectator_financial_metrics(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION organizer_credential_directory(
  p_championship_id uuid,
  p_filter text DEFAULT 'todos',
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM championships
    WHERE id = p_championship_id AND organizador_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_filter NOT IN ('todos', 'presentes', 'pendentes') THEN
    RAISE EXCEPTION 'INVALID_FILTER';
  END IF;

  WITH filtered AS (
    SELECT c.id, c.user_id, c.role, c.qr_token, c.code, c.checked_in,
           c.checkin_at, c.checked_in_by, c.created_at,
           COALESCE(p.nome, 'Atleta') AS nome,
           COALESCE(p.username, '') AS username,
           scanner.nome AS scanner_nome
    FROM credentials c
    LEFT JOIN profiles p ON p.id = c.user_id
    LEFT JOIN profiles scanner ON scanner.id = c.checked_in_by
    WHERE c.championship_id = p_championship_id
      AND (p_filter = 'todos'
        OR (p_filter = 'presentes' AND c.checked_in)
        OR (p_filter = 'pendentes' AND NOT c.checked_in))
  ), paged AS (
    SELECT * FROM filtered
    ORDER BY nome, created_at DESC, id
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT jsonb_build_object(
    'items', COALESCE((SELECT jsonb_agg(to_jsonb(paged) ORDER BY nome, created_at DESC, id) FROM paged), '[]'::jsonb),
    'filteredTotal', (SELECT COUNT(*) FROM filtered),
    'total', (SELECT COUNT(*) FROM credentials WHERE championship_id = p_championship_id),
    'confirmed', (SELECT COUNT(*) FROM credentials WHERE championship_id = p_championship_id AND checked_in)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION organizer_credential_directory(uuid,text,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION organizer_credential_directory(uuid,text,integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION admin_user_directory(
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ceo'
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  WITH paged AS (
    SELECT p.id, p.nome, p.username, p.role, p.created_at, u.email::text
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC, p.id
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT jsonb_build_object(
    'items', COALESCE((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC, id) FROM paged), '[]'::jsonb),
    'total', (SELECT COUNT(*) FROM public.profiles),
    'admins', (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin'),
    'ceos', (SELECT COUNT(*) FROM public.profiles WHERE role = 'ceo')
  ) INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION admin_user_directory(integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_user_directory(integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION admin_championship_directory(
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'ceo')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  WITH paged AS (
    SELECT c.id, c.nome, c.status, c.is_vitrine, c.organizador_id,
           c.cidade, c.estado, c.data_inicio, c.data_fim, c.created_at,
           p.nome AS organizer_name, p.username AS organizer_username,
           oa.telefone AS organizer_phone, u.email::text AS organizer_email
    FROM public.championships c
    LEFT JOIN public.profiles p ON p.id = c.organizador_id
    LEFT JOIN public.organizer_accounts oa ON oa.user_id = c.organizador_id
    LEFT JOIN auth.users u ON u.id = c.organizador_id
    ORDER BY c.created_at DESC, c.id
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT jsonb_build_object(
    'items', COALESCE((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC, id) FROM paged), '[]'::jsonb),
    'total', (SELECT COUNT(*) FROM public.championships)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION admin_championship_directory(integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_championship_directory(integer,integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-query-indexes done';
