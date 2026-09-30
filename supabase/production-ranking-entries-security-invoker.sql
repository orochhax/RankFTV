-- Corrige a view publica de ranking para respeitar os grants e as policies RLS
-- do usuario que executa a consulta, em vez dos privilegios do dono da view.
-- Idempotente. Homologue primeiro no Sandbox.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.ranking_entries') IS NULL THEN
    RAISE EXCEPTION 'public.ranking_entries nao existe';
  END IF;

  ALTER VIEW public.ranking_entries SET (security_invoker = true);
END;
$$;

COMMIT;
NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-ranking-entries-security-invoker done';
