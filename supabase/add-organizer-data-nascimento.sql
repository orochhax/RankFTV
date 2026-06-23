-- Data de nascimento do organizador, coletada no momento de publicar o primeiro
-- campeonato pago (junto com CPF/CNPJ e chave Pix). Necessária pro KYC do
-- processador de pagamentos e pra confirmar que o organizador é maior de 18.
-- A coluna cpf_cnpj já existe na tabela (organizer_accounts.sql).
ALTER TABLE organizer_accounts
  ADD COLUMN IF NOT EXISTS data_nascimento date;
