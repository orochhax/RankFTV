-- Chave Pix do organizador (para repasse automático após pagamento)
ALTER TABLE organizer_accounts
  ADD COLUMN IF NOT EXISTS chave_pix text;

-- Colunas de repasse na tabela de inscrições (usadas pelo webhook Asaas)
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS repasse_status       text DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS repasse_transfer_id  text,
  ADD COLUMN IF NOT EXISTS repasse_data_prevista timestamptz;
