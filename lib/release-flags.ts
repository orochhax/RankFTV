import "server-only";

/**
 * Arena recurring billing remains opt-in while Arena is a beta product.
 * Production must explicitly enable it only after separate homologation.
 */
export function arenaRecurringPaymentsEnabled(): boolean {
  return process.env.ARENA_RECURRING_PAYMENTS_ENABLED === "1";
}
