"use server";

import { redirect } from "next/navigation";
import { estornarInscricao } from "@/lib/pagamento-inscricao";
import { refundIdempotently } from "@/lib/payment-flows";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { decideRefundPolicy, refundPolicyError } from "@/lib/refund-policy";

export async function solicitarReembolso(regId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const { data: reg } = await supabase
    .from("registrations")
    .select("id, valor, status_pagamento, asaas_payment_id, team_id, championship_id, created_at")
    .eq("id", regId)
    .single();
  if (!reg) return { ok: false, error: "Inscricao nao encontrada." };
  if (reg.status_pagamento !== "pago") return { ok: false, error: "Esta inscricao nao pode ser estornada." };
  if (!reg.asaas_payment_id) return { ok: false, error: "Cobranca nao encontrada no processador de pagamentos." };

  const { data: team } = await supabase
    .from("teams")
    .select("atleta1_id, atleta2_id")
    .eq("id", reg.team_id)
    .single();
  if (!team || (team.atleta1_id !== user.id && team.atleta2_id !== user.id)) {
    return { ok: false, error: "Sem permissao para estornar esta inscricao." };
  }

  const admin = createAdminClient();
  const athleteIds = [team.atleta1_id, team.atleta2_id].filter(Boolean) as string[];
  const [{ data: championship }, { data: usedCredential }] = await Promise.all([
    admin
      .from("championships")
      .select("data_inicio")
      .eq("id", reg.championship_id)
      .maybeSingle(),
    admin
      .from("credentials")
      .select("id")
      .eq("championship_id", reg.championship_id)
      .eq("role", "atleta")
      .eq("checked_in", true)
      .in("user_id", athleteIds)
      .limit(1)
      .maybeSingle(),
  ]);
  const policy = decideRefundPolicy({
    purchasedAt: reg.created_at,
    eventStartDate: championship?.data_inicio ?? null,
    checkedIn: !!usedCredential,
    paymentStatus: reg.status_pagamento,
    hasProviderCharge: !!reg.asaas_payment_id && Number(reg.valor) > 0,
  });
  if (!policy.allowed) return { ok: false, error: refundPolicyError(policy) };

  const partialAmount = policy.refundMode === "partial" ? Number(reg.valor) : undefined;
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

  const updated = await estornarInscricao(admin, regId);
  if (!updated.ok) {
    return { ok: false, error: "O reembolso foi aceito, mas o status aguarda reconciliacao." };
  }
  redirect("/minhas-inscricoes");
}
