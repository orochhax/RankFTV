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
 * Verificação única de acesso admin, usada por todas as actions do /admin.
 * Autoriza se o usuário tem role admin/ceo (igual ao middleware) OU se o e-mail
 * bate com ADMIN_EMAIL. Aceitar os dois evita qualquer risco de travar o acesso
 * do admin atual e ainda unifica a regra num só lugar.
 * Retorna true se autorizado.
 */
export async function isAdminUser(supabase: SupabaseClient): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  if (user.email && user.email === process.env.ADMIN_EMAIL) return true;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return isAdminRole((data?.role as UserRole) ?? null);
}
