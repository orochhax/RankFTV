"use server";

import { createClient } from "@/lib/supabase/server";
import { criarOuBuscarCliente } from "@/lib/asaas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createIdempotentCharge } from "@/lib/payment-flows";
import {
  arenaDailyPaymentSchema,
  invalidPaymentInput,
} from "@/lib/payment-input-schemas";

export type DiariaInput = {
  planId:      string;
  handle:      string;
  data:        string;   // "YYYY-MM-DD"
  cpf:         string;
  tipo:        "credito";
};

export type DiariaResult =
  | { ok: true; invoiceUrl: string }
  | { ok: false; error: string };

export async function pagarDiaria(input: DiariaInput): Promise<DiariaResult> {
  const parsed = arenaDailyPaymentSchema.safeParse(input);
  if (!parsed.success) return invalidPaymentInput();
  input = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  const admin = createAdminClient();

  const cpfNum = input.cpf.replace(/\D/g, "");
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

  const { data: arena } = await supabase
    .from("arenas")
    .select("id")
    .eq("id", plan.arena_id)
    .eq("handle", input.handle)
    .maybeSingle();
  if (!arena) return { ok: false, error: "Plano de diária não encontrado." };

  if (!plan.aceita_credito) {
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

  if (insErr || !passe) {
    return { ok: false, error: "Erro ao criar diária." };
  }

  const result = await createIdempotentCharge({
    flow: "arena_daily_pass",
    recordId: passe.id,
    externalReference: `arena_daily:${passe.id}`,
    amount: valorTotal,
    customerId: customer.id,
    method: "credito",
    description: `Diária de treino — ${input.data}`,
    actorId: user.id,
    metadata: { arenaId: plan.arena_id, planId: plan.id },
  });

  if (!result.ok) {
    if (!result.ambiguous && !result.inProgress) {
      await admin.from("arena_daily_passes").update({ status_pagamento: "cancelado" }).eq("id", passe.id);
    }
    return { ok: false, error: result.error };
  }

  const pagamento = result.provider;
  if (!pagamento.invoiceUrl) {
    await admin.from("arena_daily_passes").update({ status_pagamento: "cancelado" }).eq("id", passe.id);
    return { ok: false, error: "O checkout do cartão não foi gerado. Tente novamente." };
  }
  await Promise.all([
    admin.from("arena_daily_passes").update({
      asaas_payment_id: pagamento.id,
      billing_type: "CREDIT_CARD",
      invoice_url: pagamento.invoiceUrl,
    }).eq("id", passe.id),
    supabase.from("profiles_private").upsert({ user_id: user.id, cpf: cpfNum }, { onConflict: "user_id" }),
  ]);
  return { ok: true, invoiceUrl: pagamento.invoiceUrl };
}
