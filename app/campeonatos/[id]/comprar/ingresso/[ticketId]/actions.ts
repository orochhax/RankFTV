"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarOuBuscarCliente } from "@/lib/asaas";
import { calcularTotalComprador } from "@/lib/taxas";
import { normalizarTicketAccessToken } from "@/lib/ticket-access";
import { createIdempotentCardCharge, refundIdempotently } from "@/lib/payment-flows";
import {
  beginCardPaymentAttempt,
  cardBlockedMessage,
  finishCardPaymentAttempt,
} from "@/lib/payment-security";
import { estornarAthleteTicket } from "@/lib/pagamento-inscricao";
import {
  isValidCardHolderPhone,
  normalizeAddressComplement,
  normalizeCardHolderPhone,
} from "@/lib/card-holder";
import { getClientIp } from "@/lib/rate-limit";
import { decideRefundPolicy, refundPolicyError } from "@/lib/refund-policy";
import { deliverAthleteTicketCredentials } from "@/lib/athlete-ticket-delivery";
import { reportOperationalEvent } from "@/lib/observability";
import {
  confirmAthleteTicketChange,
  requestAthleteTicketChange,
} from "@/lib/athlete-ticket-change-security";

export type CardPaymentInput = {
  ticketId:    string;
  accessToken: string;
  tipo:        "credito" | "debito";
  numero:      string;
  nomeTitular: string;
  mesValidade: string;
  anoValidade: string;
  cvv:         string;
  parcelas:    number;
  telefone:     string;
  cep:          string;
  numeroEndereco: string;
  complemento:  string;
};

export type CardPaymentResult =
  | { ok: true;  pago: boolean }
  | { ok: false; error: string };

// Pagamento com cartão pro ingresso de atleta avulso (checkout de
// visitante — sem sessão). Os dados do pagador (nome/cpf/e-mail) já foram
// digitados na hora da compra e ficam salvos no próprio ticket; não
// pedimos de novo aqui, só os dados do cartão.
export async function pagarIngressoAtletaComCartao(
  input: CardPaymentInput,
): Promise<CardPaymentResult> {
  const admin = createAdminClient();
  const telefone = normalizeCardHolderPhone(input.telefone);
  const cep = input.cep.replace(/\D/g, "");
  const numeroEndereco = input.numeroEndereco.trim();
  const complemento = normalizeAddressComplement(input.complemento);
  if (!isValidCardHolderPhone(telefone)) {
    return { ok: false, error: "Informe o celular com DDD do titular do cartão." };
  }
  if (cep.length !== 8) return { ok: false, error: "CEP inválido." };
  if (!numeroEndereco) return { ok: false, error: "Informe o número do endereço do titular." };
  const accessToken = normalizarTicketAccessToken(input.accessToken);
  if (!accessToken) return { ok: false, error: "Link do ingresso invalido." };

  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("id, championship_id, comprador_nome, comprador_cpf, comprador_email, valor, status_pagamento, billing_type")
    .eq("id", input.ticketId)
    .eq("access_token", accessToken)
    .maybeSingle();

  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };
  if (ticket.status_pagamento === "pago") return { ok: true, pago: true };
  if (ticket.billing_type === "PIX") {
    return { ok: false, error: "Este ingresso foi iniciado no Pix. Crie uma nova compra para pagar com cartão." };
  }

  const { data: champ } = await admin
    .from("championships")
    .select("nome, is_elite")
    .eq("id", ticket.championship_id)
    .single();

  let customer: { id: string };
  try {
    customer = await criarOuBuscarCliente({
      name:    ticket.comprador_nome,
      email:   ticket.comprador_email,
      cpfCnpj: ticket.comprador_cpf,
    });
  } catch {
    return { ok: false, error: "Erro ao registrar dados do pagador." };
  }

  const billingType = input.tipo === "credito" ? "CREDIT_CARD" : "DEBIT_CARD";
  const valorBase    = Number(ticket.valor);
  // Comprador paga valor + taxa de cartão (10% Padrão / 9% Elite, mín. R$3,99).
  const valorTotal   = calcularTotalComprador(valorBase, input.tipo, !!champ?.is_elite);
  const remoteIp = getClientIp(await headers());

  const attempt = await beginCardPaymentAttempt({
    flow: "athlete_ticket",
    orderReference: ticket.id,
    cardNumber: input.numero,
  });
  if (!attempt.allowed) return { ok: false, error: cardBlockedMessage(attempt.retryAfterSeconds) };

  const result = await createIdempotentCardCharge({
    flow: "athlete_ticket",
    recordId: ticket.id,
    externalReference: `athl:${ticket.id}`,
    amount: valorTotal,
    customerId: customer.id,
    billingType,
    description: `Ingresso atleta ${champ?.nome ?? "Campeonato"}`,
    card: {
      holderName: input.nomeTitular,
      number: input.numero,
      expiryMonth: input.mesValidade,
      expiryYear: input.anoValidade,
      ccv: input.cvv,
    },
    holder: {
      name: ticket.comprador_nome,
      email: ticket.comprador_email,
      cpfCnpj: ticket.comprador_cpf,
      postalCode: cep,
      addressNumber: numeroEndereco,
      addressComplement: complemento || null,
      phone: telefone,
      mobilePhone: telefone,
    },
    installments: input.tipo === "credito" ? input.parcelas : 1,
    remoteIp: remoteIp === "unknown" ? undefined : remoteIp,
    metadata: { championshipId: ticket.championship_id },
  });

  if (!result.ok) {
    await finishCardPaymentAttempt(
      attempt.attemptId,
      result.ambiguous || result.inProgress ? "ambiguous" : "declined",
    );
    return { ok: false, error: result.error };
  }

  const pagamento = result.provider;
  if (pagamento.billingType && pagamento.billingType !== billingType) {
    await finishCardPaymentAttempt(attempt.attemptId, "error", "payment_method_conflict");
    return { ok: false, error: "Já existe uma cobrança por outro meio de pagamento para este ingresso." };
  }

  const pago = pagamento.paga ?? ["CONFIRMED", "RECEIVED", "AUTHORIZED"].includes(pagamento.status ?? "");
  const { data: persistedPayment, error: persistError } = await admin.from("athlete_tickets").update({
    asaas_payment_id: pagamento.id,
    status_pagamento: pago ? "pago" : "pendente",
    invoice_url: pagamento.invoiceUrl ?? null,
    billing_type: billingType,
  })
    .eq("id", input.ticketId)
    .eq("access_token", accessToken)
    .select("id")
    .maybeSingle();
  if (persistError || !persistedPayment) {
    await finishCardPaymentAttempt(attempt.attemptId, "ambiguous", "ticket_persistence_pending");
    await reportOperationalEvent({
      level: "critical",
      event: "athlete_ticket.card_payment_persistence_failed",
      message: "Provider accepted athlete payment but ticket state was not persisted",
      context: { ticketId: input.ticketId, providerPaymentId: pagamento.id },
      error: persistError,
      alert: true,
    });
    return { ok: true, pago: false };
  }
  await finishCardPaymentAttempt(attempt.attemptId, "success", pagamento.status);
  if (pago) await deliverAthleteTicketCredentials(admin, input.ticketId);
  return { ok: true, pago };
}

