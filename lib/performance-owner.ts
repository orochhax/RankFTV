import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function isPerformanceOwner(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email">,
): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLocaleLowerCase("pt-BR");
  const userEmail = user.email?.trim().toLocaleLowerCase("pt-BR");
  if (!adminEmail || userEmail !== adminEmail) return false;

  // ADMIN_EMAIL identifica a conta operacional, mas nunca substitui a
  // autorizacao persistida que tambem e verificada pelas RPCs do modulo.
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "ceo";
}
