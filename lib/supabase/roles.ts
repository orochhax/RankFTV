import "server-only"; // build quebra se isso for importado por um Client Component (lê ADMIN_EMAIL)
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

/**
 * Verificação única do acesso comercial ao /admin.
 * A fonte de verdade é profiles.role, igual ao Proxy. ADMIN_EMAIL identifica
 * somente o dono dos módulos pessoais e nunca concede acesso comercial.
 */
export async function isAdminUser(supabase: SupabaseClient): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return isAdminRole((data?.role as UserRole) ?? null);
}
