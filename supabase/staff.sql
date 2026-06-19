-- Tabela de staff dos campeonatos
CREATE TABLE IF NOT EXISTS championship_staff (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  championship_id uuid NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado')),
  can_qrcode      boolean NOT NULL DEFAULT true,
  can_inscricoes  boolean NOT NULL DEFAULT false,
  can_chaveamento boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(championship_id, user_id)
);

-- Controle de acesso feito no nível da aplicação (server actions verificam organizador/staff)
ALTER TABLE championship_staff DISABLE ROW LEVEL SECURITY;
