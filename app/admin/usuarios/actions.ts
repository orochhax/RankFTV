"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/supabase/roles";

export async function updateUserRole(targetUserId: string, newRole: string) {
  // Só CEO pode alterar roles
  const supabase = await createClient();
  const role = await getUserRole(supabase);
  if (role !== "ceo") throw new Error("Não autorizado.");

  // Não permite que o CEO altere o próprio role pela UI (evita acidente)
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === targetUserId) throw new Error("Você não pode alterar seu próprio role.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: newRole })
    .eq("id", targetUserId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/usuarios");
}
