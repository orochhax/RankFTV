-- Fila privada da Central de Evolução para análises executadas pelo PC do Carlos.
-- Depende de supabase/evolution-center.sql.

CREATE TABLE IF NOT EXISTS public.evo_ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_kind text NOT NULL DEFAULT 'full_refresh'
    CHECK (request_kind IN ('full_refresh')),
  status text NOT NULL DEFAULT 'queued_analysis'
    CHECK (status IN (
      'queued_analysis', 'analyzing', 'awaiting_approval',
      'queued_apply', 'applying', 'completed', 'failed', 'cancelled'
    )),
  stage text NOT NULL DEFAULT 'queued' CHECK (char_length(stage) BETWEEN 1 AND 80),
  progress_message text NOT NULL DEFAULT 'Aguardando o computador do Carlos.'
    CHECK (char_length(progress_message) BETWEEN 1 AND 500),
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(request_payload) = 'object'),
  result jsonb CHECK (result IS NULL OR jsonb_typeof(result) = 'object'),
  error_code text CHECK (error_code IS NULL OR char_length(error_code) BETWEEN 1 AND 100),
  error_message text CHECK (error_message IS NULL OR char_length(error_message) BETWEEN 1 AND 1000),
  worker_id text CHECK (worker_id IS NULL OR char_length(worker_id) BETWEEN 1 AND 128),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 20),
  requested_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  heartbeat_at timestamptz,
  preview_ready_at timestamptz,
  approved_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evo_ai_jobs_user_requested_idx
  ON public.evo_ai_jobs(user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS evo_ai_jobs_queue_idx
  ON public.evo_ai_jobs(status, requested_at)
  WHERE status IN ('queued_analysis', 'queued_apply');
CREATE UNIQUE INDEX IF NOT EXISTS evo_ai_jobs_one_active_per_user_idx
  ON public.evo_ai_jobs(user_id)
  WHERE status IN (
    'queued_analysis', 'analyzing', 'awaiting_approval',
    'queued_apply', 'applying'
  );

CREATE TABLE IF NOT EXISTS public.evo_ai_workers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_id text NOT NULL CHECK (char_length(worker_id) BETWEEN 1 AND 128),
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'busy', 'error')),
  version text NOT NULL CHECK (char_length(version) BETWEEN 1 AND 40),
  last_error_code text CHECK (last_error_code IS NULL OR char_length(last_error_code) BETWEEN 1 AND 100),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evo_ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evo_ai_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.evo_ai_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evo_ai_workers FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.evo_ai_jobs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.evo_ai_workers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.evo_ai_jobs TO authenticated;
GRANT SELECT ON TABLE public.evo_ai_workers TO authenticated;

DROP POLICY IF EXISTS evo_ai_jobs_owner_select ON public.evo_ai_jobs;
CREATE POLICY evo_ai_jobs_owner_select ON public.evo_ai_jobs
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS evo_ai_workers_owner_select ON public.evo_ai_workers;
CREATE POLICY evo_ai_workers_owner_select ON public.evo_ai_workers
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.evo_claim_ai_job(
  p_user_id uuid,
  p_worker_id text,
  p_requested_status text
)
RETURNS SETOF public.evo_ai_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_requested_status NOT IN ('queued_analysis', 'queued_apply') THEN
    RAISE EXCEPTION 'EVO_AI_INVALID_QUEUE_STATUS';
  END IF;

  RETURN QUERY
  WITH candidate AS (
    SELECT id
    FROM public.evo_ai_jobs
    WHERE user_id = p_user_id
      AND status = p_requested_status
    ORDER BY requested_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.evo_ai_jobs AS job
  SET status = CASE
        WHEN p_requested_status = 'queued_analysis' THEN 'analyzing'
        ELSE 'applying'
      END,
      stage = CASE
        WHEN p_requested_status = 'queued_analysis' THEN 'preparing'
        ELSE 'applying'
      END,
      progress_message = CASE
        WHEN p_requested_status = 'queued_analysis' THEN 'Preparando a análise no computador do Carlos.'
        ELSE 'Aplicando a atualização aprovada.'
      END,
      worker_id = left(p_worker_id, 128),
      claimed_at = now(),
      heartbeat_at = now(),
      attempt_count = attempt_count + 1,
      error_code = NULL,
      error_message = NULL,
      updated_at = now()
  FROM candidate
  WHERE job.id = candidate.id
  RETURNING job.*;
END;
$$;

REVOKE ALL ON FUNCTION public.evo_claim_ai_job(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evo_claim_ai_job(uuid, text, text)
  TO service_role;

DROP TRIGGER IF EXISTS evo_ai_jobs_touch_updated_at ON public.evo_ai_jobs;
CREATE TRIGGER evo_ai_jobs_touch_updated_at
BEFORE UPDATE ON public.evo_ai_jobs
FOR EACH ROW EXECUTE FUNCTION public.evo_touch_updated_at();

DROP TRIGGER IF EXISTS evo_ai_workers_touch_updated_at ON public.evo_ai_workers;
CREATE TRIGGER evo_ai_workers_touch_updated_at
BEFORE UPDATE ON public.evo_ai_workers
FOR EACH ROW EXECUTE FUNCTION public.evo_touch_updated_at();

COMMENT ON TABLE public.evo_ai_jobs IS
  'Fila privada: o site solicita, o agente local prepara e Carlos aprova antes da aplicação.';
COMMENT ON TABLE public.evo_ai_workers IS
  'Heartbeat sanitizado do agente local da Central de Evolução.';

NOTIFY migrations, '20261021000100_evolution_ai_jobs done';
NOTIFY pgrst, 'reload schema';
