// Taxa de serviço paga PELO COMPRADOR (em cima do valor), igual Sympla/Eventbrite.
// Módulo puro (sem imports de servidor) — pode ser usado no client e no server.
//
// Modelo (jun/2026):
//  - A taxa é somada ao valor; o comprador vê "valor + taxa" (não vê a %).
//  - O ORGANIZADOR recebe o valor cheio; a plataforma fica com a taxa.
//  - Vale igual pra atleta e plateia.
//  - Cartão é flat (crédito/débito, à vista ou parcelado em até 12x = mesma taxa).
//  - Taxa nunca é menor que o piso (R$ 3,99).

export type MetodoTaxa = "pix" | "debito" | "credito";

export const TAXA_MINIMA = 3.99;

// Percentuais por plano. Pix tem taxa menor que cartão; Elite é menor que Padrão.
const PERCENT = {
  padrao: { pix: 0.08, cartao: 0.10 },
  elite:  { pix: 0.07, cartao: 0.09 },
} as const;

/** Taxa cobrada do comprador = max(valor × %, piso). Ingresso grátis não tem taxa. */
export function calcularTaxaComprador(
  valor: number,
  metodo: MetodoTaxa,
  isElite = false,
): number {
  const v = Number(valor);
  if (!v || v <= 0) return 0;
  const grupo = isElite ? PERCENT.elite : PERCENT.padrao;
  const pct = metodo === "pix" ? grupo.pix : grupo.cartao;
  const taxa = Math.max(v * pct, TAXA_MINIMA);
  return Math.round(taxa * 100) / 100;
}

/** Total que o comprador paga = valor + taxa. */
export function calcularTotalComprador(
  valor: number,
  metodo: MetodoTaxa,
  isElite = false,
): number {
  const total = Number(valor) + calcularTaxaComprador(valor, metodo, isElite);
  return Math.round(total * 100) / 100;
}

export type TipoDescontoCupom = "percentual" | "valor_fixo";

/**
 * Desconto de um cupom sobre o valor base — aplicado ANTES da taxa da
 * plataforma (a taxa é sempre calculada em cima do valor já com desconto).
 * Nunca deixa o valor final ficar negativo (cap em 100% do valor base).
 */
export function calcularDesconto(
  valorBase: number,
  tipo: TipoDescontoCupom,
  valorDesconto: number,
): number {
  const v = Number(valorBase);
  if (!v || v <= 0) return 0;
  const desconto = tipo === "percentual" ? v * (Number(valorDesconto) / 100) : Number(valorDesconto);
  return Math.round(Math.min(Math.max(desconto, 0), v) * 100) / 100;
}

/** Percentuais (pra exibir nas telas de taxa). */
export const TAXAS_EXIBICAO = {
  padrao: { pix: 8, cartao: 10 },
  elite:  { pix: 7, cartao: 9 },
  minimo: TAXA_MINIMA,
} as const;
