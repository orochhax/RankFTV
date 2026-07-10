-- =============================================================
-- RANKFTV — liga/desliga o motor de categoria (recomendação por
-- questionário de nível) por campeonato.
-- Execute no SQL Editor do Supabase.
-- =============================================================

ALTER TABLE championships
  ADD COLUMN IF NOT EXISTS usa_motor_categoria boolean NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'add-motor-categoria-toggle done';
