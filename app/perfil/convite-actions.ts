"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function aceitarConvite(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const teamId = formData.get("team_id") as string;

  // Garante que só o atleta2 pode aceitar, e só se ainda estiver pendente
  const { data: team } = await supabase
    .from("teams")
    .select("id, atleta2_id, status")
    .eq("id", teamId)
    .single();

  if (!team || team.atleta2_id !== user.id || team.status !== "convite_pendente") return;

  await supabase
    .from("teams")
    .update({ status: "confirmado" })
    .eq("id", teamId);

  revalidatePath("/perfil");
}

export async function recusarConvite(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const teamId = formData.get("team_id") as string;

  const { data: team } = await supabase
    .from("teams")
    .select("id, atleta2_id, status")
    .eq("id", teamId)
    .single();

  if (!team || team.atleta2_id !== user.id || team.status !== "convite_pendente") return;

  await supabase
    .from("teams")
    .update({ status: "recusado" })
    .eq("id", teamId);

  revalidatePath("/perfil");
}
