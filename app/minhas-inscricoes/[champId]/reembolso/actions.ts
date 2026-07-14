"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reembolsarPagamento } from "@/lib/asaas";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReembolsoInfo = {
  regId:            string;
  valorInscricao:   number;
  dentroDosPrazo7d: boolean;
};

/** Carrega os dados necessários para exibir a tela de reembolso. */
export async function carregarReembolsoInfo(regId: string): Promise<ReembolsoInfo | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: reg } = await supabase
    .from("registrations")
    .select("id, valor, status_pagamento, team_id, created_at")
    .eq("id", regId)
    .single();

  if (!reg || reg.status_pagamento !== "pago") return null;

  const { data: team } = await supabase
    .from("teams")
    .select("atleta1_id, atleta2_id")
    .eq("id", reg.team_id)
    .single();

  if (!team || (team.atleta1_id !== user.id && team.atleta2_id !== user.id)) return null;

  const diasDesdeCompra = (Date.now() - new Date(reg.created_at).getTime()) / (1000 * 60 * 60 * 24);

  return {
    regId:            reg.id,
    valorInscricao:   Number(reg.valor),
    dentroDosPrazo7d: diasDesdeCompra <= 7,
  };
}

/** Executa o reembolso via Asaas. */
export async function solicitarReembolso(
  regId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: reg } = await supabase
    .from("registrations")
    .select("id, valor, status_pagamento, asaas_payment_id, team_id, created_at")
    .eq("id", regId)
    .single();

  if (!reg) return { ok: false, error: "Inscrição não encontrada." };
  if (reg.status_pagamento !== "pago") return { ok: false, error: "Esta inscrição não pode ser estornada." };
  if (!reg.asaas_payment_id) return { ok: false, error: "Cobrança não encontrada no Asaas." };

  const { data: team } = await supabase
    .from("teams")
    .select("atleta1_id, atleta2_id")
    .eq("id", reg.team_id)
    .single();

  if (!team || (team.atleta1_id !== user.id && team.atleta2_id !== user.id)) {
    return { ok: false, error: "Sem permissão para estornar esta inscrição." };
  }
  const admin = createAdminClient();

  // Dentro de 7 dias (CDC) → reembolso total (taxa de serviço incluída).
  // Após 7 dias → reembolso parcial: só o valor da inscrição (sem taxa de serviço).
  const diasDesdeCompra = (Date.now() - new Date(reg.created_at).getTime()) / (1000 * 60 * 60 * 24);
  const dentroDosPrazo  = diasDesdeCompra <= 7;
  const valorParcial    = dentroDosPrazo ? undefined : Number(reg.valor);

  // Trava de idempotência: reivindica o estorno mudando 'pago' → 'estornado' de
  // forma atômica ANTES de chamar o Asaas. Um duplo-clique / requisição
  // concorrente não consegue reivindicar de novo (0 linhas) → não estorna 2x.
  // O webhook PAYMENT_REFUNDED depois só reconfirma o mesmo estado (idempotente).
  const { data: claimed } = await admin
    .from("registrations")
    .update({ status_pagamento: "estornado" })
    .eq("id", regId)
    .eq("status_pagamento", "pago")
    .select("id");

  if (!claimed || claimed.length === 0) {
    return { ok: false, error: "Este estorno já foi solicitado." };
  }

  try {
    await reembolsarPagamento(reg.asaas_payment_id, valorParcial);
  } catch (err) {
    // Falhou no Asaas → devolve o status pra 'pago' pra permitir nova tentativa.
    await admin
      .from("registrations")
      .update({ status_pagamento: "pago" })
      .eq("id", regId);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, error: `Erro ao processar reembolso: ${msg}` };
  }

  redirect("/minhas-inscricoes");
}
