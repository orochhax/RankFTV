"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function aceitarConviteStaff(staffId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: row } = await supabase
    .from("championship_staff")
    .select("id, user_id, status")
    .eq("id", staffId)
    .single();

  if (!row || row.user_id !== user.id || row.status !== "pendente") return;

  await supabase
    .from("championship_staff")
    .update({ status: "aceito" })
    .eq("id", staffId);

  revalidatePath("/perfil");
  revalidatePath("/notificacoes");
  revalidatePath("/staff");
}

export async function recusarConviteStaff(staffId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: row } = await supabase
    .from("championship_staff")
    .select("id, user_id, status")
    .eq("id", staffId)
    .single();

  if (!row || row.user_id !== user.id || row.status !== "pendente") return;

  await supabase
    .from("championship_staff")
    .update({ status: "recusado" })
    .eq("id", staffId);

  revalidatePath("/perfil");
  revalidatePath("/notificacoes");
}
