"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarTicketAccessToken } from "@/lib/ticket-access";
import { refundIdempotently } from "@/lib/payment-flows";
import { estornarAthleteTicket } from "@/lib/pagamento-inscricao";
import { getClientIp } from "@/lib/rate-limit";
import { decideRefundPolicy, refundPolicyError } from "@/lib/refund-policy";
import {
  confirmAthleteTicketChange,
  requestAthleteTicketChange,
} from "@/lib/athlete-ticket-change-security";

export type TitularidadeAtletaInput = {
  ticketId: string;
  accessToken: string;
  compradorNome: string;
  compradorCpf: string;
  compradorEmail: string;
  compradorZap: string;
  compradorGenero: string;
  parceiroNome: string;
  parceiroCpf: string;
  parceiroEmail: string;
  parceiroZap: string;
  parceiroGenero: string;
  usarMesmoEmail?: boolean;
};

export async function cancelarIngressoAtleta(
  ticketId: string,
  accessTokenRaw: string,
): Promise<{ ok: boolean; error?: string; outcome?: "cancelado" | "estorno_solicitado" }> {
  const admin = createAdminClient();
  const accessToken = normalizarTicketAccessToken(accessTokenRaw);
  if (!accessToken) return { ok: false, error: "Link do ingresso invalido." };

  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("id, championship_id, valor, status_pagamento, asaas_payment_id, created_at, checked_in")
    .eq("id", ticketId)
    .eq("access_token", accessToken)
    .maybeSingle();

  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };
  if (["estornado", "expirado"].includes(ticket.status_pagamento)) {
    return { ok: false, error: "Esse ingresso já foi cancelado." };
  }

  const { data: championship } = await admin
    .from("championships")
    .select("data_inicio")
    .eq("id", ticket.championship_id)
    .maybeSingle();
  const policy = decideRefundPolicy({
    purchasedAt: ticket.created_at,
    eventStartDate: championship?.data_inicio ?? null,
    checkedIn: !!ticket.checked_in,
    paymentStatus: ticket.status_pagamento,
    hasProviderCharge: !!ticket.asaas_payment_id && Number(ticket.valor) > 0,
  });
  if (!policy.allowed) return { ok: false, error: refundPolicyError(policy) };

  if (ticket.status_pagamento === "pendente") {
    const cancelled = await estornarAthleteTicket(admin, ticketId);
    if (!cancelled.ok) return { ok: false, error: "Nao foi possivel cancelar agora." };
    return { ok: true, outcome: "cancelado" };
  }

  if (!ticket.asaas_payment_id || Number(ticket.valor) <= 0) {
    const cancelled = await estornarAthleteTicket(admin, ticketId);
    if (!cancelled.ok) return { ok: false, error: "Nao foi possivel cancelar agora." };
    return { ok: true, outcome: "cancelado" };
  }

  const valorParcial = policy.refundMode === "partial" ? Number(ticket.valor) : undefined;
  const { data: claimed } = await admin
    .from("athlete_tickets")
    .select("id")
    .eq("id", ticketId)
    .eq("access_token", accessToken)
    .eq("status_pagamento", "pago");

  if (!claimed || claimed.length === 0) {
    return { ok: false, error: "Esse cancelamento já foi solicitado." };
  }

  const refund = await refundIdempotently({
    flow: "athlete_ticket",
    recordId: ticketId,
    originalPaymentId: ticket.asaas_payment_id,
    amount: valorParcial,
  });
  if (!refund.ok) {
    if (refund.ambiguous || refund.inProgress) return { ok: true, outcome: "estorno_solicitado" };
    return { ok: false, error: refund.error };
  }

  const cancelled = await estornarAthleteTicket(admin, ticketId);
  if (!cancelled.ok) {
    return { ok: false, error: "O reembolso foi aceito, mas o status aguarda reconciliacao." };
  }
  return { ok: true, outcome: "estorno_solicitado" };
}

export async function solicitarAlteracaoTitularidadeAtleta(input: TitularidadeAtletaInput) {
  const ip = getClientIp(await headers());
  return requestAthleteTicketChange(input, ip);
}

export async function confirmarAlteracaoTitularidadeAtleta(input: {
  ticketId: string;
  accessToken: string;
  challengeId: string;
  currentEmailCode: string;
  newEmailCode?: string;
}) {
  return confirmAthleteTicketChange(input);
}
