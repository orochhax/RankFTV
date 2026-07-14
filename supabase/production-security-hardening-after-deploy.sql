-- =============================================================
-- RankFTV - hardening, ETAPA 2
-- Execute somente DEPOIS que o deploy do codigo novo estiver Ready.
-- A ETAPA 1 (production-security-hardening.sql) deve ter sido concluida.
-- =============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles_private'
      AND column_name = 'data_nascimento'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles_private'
      AND column_name = 'questionario'
  ) THEN
    RAISE EXCEPTION 'Execute production-security-hardening.sql antes desta etapa';
  END IF;
END $$;

-- Remove definitivamente os campos pessoais do perfil publico.
ALTER TABLE profiles DROP COLUMN IF EXISTS data_nascimento;
ALTER TABLE profiles DROP COLUMN IF EXISTS questionario;

-- Visitantes nao precisam descobrir papeis administrativos nem tamanho de
-- uniforme. Usuarios autenticados continuam com as colunas exigidas pelo app.
REVOKE SELECT ON TABLE profiles FROM anon, authenticated;
GRANT SELECT (
  id, nome, username, bio, foto_url, rating, genero, cidade, estado, created_at
) ON TABLE profiles TO anon;
GRANT SELECT (
  id, nome, username, bio, foto_url, rating, genero, cidade, estado,
  role, tamanho_camisa, created_at
) ON TABLE profiles TO authenticated;
GRANT ALL ON TABLE profiles TO service_role;

-- O codigo de convite continua na tabela, mas deixa de ser uma coluna publica.
REVOKE SELECT ON TABLE arenas FROM anon, authenticated;
GRANT SELECT (
  id, dono_id, nome, handle, descricao, cidade, estado, avatar_url,
  banner_url, cancel_horas_antes, created_at
) ON TABLE arenas TO anon, authenticated;
GRANT ALL ON TABLE arenas TO service_role;

NOTIFY pgrst, 'reload schema';
