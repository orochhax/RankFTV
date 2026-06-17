-- =============================================================
-- RANKFTV — Atualização da tabela credentials (rode 1x)
--
-- 1. Adiciona coluna "code": código curto de 6 chars (ex: A3F9B2)
--    para digitação manual quando o scanner não funcionar.
-- 2. Adiciona coluna "checked_in_by": quem realizou o check-in
--    (organizador ou staff que escaneou o QR).
-- =============================================================

-- ── 1. Coluna code ────────────────────────────────────────────

ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS code text;

-- Gera código para linhas já existentes (6 chars hex uppercase)
UPDATE credentials
SET code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
WHERE code IS NULL;

-- Garante unicidade
ALTER TABLE credentials
  DROP CONSTRAINT IF EXISTS credentials_code_key;
ALTER TABLE credentials
  ADD CONSTRAINT credentials_code_key UNIQUE (code);

-- Default para novas linhas
ALTER TABLE credentials
  ALTER COLUMN code SET DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

ALTER TABLE credentials
  ALTER COLUMN code SET NOT NULL;

-- ── 2. Coluna checked_in_by ───────────────────────────────────

ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS checked_in_by uuid REFERENCES auth.users(id);

-- ── 3. Organizer pode ler checked_in_by (já coberto pela policy existente) ──
-- A policy credentials_select_organizer já permite SELECT em todas as colunas,
-- então nenhuma alteração de RLS é necessária.

-- ── Verificação ───────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'credentials.code e credentials.checked_in_by adicionados com sucesso.';
  RAISE NOTICE 'Exemplo de código existente: %',
    (SELECT code FROM credentials LIMIT 1);
END;
$$;
