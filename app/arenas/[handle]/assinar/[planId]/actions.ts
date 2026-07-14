"use server";

import { createClient } from "@/lib/supabase/server";
import { criarOuBuscarCliente } from "@/lib/asaas";
import { createAdminClient } from "@/lib/supabase/admin";

export type AssinarInput = {
  planId:      string;
  handle:      string;
  cpf:         string;
  numero:      string;
  nomeTitular: string;
  mesValidade: string;
  anoValidade: string;
  cvv:         string;
  cep:         string;
  numeroEndereco: string;
};

export type AssinarResult =
  | { ok: true  }
  | { ok: false; error: string };

export async function assinarPlano(input: AssinarInput): Promise<AssinarResult> {
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

  const { data: plan } = await supabase
    .from("arena_plans")
    .select("id, arena_id, nome, valor, dia_vencimento, tipo, ativo")
    .eq("id", input.planId)
    .eq("tipo", "mensalidade")
    .eq("ativo", true)
    .single();

  if (!plan) return { ok: false, error: "Plano não encontrado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", user.id)
    .single();
  if (!profile) return { ok: false, error: "Perfil não encontrado." };

  const { data: existingStudent } = await supabase
    .from("arena_students")
    .select("id, status")
    .eq("arena_id", plan.arena_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingStudent?.status === "ativo") {
    return { ok: false, error: "Você já é aluno ativo desta arena." };
  }

  let customer: { id: string };
  try {
    customer = await criarOuBuscarCliente({ name: profile.nome, email: user.email!, cpfCnpj: cpfNum });
  } catch {
    return { ok: false, error: "Erro ao registrar dados do pagador." };
  }

  // Cria ou reutiliza o vínculo de aluno
  let studentId: string;
  if (existingStudent) {
    await admin
      .from("arena_students")
      .update({ plan_id: plan.id, asaas_customer_id: customer.id, valor_mensalidade: plan.valor })
      .eq("id", existingStudent.id);
    studentId = existingStudent.id;
  } else {
    const { data: newStudent, error: insErr } = await admin
      .from("arena_students")
      .insert({
        arena_id:          plan.arena_id,
        user_id:           user.id,
        status:            "pendente",
        plan_id:           plan.id,
        valor_mensalidade: plan.valor,
        asaas_customer_id: customer.id,
      })
      .select("id")
      .single();
    if (insErr || !newStudent) return { ok: false, error: "Erro ao criar vínculo com a arena." };
    studentId = newStudent.id;
  }

  // Calcula data do próximo vencimento
  const TAXA         = 0.10;
  const valorTotal   = parseFloat((Number(plan.valor) * (1 + TAXA)).toFixed(2));
  const diaVenc      = plan.dia_vencimento ?? 10;
  const now          = new Date();
  const nextDue      = new Date(now.getFullYear(), now.getMonth(), diaVenc);
  if (nextDue <= now) nextDue.setMonth(nextDue.getMonth() + 1);
  const nextDueDate  = nextDue.toISOString().split("T")[0];

  const baseUrl = process.env.ASAAS_BASE_URL;
  const apiKey  = process.env.ASAAS_API_KEY;
  if (!baseUrl || !apiKey) return { ok: false, error: "Configuração de pagamento indisponível." };

  try {
    const res = await fetch(`${baseUrl}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": apiKey },
      body: JSON.stringify({
        customer:          customer.id,
        billingType:       "CREDIT_CARD",
        value:             valorTotal,
        nextDueDate,
        cycle:             "MONTHLY",
        description:       `Mensalidade ${plan.nome}`,
        externalReference: `arena_student:${studentId}`,
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
      return { ok: false, error: msg };
    }

    const sub = await res.json() as { id: string };

    await Promise.all([
      admin
        .from("arena_students")
        .update({ asaas_subscription_id: sub.id })
        .eq("id", studentId),
      supabase
        .from("profiles_private")
        .upsert({ user_id: user.id, cpf: cpfNum }, { onConflict: "user_id" }),
    ]);

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao processar pagamento.";
    return { ok: false, error: msg };
  }
}

// ── Plano gratuito (valor = 0) ────────────────────────────────────────────────

export async function assinarGratuito(planId: string): Promise<AssinarResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };
  const admin = createAdminClient();

  const { data: plan } = await supabase
    .from("arena_plans")
    .select("id, arena_id, valor, tipo, ativo")
    .eq("id", planId)
    .eq("tipo", "mensalidade")
    .eq("ativo", true)
    .single();

  if (!plan)                           return { ok: false, error: "Plano não encontrado." };
  if (Number(plan.valor) !== 0)        return { ok: false, error: "Este plano não é gratuito." };

  const { data: existing } = await supabase
    .from("arena_students")
    .select("id, status")
    .eq("arena_id", plan.arena_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.status === "ativo") return { ok: true }; // já ativo, ok

  if (existing) {
    await admin
      .from("arena_students")
      .update({ plan_id: plan.id, status: "ativo", valor_mensalidade: 0 })
      .eq("id", existing.id);
  } else {
    const { error } = await admin
      .from("arena_students")
      .insert({ arena_id: plan.arena_id, user_id: user.id, plan_id: plan.id, status: "ativo", valor_mensalidade: 0 });
    if (error) return { ok: false, error: "Erro ao criar vínculo com a arena." };
  }

  return { ok: true };
}

// ── Onboarding pós-pagamento ──────────────────────────────────────────────────

export type OnboardingInput = {
  nome:            string;
  dataNascimento:  string; // "YYYY-MM-DD"
  genero:          string; // "masculino" | "feminino" | "outro"
  experiencia:     string; // "iniciante" | "menos1" | "1a3" | "mais3"
  esportes:        string; // JSON array string
  frequencia:      string; // "nao" | "1-2" | "3-4" | "5+"
  autoavaliacao:   string; // "basico" | "intermediario" | "avancado"
};

export type OnboardingResult =
  | { ok: true  }
  | { ok: false; error: string };

export async function salvarOnboardingAtleta(input: OnboardingInput): Promise<OnboardingResult> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  // Calcula rating inicial baseado nas respostas
  let rating = 800;

  if (input.experiencia === "menos1") rating += 100;
  if (input.experiencia === "1a3")    rating += 350;
  if (input.experiencia === "mais3")  rating += 600;

  if (input.autoavaliacao === "intermediario") rating += 200;
  if (input.autoavaliacao === "avancado")      rating += 500;

  if (input.frequencia === "3-4") rating += 100;
  if (input.frequencia === "5+")  rating += 150;

  const esportes: string[] = JSON.parse(input.esportes || "[]");
  if (esportes.includes("volei") || esportes.includes("futebol")) rating += 100;

  const [{ error }, { error: privateError }] = await Promise.all([
    admin
      .from("profiles")
      .update({
        nome: input.nome.trim(),
        genero: input.genero || null,
        rating,
      })
      .eq("id", user.id),
    supabase
      .from("profiles_private")
      .upsert(
        { user_id: user.id, data_nascimento: input.dataNascimento || null },
        { onConflict: "user_id" },
      ),
  ]);

  if (error || privateError) return { ok: false, error: "Erro ao salvar perfil." };
  return { ok: true };
}
