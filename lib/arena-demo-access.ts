import type { createClient } from "@/lib/supabase/server";

/**
 * A arena "Rank Football" agora é pública para qualquer visitante navegar,
 * consultar horários, alugar quadras e assinar planos de teste real.
 */
export async function canAccessDemoArena(
  _existingClient?: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  return true;
}
