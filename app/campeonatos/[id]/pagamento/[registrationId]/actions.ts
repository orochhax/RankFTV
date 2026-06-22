"use server";

import { createClient } from "@/lib/supabase/server";
import { criarOuBuscarCliente } from "@/lib/asaas";
import { calcularTotalComprador } from "@/lib/taxas";

export type CardPaymentInput = {
  registrationId: string;
  tipo:           "credito" | "debito";
  numero:         string;
  nomeTitular:    string;
  mesValidade:    string;
  anoValidade:    string;
  cvv:            string;
  parcelas:       number;
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
    name:          profileRes.data.nome,
    email:         user.email!,
    cpfCnpj:       cpf,
    postalCode:    "00000000",
    addressNumber: "0",
  };

  const body: Record<string, unknown> = {
    customer:          customer.id,
    billingType,
    value:             valorTotal,
    dueDate:           dueDate.toISOString().split("T")[0],
    description:       `Inscrição ${champRes.data?.nome ?? "Campeonato"} — ${catRes.data?.nome ?? "Categoria"}`,
    externalReference: input.registrationId,
    creditCard:        cardData,
    creditCardHolderInfo: holderInfo,
  };

  // Parcelamento só no crédito — usuário escolhe
  if (input.tipo === "credito" && input.parcelas > 1) {
    body.installmentCount = input.parcelas;
    body.installmentValue = parseFloat((valorTotal / input.parcelas).toFixed(2));
  }

  const baseUrl = process.env.ASAAS_BASE_URL;
  const apiKey  = process.env.ASAAS_API_KEY;
  if (!baseUrl || !apiKey) return { ok: false, error: "Configuração de pagamento indisponível." };

  try {
    const res = await fetch(`${baseUrl}/payments`, {
      method: "POST",
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

    await supabase.from("registrations").update({
      asaas_payment_id:  pagamento.id,
      status_pagamento:  pago ? "pago" : "pendente",
      invoice_url:       pagamento.invoiceUrl ?? null,
    }).eq("id", input.registrationId);

    return { ok: true, pago };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao processar pagamento.";
    return { ok: false, error: msg };
  }
}
