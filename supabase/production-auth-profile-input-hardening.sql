-- Valida no banco os metadados publicos recebidos durante o cadastro no Auth.
-- Idempotente e compativel com os perfis existentes previamente auditados.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_username_format_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_format_check
      CHECK (username ~ '^[a-z0-9_.]{3,30}$') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_name_length_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_name_length_check
      CHECK (btrim(nome) <> '' AND char_length(nome) <= 160) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_gender_value_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_gender_value_check
      CHECK (genero IS NULL OR genero IN ('masculino', 'feminino', 'outro')) NOT VALID;
  END IF;
END;
$$;

ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_username_format_check;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_name_length_check;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_gender_value_check;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_username text := lower(btrim(COALESCE(new.raw_user_meta_data->>'username', '')));
  v_name text := btrim(COALESCE(new.raw_user_meta_data->>'nome', ''));
  v_gender text := NULLIF(btrim(COALESCE(new.raw_user_meta_data->>'genero', '')), '');
BEGIN
  IF v_username !~ '^[a-z0-9_.]{3,30}$' THEN
    RAISE EXCEPTION 'INVALID_SIGNUP_USERNAME' USING ERRCODE = '22023';
  END IF;
  IF v_name = '' OR char_length(v_name) > 160 THEN
    RAISE EXCEPTION 'INVALID_SIGNUP_NAME' USING ERRCODE = '22023';
  END IF;
  IF v_gender IS NOT NULL
    AND v_gender NOT IN ('masculino', 'feminino', 'outro')
  THEN
    RAISE EXCEPTION 'INVALID_SIGNUP_GENDER' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.profiles (id, username, nome, genero)
  VALUES (new.id, v_username, v_name, v_gender);
  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
