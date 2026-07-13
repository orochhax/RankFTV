"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  monthKeyToDbDate, parseBRLInput, resolverValoresOrcamento,
  type PersonSelecao, type SplitMode,
} from "@/lib/monthly-budget";

type Res = { ok: boolean; error?: string };

const PERSON_SELECAO = ["carlos", "julia", "carlos_e_julia"];
const SPLIT_MODES = ["igual", "personalizado"];

// Só o CEO (ADMIN_EMAIL) mexe no planejamento financeiro mensal — igual /admin/gastos.
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null;
  return { supabase, user };
}

function reval() {
  revalidatePath("/admin/gasto-mensal");
}

// ── Validação compartilhada entre despesa/receita, criar/editar ─────────────

type CamposValidados = {
  monthKey: string;
  name: string;
  valores: { amountCarlos: number; amountJulia: number };
};

function validarCampos(formData: FormData): { ok: true; campos: CamposValidados } | { ok: false; error: string } {
  const monthKey = ((formData.get("month_key") as string) ?? "").trim();
  const name = ((formData.get("name") as string) ?? "").trim();
  const pessoa = formData.get("person") as string;
  const splitMode = formData.get("split_mode") as string;

  if (!/^\d{4}-\d{2}$/.test(monthKey)) return { ok: false, error: "Mês inválido." };
  if (!name) return { ok: false, error: "Informe um nome." };
  if (!PERSON_SELECAO.includes(pessoa)) return { ok: false, error: "Selecione a pessoa." };
  // split_mode só é relevante (e obrigatório) quando a pessoa é "Carlos e Julia" —
  // pessoa única nunca usa esse campo, resolverValoresOrcamento ignora nesse caso.
  if (pessoa === "carlos_e_julia" && !SPLIT_MODES.includes(splitMode)) {
    return { ok: false, error: "Selecione o modo de divisão." };
  }

  // Recalcula sempre no servidor — nunca confia no total que o client já mostrou.
  const amountTotal = parseBRLInput((formData.get("amount") as string) ?? "");
  const amountCarlos = parseBRLInput((formData.get("amount_carlos") as string) ?? "");
  const amountJulia = parseBRLInput((formData.get("amount_julia") as string) ?? "");

  const resolved = resolverValoresOrcamento({
    pessoa: pessoa as PersonSelecao,
    splitMode: splitMode as SplitMode,
    amountTotal, amountCarlos, amountJulia,
  });
  if (!resolved.ok) return { ok: false, error: resolved.error };

  return { ok: true, campos: { monthKey, name, valores: resolved.valores } };
}

// ── Despesas ─────────────────────────────────────────────────────────────────

export async function criarDespesa(formData: FormData): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const validado = validarCampos(formData);
  if (!validado.ok) return { ok: false, error: validado.error };
  const { monthKey, name, valores } = validado.campos;

  const { error } = await supabase.from("monthly_budget_expenses").insert({
    user_id: user.id,
    month_key: monthKeyToDbDate(monthKey),
    name,
    amount_carlos: valores.amountCarlos,
    amount_julia: valores.amountJulia,
  });
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

export async function editarDespesa(formData: FormData): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Despesa inválida." };

  const validado = validarCampos(formData);
  if (!validado.ok) return { ok: false, error: validado.error };
  const { name, valores } = validado.campos;

  // O mês não muda na edição — só nome e valores. Editar continua dentro do mês em que foi criada.
  const { error } = await supabase
    .from("monthly_budget_expenses")
    .update({
      name,
      amount_carlos: valores.amountCarlos,
      amount_julia: valores.amountJulia,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

export async function apagarDespesa(id: string): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const { error } = await supabase.from("monthly_budget_expenses").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

/** Marca ou desmarca como paga — nunca altera nome/valor/mês, só o status (e paid_at). */
export async function alternarPagoDespesa(id: string, pago: boolean): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("monthly_budget_expenses")
    .update({ is_paid: pago, paid_at: pago ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

// ── Receitas ─────────────────────────────────────────────────────────────────

export async function criarReceita(formData: FormData): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const validado = validarCampos(formData);
  if (!validado.ok) return { ok: false, error: validado.error };
  const { monthKey, name, valores } = validado.campos;

  const { error } = await supabase.from("monthly_budget_incomes").insert({
    user_id: user.id,
    month_key: monthKeyToDbDate(monthKey),
    name,
    amount_carlos: valores.amountCarlos,
    amount_julia: valores.amountJulia,
  });
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

export async function editarReceita(formData: FormData): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Receita inválida." };

  const validado = validarCampos(formData);
  if (!validado.ok) return { ok: false, error: validado.error };
  const { name, valores } = validado.campos;

  const { error } = await supabase
    .from("monthly_budget_incomes")
    .update({
      name,
      amount_carlos: valores.amountCarlos,
      amount_julia: valores.amountJulia,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

export async function apagarReceita(id: string): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const { error } = await supabase.from("monthly_budget_incomes").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}
