import { createAdminClient } from "./supabase/admin";

export type PlatformConfig = {
  // Plano gratuito
  plataformaPixFixo:        number;
  plataformaDebitoPercent:  number;
  plataformaDebitoFixo:     number;
  plataformaCreditoPercent: number;
  plataformaCreditoFixo:    number;
  atletaCredito7a12Extra:   number;
  // Plano premium
  premiumPixFixo:           number;
  premiumDebitoPercent:     number;
  premiumDebitoFixo:        number;
  premiumCreditoPercent:    number;
  premiumCreditoFixo:       number;
};

// Taxas do gateway Asaas — referência, não editáveis
export const GATEWAY_FEES = {
  pix:           { fixo: 1.99 },
  debito:        { percent: 1.89, fixo: 0.35 },
  creditoAvista: { percent: 2.99, fixo: 0.49 },
  credito2a6:    { percent: 3.49, fixo: 0.49 },
  credito7a12:   { percent: 3.99, fixo: 0.49 },
} as const;

export const DEFAULT_CONFIG: PlatformConfig = {
  plataformaPixFixo:        3.99,
  plataformaDebitoPercent:  5.89,
  plataformaDebitoFixo:     0.35,
  plataformaCreditoPercent: 7.49,
  plataformaCreditoFixo:    0.49,
  atletaCredito7a12Extra:   0.50,
  premiumPixFixo:           2.99,
  premiumDebitoPercent:     4.89,
  premiumDebitoFixo:        0.35,
  premiumCreditoPercent:    5.49,
  premiumCreditoFixo:       0.49,
};

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("platform_config")
    .select("*")
    .eq("id", 1)
    .single();

  if (!data) return DEFAULT_CONFIG;

  return {
    plataformaPixFixo:        Number(data.plataforma_pix_fixo),
    plataformaDebitoPercent:  Number(data.plataforma_debito_percent),
    plataformaDebitoFixo:     Number(data.plataforma_debito_fixo),
    plataformaCreditoPercent: Number(data.plataforma_credito_percent),
    plataformaCreditoFixo:    Number(data.plataforma_credito_fixo),
    atletaCredito7a12Extra:   Number(data.atleta_credito_7a12_extra),
    premiumPixFixo:           Number(data.premium_pix_fixo   ?? DEFAULT_CONFIG.premiumPixFixo),
    premiumDebitoPercent:     Number(data.premium_debito_percent ?? DEFAULT_CONFIG.premiumDebitoPercent),
    premiumDebitoFixo:        Number(data.premium_debito_fixo    ?? DEFAULT_CONFIG.premiumDebitoFixo),
    premiumCreditoPercent:    Number(data.premium_credito_percent ?? DEFAULT_CONFIG.premiumCreditoPercent),
    premiumCreditoFixo:       Number(data.premium_credito_fixo    ?? DEFAULT_CONFIG.premiumCreditoFixo),
  };
}

/**
 * Repasse líquido do organizador após desconto da taxa da plataforma.
 * Quando `isElite` é true, usa as taxas reduzidas do plano Elite (premium_*).
 */
export function calcularRepasse(
  valorBase: number,
  metodo: "pix" | "debito" | "credito",
  config: PlatformConfig,
  isElite = false,
): number {
  const pixFixo        = isElite ? config.premiumPixFixo        : config.plataformaPixFixo;
  const debitoPercent  = isElite ? config.premiumDebitoPercent  : config.plataformaDebitoPercent;
  const debitoFixo     = isElite ? config.premiumDebitoFixo     : config.plataformaDebitoFixo;
  const creditoPercent = isElite ? config.premiumCreditoPercent : config.plataformaCreditoPercent;
  const creditoFixo    = isElite ? config.premiumCreditoFixo    : config.plataformaCreditoFixo;

  if (metodo === "pix") {
    return parseFloat((valorBase - pixFixo).toFixed(2));
  }
  if (metodo === "debito") {
    return parseFloat((valorBase * (1 - debitoPercent / 100) - debitoFixo).toFixed(2));
  }
  return parseFloat((valorBase * (1 - creditoPercent / 100) - creditoFixo).toFixed(2));
}
