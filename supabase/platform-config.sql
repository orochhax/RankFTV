-- Configuração de taxas da plataforma (única linha, id = 1)
CREATE TABLE IF NOT EXISTS platform_config (
  id                         int PRIMARY KEY DEFAULT 1,
  -- Taxas cobradas do organizador (descontadas do repasse)
  plataforma_pix_fixo        numeric(6,2) NOT NULL DEFAULT 3.99,
  plataforma_debito_percent  numeric(5,2) NOT NULL DEFAULT 5.89,
  plataforma_debito_fixo     numeric(6,2) NOT NULL DEFAULT 0.35,
  plataforma_credito_percent numeric(5,2) NOT NULL DEFAULT 7.49,
  plataforma_credito_fixo    numeric(6,2) NOT NULL DEFAULT 0.49,
  -- Sobretaxa extra cobrada do ATLETA (crédito 7-12x)
  atleta_credito_7a12_extra  numeric(5,2) NOT NULL DEFAULT 0.50,
  updated_at                 timestamptz  NOT NULL DEFAULT now()
);

-- Garantia de linha única
CREATE UNIQUE INDEX IF NOT EXISTS platform_config_singleton ON platform_config (id);

-- Insere a linha padrão
INSERT INTO platform_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- RLS: qualquer autenticado pode ler; só service_role escreve
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "platform_config_read" ON platform_config
  FOR SELECT USING (true);
