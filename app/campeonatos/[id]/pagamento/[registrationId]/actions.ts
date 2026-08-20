"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { criarOuBuscarCliente } from "@/lib/asaas";
import { calcularTotalComprador } from "@/lib/taxas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createIdempotentCardCharge } from "@/lib/payment-flows";
import {
  beginCardPaymentAttempt,
  cardBlockedMessage,
  finishCardPaymentAttempt,
} from "@/lib/payment-security";
import {
  isValidCardHolderPhone,
  normalizeAddressComplement,
  normalizeCardHolderPhone,
} from "@/lib/card-holder";
import { getClientIp } from "@/lib/rate-limit";

export type CardPaymentInput = {
  registrationId: string;
  tipo:           "credito" | "debito";
  numero:         string;
  nomeTitular:    string;
  mesValidade:    string;
  anoValidade:    string;
  cvv:            string;
  parcelas:       number;
  telefone:        string;
  cep:             string;
  numeroEndereco:  string;
  complemento:     string;
};

export type CardPaymentResult =
  | { ok: true;  pago: boolean }
  | { ok: false; error: string };

export async function pagarComCartao(
  input: CardPaymentInput
): Promise<CardPaymentResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const [regRes, profileRes, privRes] = await Promise.all([
    supabase.from("registrations")
      .select("id, valor, status_pagamento, championship_id, category_id")
      .eq("id", input.registrationId).single(),
    supabase.from("profiles").select("nome").eq("id", user.id).single(),
    supabase.from("profiles_private").select("cpf").eq("user_id", user.id).maybeSingle(),
  ]);

  const cpf = privRes.data?.cpf ?? null;
  const telefone = normalizeCardHolderPhone(input.telefone);
  const cep = input.cep.replace(/\D/g, "");
  const numeroEndereco = input.numeroEndereco.trim();
  const complemento = normalizeAddressComplement(input.complemento);
  if (!isValidCardHolderPhone(telefone)) {
    return { ok: false, error: "Informe o celular com DDD do titular do cartão." };
  }
  if (cep.length !== 8) return { ok: false, error: "CEP inválido." };
  if (!numeroEndereco) return { ok: false, error: "Informe o número do endereço do titular." };

  if (!regRes.data) return { ok: false, error: "Inscrição não encontrada." };
  if (!profileRes.data) return { ok: false, error: "Perfil não encontrado." };
  if (regRes.data.status_pagamento === "pago") return { ok: true, pago: true };
  if (!cpf) {
    return { ok: false, error: "CPF não encontrado no seu perfil. Atualize o perfil e tente novamente." };
  }

  const [champRes, catRes] = await Promise.all([
    supabase.from("championships").select("nome, is_elite").eq("id", regRes.data.championship_id).single(),
    supabase.from("championship_categories").select("nome").eq("id", regRes.data.category_id).single(),
  ]);

  let customer: { id: string };
  try {
    customer = await criarOuBuscarCliente({
      name:     profileRes.data.nome,
      email:    user.email!,
      cpfCnpj: cpf,
    });
  } catch {
    return { ok: false, error: "Erro ao registrar dados do pagador." };
  }

  const billingType = input.tipo === "credito" ? "CREDIT_CARD" : "DEBIT_CARD";
  const valorBase   = Number(regRes.data.valor);
  // Comprador paga valor + taxa de cartão (10% Padrão / 9% Elite, mín. R$3,99).
  const valorTotal  = calcularTotalComprador(valorBase, input.tipo, !!champRes.data?.is_elite);
  const remoteIp = getClientIp(await headers());

  const attempt = await beginCardPaymentAttempt({
    flow: "registration",
    orderReference: input.registrationId,
    actorId: user.id,
    cardNumber: input.numero,
  });
  if (!attempt.allowed) return { ok: false, error: cardBlockedMessage(attempt.retryAfterSeconds) };

  const result = await createIdempotentCardCharge({
    flow: "registration",
    recordId: input.registrationId,
    externalReference: input.registrationId,
    amount: valorTotal,
    customerId: customer.id,
    billingType,
    description: `Inscrição ${champRes.data?.nome ?? "Campeonato"} — ${catRes.data?.nome ?? "Categoria"}`,
    card: {
      holderName: input.nomeTitular,
      number: input.numero,
      expiryMonth: input.mesValidade,
      expiryYear: input.anoValidade,
      ccv: input.cvv,
    },
    holder: {
      name: profileRes.data.nome,
      email: user.email!,
      cpfCnpj: cpf,
      postalCode: cep,
      addressNumber: numeroEndereco,
      addressComplement: complemento || null,
      phone: telefone,
      mobilePhone: telefone,
    },
    installments: input.tipo === "credito" ? input.parcelas : 1,
    remoteIp: remoteIp === "unknown" ? undefined : remoteIp,
    actorId: user.id,
    metadata: { championshipId: regRes.data.championship_id },
  });

  if (!result.ok) {
    await finishCardPaymentAttempt(
      attempt.attemptId,
      result.ambiguous || result.inProgress ? "ambiguous" : "declined",
      result.ambiguous ? "ambiguous" : "declined",
    );
    return { ok: false, error: result.error };
  }

  const pagamento = result.provider;
  if (pagamento.billingType && pagamento.billingType !== billingType) {
    await finishCardPaymentAttempt(attempt.attemptId, "error", "payment_method_conflict");
    return { ok: false, error: "Já existe uma cobrança por outro meio de pagamento para esta inscrição." };
  }

  const pago = pagamento.paga ?? ["CONFIRMED", "RECEIVED", "AUTHORIZED"].includes(pagamento.status ?? "");
  await createAdminClient().from("registrations").update({
    asaas_payment_id: pagamento.id,
    status_pagamento: pago ? "pago" : "pendente",
    invoice_url: pagamento.invoiceUrl ?? null,
    billing_type: billingType,
  }).eq("id", input.registrationId);
  await finishCardPaymentAttempt(attempt.attemptId, "success", pagamento.status);
  return { ok: true, pago };
}
