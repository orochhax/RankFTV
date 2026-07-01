"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/supabase/roles";

async function checkAdmin() {
  const supabase = await createClient();
  return isAdminUser(supabase);
}

export async function salvarDestaques(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (!await checkAdmin()) return { ok: false, error: "Sem permissão." };

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

export async function salvarDestaquesArenas(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (!await checkAdmin()) return { ok: false, error: "Sem permissão." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_config")
    .update({ arenas_destaques_ids: ids.slice(0, 3) })
    .eq("id", 1);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/arenas");
  revalidatePath("/admin/destaques");
  return { ok: true };
}
