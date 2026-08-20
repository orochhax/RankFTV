"use server";

import { revalidatePath } from "next/cache";
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
  await admin.from("athlete_tickets").update({
    asaas_payment_id: pagamento.id,
    status_pagamento: pago ? "pago" : "pendente",
    invoice_url: pagamento.invoiceUrl ?? null,
    billing_type: billingType,
  })
    .eq("id", input.ticketId)
    .eq("access_token", accessToken);
  await finishCardPaymentAttempt(attempt.attemptId, "success", pagamento.status);
  return { ok: true, pago };
}

// ── Alterar titularidade ────────────────────────────────────────────────────
// Checkout de visitante: o link do ingresso É a credencial (sem login), então
// quem tem o link pode editar. Transferência imediata, sem confirmação extra,
// sem custo — troca os dados dos dois atletas da dupla.

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
};

export async function alterarTitularidadeAtleta(
  input: TitularidadeAtletaInput,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const accessToken = normalizarTicketAccessToken(input.accessToken);
  if (!accessToken) return { ok: false, error: "Link do ingresso invalido." };

  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("id, championship_id, category_id, status_pagamento")
    .eq("id", input.ticketId)
    .eq("access_token", accessToken)
    .maybeSingle();

  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };
  if (ticket.status_pagamento === "estornado")
    return { ok: false, error: "Esse ingresso foi cancelado — não dá pra alterar." };

  const compradorNome   = input.compradorNome.trim();
  const compradorCpf    = input.compradorCpf.replace(/\D/g, "");
  const compradorEmail  = input.compradorEmail.trim();
  const compradorZap    = input.compradorZap.replace(/\D/g, "");
  const compradorGenero = input.compradorGenero;
  const parceiroNome    = input.parceiroNome.trim();
  const parceiroCpf     = input.parceiroCpf.replace(/\D/g, "");
  const parceiroEmail   = input.parceiroEmail.trim();
  const parceiroZap     = input.parceiroZap.replace(/\D/g, "");
  const parceiroGenero  = input.parceiroGenero;

  if (!compradorNome)  return { ok: false, error: "Informe o nome do atleta 1." };
  if (compradorCpf.length !== 11) return { ok: false, error: "CPF do atleta 1 inválido (11 dígitos)." };
  if (!compradorEmail.includes("@")) return { ok: false, error: "E-mail do atleta 1 inválido." };
  if (!compradorZap) return { ok: false, error: "Informe o WhatsApp do atleta 1." };
  if (compradorGenero !== "masculino" && compradorGenero !== "feminino")
    return { ok: false, error: "Informe o gênero do atleta 1." };
  if (!parceiroNome)  return { ok: false, error: "Informe o nome do atleta 2." };
  if (parceiroCpf.length !== 11) return { ok: false, error: "CPF do atleta 2 inválido (11 dígitos)." };
  if (!parceiroEmail.includes("@")) return { ok: false, error: "E-mail do atleta 2 inválido." };
  if (!parceiroZap) return { ok: false, error: "Informe o WhatsApp do atleta 2." };
  if (parceiroGenero !== "masculino" && parceiroGenero !== "feminino")
    return { ok: false, error: "Informe o gênero do atleta 2." };

  // Categoria restrita a um gênero (não mista) — os dois atletas precisam bater com ela.
  if (ticket.category_id) {
    const { data: categoria } = await admin
      .from("championship_categories")
      .select("genero")
      .eq("id", ticket.category_id)
      .maybeSingle();

    if (categoria && categoria.genero !== "mista") {
      const generoLabel = categoria.genero === "feminino" ? "feminina" : "masculina";
      if (compradorGenero !== categoria.genero || parceiroGenero !== categoria.genero) {
        return { ok: false, error: `Essa categoria é apenas ${generoLabel} — os dois atletas precisam ser do gênero ${generoLabel}.` };
      }
    }
  }

  const { error } = await admin
    .from("athlete_tickets")
    .update({
      comprador_nome:   compradorNome,
      comprador_cpf:    compradorCpf,
      comprador_email:  compradorEmail,
      comprador_zap:    compradorZap,
      comprador_genero: compradorGenero,
      parceiro_nome:    parceiroNome,
      parceiro_cpf:     parceiroCpf,
      parceiro_email:   parceiroEmail,
      parceiro_zap:     parceiroZap,
      parceiro_genero:  parceiroGenero,
    })
    .eq("id", input.ticketId)
    .eq("access_token", accessToken);

  if (error) return { ok: false, error: "Erro ao salvar. Tente de novo." };

  revalidatePath(`/campeonatos/${ticket.championship_id}/comprar/ingresso/${input.ticketId}`);
  return { ok: true };
}

// ── Cancelar ingresso ────────────────────────────────────────────────────────
// Pendente: só marca cancelado (nada foi cobrado ainda). Pago: estorna via
// Asaas com a mesma regra de 7 dias (CDC) já usada na inscrição de dupla —
// total até 7 dias da compra, parcial (sem a taxa de serviço) depois disso.
export async function cancelarIngressoAtleta(
  ticketId: string,
  accessTokenRaw: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const accessToken = normalizarTicketAccessToken(accessTokenRaw);
  if (!accessToken) return { ok: false, error: "Link do ingresso invalido." };

  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("id, championship_id, valor, status_pagamento, asaas_payment_id, created_at")
    .eq("id", ticketId)
    .eq("access_token", accessToken)
    .maybeSingle();

  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };
  if (ticket.status_pagamento === "estornado")
    return { ok: false, error: "Esse ingresso já foi cancelado." };

  const path = `/campeonatos/${ticket.championship_id}/comprar/ingresso/${ticketId}`;

  // Ainda não pago — cancela sem mexer em pagamento nenhum.
  if (ticket.status_pagamento === "pendente") {
    const cancelled = await estornarAthleteTicket(admin, ticketId);
    if (!cancelled.ok) return { ok: false, error: "Nao foi possivel cancelar agora." };
    revalidatePath(path);
    return { ok: true };
  }

  // Pago, mas grátis ou sem cobrança real no Asaas — só marca cancelado.
  if (!ticket.asaas_payment_id || Number(ticket.valor) <= 0) {
    const cancelled = await estornarAthleteTicket(admin, ticketId);
    if (!cancelled.ok) return { ok: false, error: "Nao foi possivel cancelar agora." };
    revalidatePath(path);
    return { ok: true };
  }

  // Pago de verdade — estorna via Asaas.
  const diasDesdeCompra = (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24);
  const dentroDoPrazo   = diasDesdeCompra <= 7;
  const valorParcial    = dentroDoPrazo ? undefined : Number(ticket.valor);

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
      return { ok: false, error: "O reembolso esta sendo confirmado. Nao repita a solicitacao." };
    }
    return { ok: false, error: refund.error };
  }

  const cancelled = await estornarAthleteTicket(admin, ticketId);
  if (!cancelled.ok) {
    return { ok: false, error: "O reembolso foi aceito, mas o status aguarda reconciliacao." };
  }
  revalidatePath(path);
  return { ok: true };
}
