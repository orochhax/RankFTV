"use server";

import { createClient } from "@/lib/supabase/server";
import { criarOuBuscarCliente } from "@/lib/asaas";
import { createAdminClient } from "@/lib/supabase/admin";

export type DiariaInput = {
  planId:      string;
  handle:      string;
  data:        string;   // "YYYY-MM-DD"
  cpf:         string;
  tipo:        "credito" | "debito";
  numero:      string;
  nomeTitular: string;
  mesValidade: string;
  anoValidade: string;
  cvv:         string;
  cep:         string;
  numeroEndereco: string;
};

export type DiariaResult =
  | { ok: true;  pago: boolean }
  | { ok: false; error: string };

export async function pagarDiaria(input: DiariaInput): Promise<DiariaResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  const admin = createAdminClient();

  const cpfNum = input.cpf.replace(/\D/g, "");
  const cep = input.cep.replace(/\D/g, "");
  const numeroEndereco = input.numeroEndereco.trim();
  if (cep.length !== 8) return { ok: false, error: "CEP invalido." };
  if (!numeroEndereco) return { ok: false, error: "Informe o numero do endereco do titular." };
  if (cpfNum.length !== 11) return { ok: false, error: "CPF inválido." };

  if (!input.data) return { ok: false, error: "Data é obrigatória." };

  const { data: plan } = await supabase
    .from("arena_plans")
    .select("id, arena_id, nome, valor, tipo, ativo, aceita_credito, aceita_debito")
    .eq("id", input.planId)
    .eq("tipo", "diaria")
    .eq("ativo", true)
    .single();

  if (!plan) return { ok: false, error: "Plano de diária não encontrado." };

  if (input.tipo === "debito" && !plan.aceita_debito) {
    return { ok: false, error: "Esta arena não aceita débito para diária." };
  }
  if (input.tipo === "credito" && !plan.aceita_credito) {
    return { ok: false, error: "Esta arena não aceita crédito para diária." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", user.id)
    .single();
  if (!profile) return { ok: false, error: "Perfil não encontrado." };

  let customer: { id: string };
  try {
    customer = await criarOuBuscarCliente({ name: profile.nome, email: user.email!, cpfCnpj: cpfNum });
  } catch {
    return { ok: false, error: "Erro ao registrar dados do pagador." };
  }

  const TAXA       = 0.10;
  const valorBase  = Number(plan.valor);
  const valorTotal = parseFloat((valorBase * (1 + TAXA)).toFixed(2));

  const { data: passe, error: insErr } = await admin
    .from("arena_daily_passes")
    .insert({
      arena_id:          plan.arena_id,
      plan_id:           plan.id,
      user_id:           user.id,
      data:              input.data,
      valor:             valorBase,
      status_pagamento:  "pendente",
      asaas_customer_id: customer.id,
    })
    .select("id")
    .single();

  if (insErr || !passe) return { ok: false, error: "Erro ao criar diária." };

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);
  const billingType = input.tipo === "credito" ? "CREDIT_CARD" : "DEBIT_CARD";

  const baseUrl = process.env.ASAAS_BASE_URL;
  const apiKey  = process.env.ASAAS_API_KEY;
  if (!baseUrl || !apiKey) return { ok: false, error: "Configuração de pagamento indisponível." };

  try {
    const res = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": apiKey },
      body: JSON.stringify({
        customer:          customer.id,
        billingType,
        value:             valorTotal,
        dueDate:           dueDate.toISOString().split("T")[0],
        description:       `Diária de treino — ${input.data}`,
        externalReference: `arena_daily:${passe.id}`,
        creditCard: {
          holderName:  input.nomeTitular.toUpperCase(),
          number:      input.numero.replace(/\s/g, ""),
          expiryMonth: input.mesValidade,
          expiryYear:  input.anoValidade,
          ccv:         input.cvv,
        },
        creditCardHolderInfo: {
          name:          profile.nome,
          email:         user.email!,
          cpfCnpj:       cpfNum,
          postalCode:    cep,
          addressNumber: numeroEndereco,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      let msg = "Erro ao processar o cartão.";
      try {
        const json = JSON.parse(text) as { errors?: { description: string }[] };
        if (json.errors?.[0]?.description) msg = json.errors[0].description;
      } catch { /* usa msg padrão */ }
      await admin.from("arena_daily_passes").delete().eq("id", passe.id);
      return { ok: false, error: msg };
    }

    const pagamento = await res.json() as { id: string; status: string };
    const pago = ["CONFIRMED", "RECEIVED", "AUTHORIZED"].includes(pagamento.status);

    await Promise.all([
      admin
        .from("arena_daily_passes")
        .update({
          asaas_payment_id: pagamento.id,
          billing_type:     billingType,
          ...(pago ? { status_pagamento: "pago" } : {}),
        })
        .eq("id", passe.id),
      supabase
        .from("profiles_private")
        .upsert({ user_id: user.id, cpf: cpfNum }, { onConflict: "user_id" }),
    ]);

    return { ok: true, pago };
  } catch (e) {
    await admin.from("arena_daily_passes").delete().eq("id", passe.id);
    const msg = e instanceof Error ? e.message : "Erro ao processar pagamento.";
    return { ok: false, error: msg };
  }
}
