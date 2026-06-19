ALTER TABLE platform_config
  ADD COLUMN IF NOT EXISTS premium_pix_fixo         NUMERIC DEFAULT 2.99,
  ADD COLUMN IF NOT EXISTS premium_debito_percent    NUMERIC DEFAULT 4.89,
  ADD COLUMN IF NOT EXISTS premium_debito_fixo       NUMERIC DEFAULT 0.35,
  ADD COLUMN IF NOT EXISTS premium_credito_percent   NUMERIC DEFAULT 5.49,
  ADD COLUMN IF NOT EXISTS premium_credito_fixo      NUMERIC DEFAULT 0.49;

UPDATE platform_config SET
  premium_pix_fixo       = 2.99,
  premium_debito_percent = 4.89,
  premium_debito_fixo    = 0.35,
  premium_credito_percent = 5.49,
  premium_credito_fixo   = 0.49
WHERE id = 1;
