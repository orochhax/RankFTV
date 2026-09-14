export type ActiveCategoryTier = {
  quantidadeMaxima: number | null;
  vendidos: number;
};

export function availableCategorySpots(
  maxPairs: number | null,
  occupiedPairs: number,
  activeTier: ActiveCategoryTier | undefined,
) {
  const categoryRemaining = maxPairs === null ? null : Math.max(0, maxPairs - occupiedPairs);
  const tierRemaining = activeTier?.quantidadeMaxima == null
    ? null
    : Math.max(0, activeTier.quantidadeMaxima - activeTier.vendidos);
  if (categoryRemaining === null) return tierRemaining;
  if (tierRemaining === null) return categoryRemaining;
  return Math.min(categoryRemaining, tierRemaining);
}
