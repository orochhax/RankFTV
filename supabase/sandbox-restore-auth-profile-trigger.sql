-- RankFTV - passo operacional para ambientes restaurados por dump logico.
--
-- O schema publico contem public.handle_new_user(), mas o dump logico do
-- Supabase nao recria necessariamente triggers instalados sobre auth.users.
-- Execute este arquivo somente no ambiente restaurado (sandbox/recuperacao),
-- depois de restaurar o schema e antes de criar contas de teste.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.handle_new_user()') IS NULL THEN
    RAISE EXCEPTION 'public.handle_new_user() nao existe no ambiente restaurado';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Recupera somente usuarios com os metadados minimos usados pelo cadastro.
-- Perfis existentes e usernames ja ocupados nunca sao sobrescritos.
INSERT INTO public.profiles (id, username, nome, genero)
SELECT
  u.id,
  u.raw_user_meta_data->>'username',
  u.raw_user_meta_data->>'nome',
  CASE
    WHEN u.raw_user_meta_data->>'genero' IN ('masculino', 'feminino', 'outro')
      THEN u.raw_user_meta_data->>'genero'
    ELSE NULL
  END
FROM auth.users u
WHERE NULLIF(BTRIM(u.raw_user_meta_data->>'username'), '') IS NOT NULL
  AND NULLIF(BTRIM(u.raw_user_meta_data->>'nome'), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = u.id
       OR p.username = u.raw_user_meta_data->>'username'
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'sandbox-restore-auth-profile-trigger done';
