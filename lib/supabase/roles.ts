import type { SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "user" | "admin" | "ceo";

/** Retorna o role do usuário logado, ou null se não autenticado. */
export async function getUserRole(
  supabase: SupabaseClient
): Promise<UserRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return (data?.role as UserRole) ?? null;
}

/** True se o role tem acesso ao painel admin (admin ou CEO). */
export function isAdminRole(role: UserRole | null): boolean {
  return role === "admin" || role === "ceo";
}

/** True se é CEO (acesso total). */
export function isCeo(role: UserRole | null): boolean {
  return role === "ceo";
}
