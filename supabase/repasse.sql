-- Fluxo de repasse ao organizador via Pix.
-- Plataforma recebe tudo; repassa ao organizador por transferência Pix.
-- Rodar no Supabase SQL Editor.

-- organizer_accounts: troca subconta Asaas por chave Pix simples
ALTER TABLE organizer_accounts
  ADD COLUMN IF NOT EXISTS chave_pix      text,
  ADD COLUMN IF NOT EXISTS tipo_chave_pix text;

-- registrations: rastreia status do repasse ao organizador
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS repasse_status        text NOT NULL DEFAULT 'pendente'
    CHECK (repasse_status IN ('pendente', 'aguardando_d32', 'repassado')),
  ADD COLUMN IF NOT EXISTS repasse_data_prevista timestamptz,
  ADD COLUMN IF NOT EXISTS repasse_transfer_id   text;
