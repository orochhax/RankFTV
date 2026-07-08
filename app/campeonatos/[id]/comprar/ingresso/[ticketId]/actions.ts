"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { criarOuBuscarCliente } from "@/lib/asaas";
import { calcularTotalComprador } from "@/lib/taxas";

export type CardPaymentInput = {
  ticketId:    string;
  tipo:        "credito" | "debito";
  numero:      string;
  nomeTitular: string;
  mesValidade: string;
  anoValidade: string;
  cvv:         string;
  parcelas:    number;
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

  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("id, championship_id, comprador_nome, comprador_cpf, comprador_email, valor, status_pagamento")
    .eq("id", input.ticketId)
    .maybeSingle();

  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };
  if (ticket.status_pagamento === "pago") return { ok: true, pago: true };

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

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);

  const cardData = {
    holderName:  input.nomeTitular.toUpperCase(),
    number:      input.numero.replace(/\s/g, ""),
    expiryMonth: input.mesValidade,
    expiryYear:  input.anoValidade,
    ccv:         input.cvv,
  };

  const holderInfo = {
    name:          ticket.comprador_nome,
    email:         ticket.comprador_email,
    cpfCnpj:       ticket.comprador_cpf,
    postalCode:    "00000000",
    addressNumber: "0",
  };

  const body: Record<string, unknown> = {
    customer:          customer.id,
    billingType,
    value:             valorTotal,
    dueDate:           dueDate.toISOString().split("T")[0],
    description:       `Ingresso atleta ${champ?.nome ?? "Campeonato"}`,
    externalReference: `athl:${ticket.id}`,
    creditCard:        cardData,
    creditCardHolderInfo: holderInfo,
  };

  if (input.tipo === "credito" && input.parcelas > 1) {
    body.installmentCount = input.parcelas;
    body.installmentValue = parseFloat((valorTotal / input.parcelas).toFixed(2));
  }

  const baseUrl = process.env.ASAAS_BASE_URL;
  const apiKey  = process.env.ASAAS_API_KEY;
  if (!baseUrl || !apiKey) return { ok: false, error: "Configuração de pagamento indisponível." };

  try {
    const res = await fetch(`${baseUrl}/payments`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "access_token": apiKey },
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      let msg = "Erro ao processar o cartão.";
      try {
        const json = JSON.parse(text) as { errors?: { description: string }[] };
        if (json.errors?.[0]?.description) msg = json.errors[0].description;
      } catch { /* usa msg padrão */ }
      return { ok: false, error: msg };
    }

    const pagamento = await res.json() as { id: string; status: string; invoiceUrl?: string };
    const pago = ["CONFIRMED", "RECEIVED", "AUTHORIZED"].includes(pagamento.status);

    await admin.from("athlete_tickets").update({
      asaas_payment_id: pagamento.id,
      status_pagamento: pago ? "pago" : "pendente",
      invoice_url:      pagamento.invoiceUrl ?? null,
      billing_type:     billingType,
    }).eq("id", input.ticketId);

    return { ok: true, pago };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao processar pagamento.";
    return { ok: false, error: msg };
  }
}
