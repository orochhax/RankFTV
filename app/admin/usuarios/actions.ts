"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/supabase/roles";
import { z } from "zod";

const roleUpdateSchema = z.object({
  targetUserId: z.uuid(),
  newRole: z.enum(["user", "admin", "ceo"]),
}).strict();

export async function updateUserRole(targetUserId: string, newRole: string) {
  const parsed = roleUpdateSchema.safeParse({ targetUserId, newRole });
  if (!parsed.success) throw new Error("Dados de alteração de papel inválidos.");

  // Só CEO pode alterar roles
  const supabase = await createClient();
  const role = await getUserRole(supabase);
  if (role !== "ceo") throw new Error("Não autorizado.");

  // Não permite que o CEO altere o próprio role pela UI (evita acidente)
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === parsed.data.targetUserId) throw new Error("Você não pode alterar seu próprio role.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: parsed.data.newRole })
    .eq("id", parsed.data.targetUserId);

  if (error) throw new Error("Não foi possível alterar o papel do usuário.");
  revalidatePath("/admin/usuarios");
}
