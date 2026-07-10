-- =============================================================
-- RANKFTV — cidade/estado no perfil do atleta
-- Essas colunas já eram usadas pelo código (perfil público do atleta,
-- página /perfil) mas nunca tinham uma migração — rode no SQL Editor
-- do Supabase (produção) pra corrigir o erro "column profiles.cidade
-- does not exist".
-- =============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text;

NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'add-profile-cidade-estado done';
