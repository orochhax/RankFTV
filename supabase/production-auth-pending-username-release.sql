-- RankFTV — usernames de cadastros que ainda não confirmaram o e-mail.
--
-- Execute primeiro no Sandbox. Em produção, aplicar apenas junto da janela
-- controlada de migrations autenticadas. O perfil continua sendo criado pelo
-- trigger de auth.users, mas contas sem e-mail confirmado recebem um username
-- temporário. Assim, o @ escolhido só é ocupado quando a confirmação acontece.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_requested_username text := lower(btrim(COALESCE(new.raw_user_meta_data->>'username', '')));
  v_username text;
  v_name text := btrim(COALESCE(new.raw_user_meta_data->>'nome', ''));
  v_gender text := NULLIF(btrim(COALESCE(new.raw_user_meta_data->>'genero', '')), '');
BEGIN
  IF v_requested_username !~ '^[a-z0-9_.]{3,30}$' THEN
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

  -- O e-mail ainda não confirmado não pode reservar o @ escolhido. O valor
  -- temporário é único, atende ao formato de profiles.username e nunca é
  -- exibido no fluxo normal, pois o callback o substitui na confirmação.
  v_username := CASE
    WHEN new.email_confirmed_at IS NULL
      THEN 'pending_' || left(replace(new.id::text, '-', ''), 22)
    ELSE v_requested_username
  END;

  INSERT INTO public.profiles (id, username, nome, genero)
  VALUES (new.id, v_username, v_name, v_gender);
  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Libera também os @ presos por cadastros antigos ainda sem confirmação.
-- A conta continua existente para que o link já enviado ainda possa confirmá-la.
UPDATE public.profiles AS p
SET username = 'pending_' || left(replace(p.id::text, '-', ''), 22)
FROM auth.users AS u
WHERE u.id = p.id
  AND u.email_confirmed_at IS NULL
  AND p.username !~ '^pending_[a-f0-9]{22}$';

COMMIT;
NOTIFY pgrst, 'reload schema';