// ── Alterar titularidade ────────────────────────────────────────────────────
// O token pai gerencia a compra; os QRs usam links individuais separados.
// A troca gira os segredos afetados e remove vínculos antigos com contas.

export type TitularidadeAtletaInput = {
  ticketId:       string;
  accessToken:    string;
  compradorNome:  string;
  compradorCpf:   string;
  compradorEmail: string;
  compradorZap:   string;
  compradorGenero: string;
  parceiroNome:   string;
  parceiroCpf:    string;
  parceiroEmail:  string;
  parceiroZap:    string;
  parceiroGenero: string;
  usarMesmoEmail?: boolean;
};

// ── Cancelar ingresso ────────────────────────────────────────────────────────
// A decisão é refeita no servidor com as datas persistidas. A interface apenas
// explica o resultado; nunca autoriza o cancelamento por conta própria.
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
  if (["estornado", "expirado"].includes(ticket.status_pagamento))
    return { ok: false, error: "Esse ingresso já foi cancelado." };

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

  // Ainda não pago — cancela sem mexer em pagamento nenhum.
  if (ticket.status_pagamento === "pendente") {
    const cancelled = await estornarAthleteTicket(admin, ticketId);
    if (!cancelled.ok) return { ok: false, error: "Nao foi possivel cancelar agora." };
    return { ok: true, outcome: "cancelado" };
  }

  // Pago, mas grátis ou sem cobrança real no Asaas — só marca cancelado.
  if (!ticket.asaas_payment_id || Number(ticket.valor) <= 0) {
    const cancelled = await estornarAthleteTicket(admin, ticketId);
    if (!cancelled.ok) return { ok: false, error: "Nao foi possivel cancelar agora." };
    return { ok: true, outcome: "cancelado" };
  }

  // Pago de verdade — estorna via Asaas.
  const valorParcial = policy.refundMode === "partial" ? Number(ticket.valor) : undefined;

  // Confirma que o pedido segue pago sem alterar seu estado antes de o
  // provedor aceitar o reembolso. A operacao financeira faz a trava duravel.
  const { data: claimed } = await admin
    .from("athlete_tickets")
    .select("id")
    .eq("id", ticketId)
    .eq("access_token", accessToken)
    .eq("status_pagamento", "pago");

  if (!claimed || claimed.length === 0) return { ok: false, error: "Esse cancelamento já foi solicitado." };

  const refund = await refundIdempotently({
    flow: "athlete_ticket",
    recordId: ticketId,
    originalPaymentId: ticket.asaas_payment_id,
    amount: valorParcial,
  });
  if (!refund.ok) {
    if (refund.ambiguous || refund.inProgress) {
      return { ok: true, outcome: "estorno_solicitado" };
    }
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
