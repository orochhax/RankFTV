"use server";

import { createClient } from "@/lib/supabase/server";
import { criarOuBuscarCliente } from "@/lib/asaas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createIdempotentCharge } from "@/lib/payment-flows";
import {
  arenaRentalPaymentSchema,
  invalidPaymentInput,
} from "@/lib/payment-input-schemas";

export type AlugarInput = {
  planId:      string;
  handle:      string;
  data:        string;   // "YYYY-MM-DD"
  hora:        string;   // "HH:MM"
  cpf:         string;
  tipo:        "credito";
};

export type AlugarResult =
  | { ok: true; invoiceUrl: string }
  | { ok: false; error: string };

export async function alugarQuadra(input: AlugarInput): Promise<AlugarResult> {
  const parsed = arenaRentalPaymentSchema.safeParse(input);
  if (!parsed.success) return invalidPaymentInput();
  input = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  const admin = createAdminClient();

  const cpfNum = input.cpf.replace(/\D/g, "");
  if (cpfNum.length !== 11) return { ok: false, error: "CPF inválido." };

  if (!input.data || !input.hora) return { ok: false, error: "Data e hora são obrigatórios." };

  const { data: plan } = await supabase
    .from("arena_plans")
    .select("id, arena_id, nome, valor, tipo, ativo, aceita_credito, aceita_debito")
    .eq("id", input.planId)
    .eq("tipo", "aluguel")
    .eq("ativo", true)
    .single();

  if (!plan) return { ok: false, error: "Plano de aluguel não encontrado." };

  const { data: arena } = await supabase
    .from("arenas")
    .select("id")
    .eq("id", plan.arena_id)
    .eq("handle", input.handle)
    .maybeSingle();
  if (!arena) return { ok: false, error: "Plano de aluguel não encontrado." };

  if (!plan.aceita_credito) {
    return { ok: false, error: "Esta arena não aceita crédito para aluguel." };
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

  // Cria reserva com status pendente
  const { data: rental, error: insErr } = await admin
    .from("arena_rentals")
    .insert({
      arena_id:         plan.arena_id,
      plan_id:          plan.id,
      user_id:          user.id,
      data:             input.data,
      hora:             input.hora,
      valor:            valorBase,
      status_pagamento: "pendente",
      asaas_customer_id: customer.id,
    })
    .select("id")
    .single();

  if (insErr || !rental) {
    // 23505 = unique_violation no índice arena_rentals_one_active_per_slot —
    // outra reserva pegou este horário entre a checagem de disponibilidade
    // e este INSERT (ou foi clique duplo). Nunca chega a chamar o Asaas.
    if (insErr?.code === "23505") {
      return { ok: false, error: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro." };
    }
    return { ok: false, error: "Erro ao criar reserva." };
  }

  const result = await createIdempotentCharge({
    flow: "arena_rental",
    recordId: rental.id,
    externalReference: `arena_rental:${rental.id}`,
    amount: valorTotal,
    customerId: customer.id,
    method: "credito",
    description: `Aluguel de quadra — ${input.data} às ${input.hora}`,
    actorId: user.id,
    metadata: { arenaId: plan.arena_id, planId: plan.id },
  });

  if (!result.ok) {
    if (!result.ambiguous && !result.inProgress) {
      await admin.from("arena_rentals").update({ status_pagamento: "cancelado" }).eq("id", rental.id);
    }
    return { ok: false, error: result.error };
  }

  const pagamento = result.provider;
  if (!pagamento.invoiceUrl) {
    await admin.from("arena_rentals").update({ status_pagamento: "cancelado" }).eq("id", rental.id);
    return { ok: false, error: "O checkout do cartão não foi gerado. Tente novamente." };
  }
  await Promise.all([
    admin.from("arena_rentals").update({
      asaas_payment_id: pagamento.id,
      billing_type: "CREDIT_CARD",
      invoice_url: pagamento.invoiceUrl,
    }).eq("id", rental.id),
    supabase.from("profiles_private").upsert({ user_id: user.id, cpf: cpfNum }, { onConflict: "user_id" }),
  ]);
  return { ok: true, invoiceUrl: pagamento.invoiceUrl };
}
