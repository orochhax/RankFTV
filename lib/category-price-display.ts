import { calcularTaxaComprador, calcularTotalComprador } from "./taxas";

export type CategoryPriceComposition = {
  basePrice: number;
  serviceFee: number;
  pixTotal: number;
};

/**
 * Valores apresentados no card da categoria. A fonte continua sendo a mesma
 * regra financeira usada pelo checkout; esta função apenas organiza a
 * composição para a interface.
 */
export function resolveCategoryPriceComposition(
  value: number,
  isElite = false,
): CategoryPriceComposition {
  const basePrice = Number(value);

  return {
    basePrice,
    serviceFee: calcularTaxaComprador(basePrice, "pix", isElite),
    pixTotal: calcularTotalComprador(basePrice, "pix", isElite),
  };
}
