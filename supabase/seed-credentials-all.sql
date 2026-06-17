-- PASSO 1 — rode só esse SELECT para ver qual campeonato já tem credencial:
--
-- SELECT c.nome, cr.qr_token
-- FROM credentials cr
-- JOIN championships c ON c.id = cr.championship_id;
--
-- PASSO 2 — rode o bloco abaixo para criar tokens únicos nos demais campeonatos.
-- (Cada token = "QRTEST-" + primeiros 8 chars do ID do campeonato)
-- Verifique os NOTICES para saber o token de cada um.

DO $$
DECLARE
  v_user_id uuid;
  v_champ   RECORD;
  v_token   text;
BEGIN
  SELECT id INTO v_user_id FROM auth.users
  WHERE email = 'carlosrocha0923@gmail.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  -- Só insere nos campeonatos que AINDA NÃO têm credencial deste usuário
  FOR v_champ IN
    SELECT c.id, c.nome
    FROM championships c
    WHERE c.organizador_id = v_user_id
      AND NOT EXISTS (
        SELECT 1 FROM credentials cr
        WHERE cr.user_id = v_user_id AND cr.championship_id = c.id
      )
  LOOP
    v_token := 'QRTEST-' || left(v_champ.id::text, 8);
    INSERT INTO credentials (user_id, championship_id, role, qr_token)
    VALUES (v_user_id, v_champ.id, 'atleta', v_token);
    RAISE NOTICE 'Token para "%": %', v_champ.nome, v_token;
  END LOOP;

  -- Também lista os que já existem
  FOR v_champ IN
    SELECT c.nome, cr.qr_token
    FROM credentials cr
    JOIN championships c ON c.id = cr.championship_id
    WHERE cr.user_id = v_user_id
  LOOP
    RAISE NOTICE '[já existia] "%": %', v_champ.nome, v_champ.qr_token;
  END LOOP;
END;
$$;
