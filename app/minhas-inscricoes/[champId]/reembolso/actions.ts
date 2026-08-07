"use server";

import { redirect } from "next/navigation";
import { estornarInscricao } from "@/lib/pagamento-inscricao";
import { refundIdempotently } from "@/lib/payment-flows";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ReembolsoInfo = {
  regId: string;
  valorInscricao: number;
  dentroDosPrazo7d: boolean;
};

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

  const ageDays = (Date.now() - new Date(reg.created_at).getTime()) / 86_400_000;
  return {
    regId: reg.id,
    valorInscricao: Number(reg.valor),
    dentroDosPrazo7d: ageDays <= 7,
  };
}

export async function solicitarReembolso(regId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const { data: reg } = await supabase
    .from("registrations")
    .select("id, valor, status_pagamento, asaas_payment_id, team_id, created_at")
    .eq("id", regId)
    .single();
  if (!reg) return { ok: false, error: "Inscricao nao encontrada." };
  if (reg.status_pagamento !== "pago") return { ok: false, error: "Esta inscricao nao pode ser estornada." };
  if (!reg.asaas_payment_id) return { ok: false, error: "Cobranca nao encontrada no Asaas." };

  const { data: team } = await supabase
    .from("teams")
    .select("atleta1_id, atleta2_id")
    .eq("id", reg.team_id)
    .single();
  if (!team || (team.atleta1_id !== user.id && team.atleta2_id !== user.id)) {
    return { ok: false, error: "Sem permissao para estornar esta inscricao." };
  }

  const ageDays = (Date.now() - new Date(reg.created_at).getTime()) / 86_400_000;
  const partialAmount = ageDays <= 7 ? undefined : Number(reg.valor);
  const refund = await refundIdempotently({
    flow: "registration",
    recordId: regId,
    originalPaymentId: reg.asaas_payment_id,
    amount: partialAmount,
    actorId: user.id,
  });
  if (!refund.ok) {
    return {
      ok: false,
      error: refund.ambiguous || refund.inProgress
        ? "O reembolso esta sendo confirmado. Nao repita a solicitacao."
        : refund.error,
    };
  }

  const updated = await estornarInscricao(createAdminClient(), regId);
  if (!updated.ok) {
    return { ok: false, error: "O reembolso foi aceito, mas o status aguarda reconciliacao." };
  }
  redirect("/minhas-inscricoes");
}
