import "server-only";

/**
 * Arena recurring billing remains opt-in while Arena is a beta product.
 * Production must explicitly enable it only after separate homologation.
 */
export function arenaRecurringPaymentsEnabled(): boolean {
  return process.env.ARENA_RECURRING_PAYMENTS_ENABLED === "1";
}

/**
 * The category-level questionnaire is intentionally disabled for V1.
 *
 * The stored championship setting is accepted only to keep the database and
 * the dormant implementation compatible. Re-enabling this feature requires a
 * redesigned flow that collects both athletes' answers before category choice
 * and gives custom categories an explicit level range.
 */
export function categoryLevelRecommendationEnabled(
  _championshipSetting?: boolean | null,
): boolean {
  void _championshipSetting;
  return false;
}
