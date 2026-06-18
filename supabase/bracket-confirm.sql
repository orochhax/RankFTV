-- Marca quando o resultado de uma categoria foi confirmado (bracket vira read-only)
ALTER TABLE championship_categories
  ADD COLUMN IF NOT EXISTS bracket_confirmed_at timestamptz;
