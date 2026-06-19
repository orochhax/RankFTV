import { createAdminClient } from "./supabase/admin";

export type PlatformConfig = {
  plataformaPixFixo:        number;
  plataformaDebitoPercent:  number;
  plataformaDebitoFixo:     number;
  plataformaCreditoPercent: number;
  plataformaCreditoFixo:    number;
  atletaCredito7a12Extra:   number;
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
  };
}

/** Repasse líquido do organizador após desconto da taxa da plataforma */
export function calcularRepasse(
  valorBase: number,
  metodo: "pix" | "debito" | "credito",
  config: PlatformConfig,
): number {
  if (metodo === "pix") {
    return parseFloat((valorBase - config.plataformaPixFixo).toFixed(2));
  }
  if (metodo === "debito") {
    return parseFloat(
      (valorBase * (1 - config.plataformaDebitoPercent / 100) - config.plataformaDebitoFixo).toFixed(2)
    );
  }
  return parseFloat(
    (valorBase * (1 - config.plataformaCreditoPercent / 100) - config.plataformaCreditoFixo).toFixed(2)
  );
}
