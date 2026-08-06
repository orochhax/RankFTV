import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function isPerformanceOwner(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email">,
): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLocaleLowerCase("pt-BR");
  if (adminEmail && user.email?.trim().toLocaleLowerCase("pt-BR") === adminEmail) return true;

  // Mantem o acesso do proprietario se ele trocar o e-mail pelo proprio perfil.
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "ceo";
}
