import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArenaPlatformTierId } from "@/lib/arena-platform-plans";

export type ArenaSubscriptionSummary = {
  plano?: string | null;
  status?: string | null;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["ativo", "trial"]);

/**
 * Converte um registro de `arena_subscriptions` no tier operacional ("start" | "pro").
 * Apenas planos explicitamente em "pro" e com status ativo ou trial liberam recursos Pro.
 */
export function resolveArenaTierFromSubscription(
  subscription: ArenaSubscriptionSummary | null | undefined,
): ArenaPlatformTierId {
  if (!subscription) return "start";
  const plano = (subscription.plano ?? "").trim().toLowerCase();
  const status = (subscription.status ?? "").trim().toLowerCase();
  if (plano === "pro" && ACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
    return "pro";
  }
  return "start";
}

export async function getArenaTierId(
  supabase: SupabaseClient,
  arenaId: string,
): Promise<ArenaPlatformTierId> {
  const { data } = await supabase
    .from("arena_subscriptions")
    .select("plano, status")
    .eq("arena_id", arenaId)
    .maybeSingle();

  return resolveArenaTierFromSubscription(data);
}
