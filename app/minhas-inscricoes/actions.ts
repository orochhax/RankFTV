"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function confirmarTamanhoCamisa(
  champId: string,
  tamanho: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const VALIDOS = ["PP", "P", "M", "G", "GG", "XGG"];
  if (!VALIDOS.includes(tamanho)) return { ok: false, error: "Tamanho inválido." };

  // Só permite se o usuário tem uma inscrição confirmada neste campeonato
  const { data: team } = await supabase
    .from("teams")
    .select("id, status")
    .eq("championship_id", champId)
    .or(`atleta1_id.eq.${user.id},atleta2_id.eq.${user.id}`)
    .eq("status", "confirmado")
    .maybeSingle();

  if (!team) return { ok: false, error: "Inscrição não encontrada ou não confirmada." };

  await supabase.from("profiles").update({ tamanho_camisa: tamanho }).eq("id", user.id);
  revalidatePath(`/minhas-inscricoes/${champId}`);
  return { ok: true };
}

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

  const admin = createAdminClient();

  // Pedidos pendentes ou gratuitos podem ser cancelados aqui. Uma inscricao
  // paga exige o fluxo dedicado de reembolso.
  const { data: cancellableRegistrations, error: pendingError } = await admin
    .from("registrations")
    .select("id, status_pagamento, valor, asaas_payment_id")
    .eq("team_id", teamId)
    .in("status_pagamento", ["pendente", "pago"]);

  if (pendingError) return { ok: false, error: "Nao foi possivel cancelar agora." };
  if ((cancellableRegistrations ?? []).some((registration) =>
    registration.status_pagamento === "pago"
    && (Boolean(registration.asaas_payment_id) || Number(registration.valor) > 0)
  )) {
    return { ok: false, error: "Esta inscricao foi paga. Use a opcao de solicitar reembolso." };
  }

  for (const registration of cancellableRegistrations ?? []) {
    const { error } = await admin.rpc("release_registration_inventory", {
      p_registration_id: registration.id,
      p_target_status: "estornado",
    });
    if (error) return { ok: false, error: "Nao foi possivel liberar a vaga da inscricao." };
  }

  await admin.from("teams").update({ status: "cancelado" }).eq("id", teamId);

  revalidatePath("/minhas-inscricoes");
  return { ok: true };
}
