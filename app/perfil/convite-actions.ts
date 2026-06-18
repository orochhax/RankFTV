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
    .select("id, atleta1_id, atleta2_id, championship_id, status")
    .eq("id", teamId)
    .single();

  if (!team || team.atleta2_id !== user.id || team.status !== "convite_pendente") return;

  await supabase
    .from("teams")
    .update({ status: "confirmado" })
    .eq("id", teamId);

  // Verifica se a inscrição é gratuita para gerar credenciais na hora
  const { data: reg } = await supabase
    .from("registrations")
    .select("valor, status_pagamento")
    .eq("team_id", teamId)
    .maybeSingle();

  const isGratis = reg && Number(reg.valor) === 0;

  if (isGratis) {
    // Gera credencial para atleta1 (quem inscreveu), se ainda não tiver
    const { data: cred1 } = await supabase
      .from("credentials")
      .select("id")
      .eq("user_id", team.atleta1_id)
      .eq("championship_id", team.championship_id)
      .maybeSingle();

    if (!cred1) {
      await supabase.from("credentials").insert({
        user_id:         team.atleta1_id,
        championship_id: team.championship_id,
        role:            "atleta",
        qr_token:        crypto.randomUUID(),
        checked_in:      false,
      });
    }

    // Gera credencial para atleta2 (quem aceitou)
    await supabase.from("credentials").insert({
      user_id:         user.id,
      championship_id: team.championship_id,
      role:            "atleta",
      qr_token:        crypto.randomUUID(),
      checked_in:      false,
    });
  }

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
