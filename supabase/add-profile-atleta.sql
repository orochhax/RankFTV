-- Campos de perfil do atleta coletados no onboarding pós-assinatura.
-- RODAR NO SQL EDITOR DO SUPABASE.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS genero          text CHECK (genero IN ('masculino', 'feminino', 'outro'));

NOTIFY migrations, 'add-profile-atleta done';
