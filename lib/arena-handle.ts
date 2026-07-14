import type { SupabaseClient } from "@supabase/supabase-js";

// Resolve o handle da arena do dono pras rotas legadas de /arena/* (sem
// [handle] na URL), que redirecionam pra dentro do painel unificado em
// /arena/[handle]/*. Se `handleParam` vier (era o padrão ?handle= usado por
// financeiro/planos/configuracoes), valida que pertence ao usuário; senão
// cai na arena mais antiga do dono (mesmo comportamento de antes).
export async function resolveOwnerArenaHandle(
  supabase: SupabaseClient,
  userId: string,
  handleParam?: string,
): Promise<string | null> {
  let query = supabase.from("arenas").select("handle").eq("dono_id", userId);
  query = handleParam ? query.eq("handle", handleParam) : query.order("created_at", { ascending: true });
  const { data } = await query.limit(1).maybeSingle();
  return data?.handle ?? null;
}
