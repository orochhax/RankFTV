"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reembolsarPagamento } from "@/lib/asaas";

export async function solicitarReembolso(
  regId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  // Carrega a inscrição e verifica que pertence ao usuário
  const { data: reg } = await supabase
    .from("registrations")
    .select("id, status_pagamento, asaas_payment_id, championship_id, team_id")
    .eq("id", regId)
    .single();

  if (!reg) return { ok: false, error: "Inscrição não encontrada." };
  if (reg.status_pagamento !== "pago") return { ok: false, error: "Esta inscrição não pode ser estornada." };
  if (!reg.asaas_payment_id) return { ok: false, error: "Cobrança não encontrada no Asaas." };

  // Confirma que o usuário é atleta desta dupla
  const { data: team } = await supabase
    .from("teams")
    .select("atleta1_id, atleta2_id")
    .eq("id", reg.team_id)
    .single();

  if (!team || (team.atleta1_id !== user.id && team.atleta2_id !== user.id)) {
    return { ok: false, error: "Sem permissão para estornar esta inscrição." };
  }

  // Chama a API do Asaas para estornar
  try {
    await reembolsarPagamento(reg.asaas_payment_id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, error: `Erro ao processar reembolso: ${msg}` };
  }

  // O webhook PAYMENT_REFUNDED vai atualizar o status no banco automaticamente.
  // Redireciona para as inscrições.
  redirect("/minhas-inscricoes");
}
