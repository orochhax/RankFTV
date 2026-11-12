import type { createClient } from "@/lib/supabase/server";
import { canAccessDemoChampionship } from "@/lib/supabase/championships";

/**
 * A arena demonstrativa "Rank Football" compartilha a mesma trava de
 * visibilidade exclusiva do CEO usada no campeonato demonstrativo.
 */
export async function canAccessDemoArena(
  existingClient?: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  return canAccessDemoChampionship(existingClient);
}
