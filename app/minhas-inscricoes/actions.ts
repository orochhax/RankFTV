"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function cancelarInscricao(
  teamId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: team } = await supabase
    .from("teams")
    .select("atleta1_id, atleta2_id, status")
    .eq("id", teamId)
    .single();

  if (!team) return { ok: false, error: "Dupla não encontrada." };
  if (team.atleta1_id !== user.id && team.atleta2_id !== user.id)
    return { ok: false, error: "Sem permissão." };
  if (team.status === "cancelado")
    return { ok: false, error: "Inscrição já cancelada." };

  await supabase.from("teams").update({ status: "cancelado" }).eq("id", teamId);

  // Cancela somente inscrições ainda pendentes (não reverte pagamentos já confirmados)
  await supabase
    .from("registrations")
    .update({ status_pagamento: "estornado" })
    .eq("team_id", teamId)
    .eq("status_pagamento", "pendente");

  revalidatePath("/minhas-inscricoes");
  return { ok: true };
}
