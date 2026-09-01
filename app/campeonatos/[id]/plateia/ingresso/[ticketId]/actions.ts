"use server";

import { revalidatePath } from "next/cache";
import { refundIdempotently } from "@/lib/payment-flows";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarTicketAccessToken } from "@/lib/ticket-access";
import { decideRefundPolicy, refundPolicyError } from "@/lib/refund-policy";

export type TitularidadePlateiaInput = {
  ticketId: string;
  accessToken: string;
  compradorNome: string;
  compradorEmail: string;
  compradorCpf: string;
};

async function releaseSpectatorOrder(ticketId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await createAdminClient().rpc("release_spectator_ticket_order", {
    p_ticket_id: ticketId,
    p_target_status: "estornado",
  });
  if (!error) return { ok: true };
  return {
    ok: false,
    error: error.message.includes("spectator_items_not_normalized")
      ? "Este pedido antigo precisa de revisao do suporte antes do cancelamento."
      : "Nao foi possivel concluir o cancelamento agora.",
  };
}

export async function alterarTitularidadePlateia(
  input: TitularidadePlateiaInput,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const accessToken = normalizarTicketAccessToken(input.accessToken);
  if (!accessToken) return { ok: false, error: "Link do ingresso invalido." };

  const { data: ticket } = await admin
    .from("spectator_tickets")
    .select("id, championship_id, status_pagamento")
    .eq("id", input.ticketId)
    .eq("access_token", accessToken)
    .maybeSingle();

  if (!ticket) return { ok: false, error: "Ingresso nao encontrado." };
  if (["estornado", "expirado"].includes(ticket.status_pagamento)) {
    return { ok: false, error: "Esse ingresso foi cancelado e nao pode ser alterado." };
  }

  const compradorNome = input.compradorNome.trim();
  const compradorEmail = input.compradorEmail.trim().toLowerCase();
  const compradorCpf = input.compradorCpf.replace(/\D/g, "");
  if (!compradorNome) return { ok: false, error: "Informe o nome." };
  if (!compradorEmail.includes("@")) return { ok: false, error: "E-mail invalido." };
  if (compradorCpf.length !== 11) return { ok: false, error: "CPF invalido (11 digitos)." };

  const { error } = await admin
    .from("spectator_tickets")
    .update({
      comprador_nome: compradorNome,
      comprador_email: compradorEmail,
      comprador_cpf: compradorCpf,
    })
    .eq("id", input.ticketId)
    .eq("access_token", accessToken);
  if (error) return { ok: false, error: "Erro ao salvar. Tente novamente." };

  revalidatePath(`/campeonatos/${ticket.championship_id}/plateia/ingresso/${input.ticketId}`);
  return { ok: true };
}

export async function cancelarIngressoPlateia(
  ticketId: string,
  accessTokenRaw: string,
): Promise<{ ok: boolean; error?: string; outcome?: "cancelado" | "estorno_solicitado" }> {
  const admin = createAdminClient();
  const accessToken = normalizarTicketAccessToken(accessTokenRaw);
  if (!accessToken) return { ok: false, error: "Link do ingresso invalido." };

  const { data: ticket } = await admin
    .from("spectator_tickets")
    .select("id, championship_id, valor, status_pagamento, asaas_payment_id, created_at, checked_in")
    .eq("id", ticketId)
    .eq("access_token", accessToken)
    .maybeSingle();

  if (!ticket) return { ok: false, error: "Ingresso nao encontrado." };
  if (["estornado", "expirado"].includes(ticket.status_pagamento)) {
    return { ok: false, error: "Esse ingresso ja foi cancelado." };
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

  if (ticket.status_pagamento === "pendente" || !ticket.asaas_payment_id || Number(ticket.valor) <= 0) {
    const released = await releaseSpectatorOrder(ticketId);
    if (!released.ok) return released;
    return { ok: true, outcome: "cancelado" };
  }

  const partialAmount = policy.refundMode === "partial" ? Number(ticket.valor) : undefined;
  const refund = await refundIdempotently({
    flow: "spectator_ticket",
    recordId: ticketId,
    originalPaymentId: ticket.asaas_payment_id,
    amount: partialAmount,
  });

  if (!refund.ok) {
    if (refund.ambiguous || refund.inProgress) {
      return { ok: true, outcome: "estorno_solicitado" };
    }
    return {
      ok: false,
      error: refund.error,
    };
  }

  const released = await releaseSpectatorOrder(ticketId);
  if (!released.ok) return released;
  return { ok: true, outcome: "estorno_solicitado" };
}
