"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function salvarDestaques(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL)
    return { ok: false, error: "Sem permissão." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_config")
    .update({ destaques_ids: ids.slice(0, 3) })
    .eq("id", 1);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/destaques");
  return { ok: true };
}
