"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  monthKeyToDbDate, dbDateToMonthKey, parseBRLInput, resolverValoresOrcamento,
  monthsBetweenCount, buildExpenseDrafts, buildIncomeDrafts, MAX_REPEAT_MONTHS,
  dueDateForMonth, idsNoEscopoDeEdicao, resolverAjusteIntervalo, resolverPeriodoEdicao,
  type PersonSelecao, type SplitMode, type EscopoEdicao,
} from "@/lib/monthly-budget";

type Res = { ok: boolean; error?: string };

const PERSON_SELECAO = ["carlos", "julia", "carlos_e_julia"];
const SPLIT_MODES = ["igual", "personalizado"];
const ESCOPOS_EDICAO = ["esta", "esta_e_proximas", "todas"];

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

/**
 * "Repetir até" — opcional, só usado na CRIAÇÃO (não na edição). Sem esse
 * campo, o lançamento vale só pro mês selecionado. Com ele, gera uma linha
 * independente por mês entre o mês selecionado e o mês final (inclusive) —
 * nunca recorrência automática.
 */
function validarIntervaloRepeticao(
  formData: FormData,
  monthKey: string,
): { ok: true; endMonthKey: string | null } | { ok: false; error: string } {
  const raw = ((formData.get("repeat_until_month") as string) ?? "").trim();
  if (!raw) return { ok: true, endMonthKey: null };
  if (!/^\d{4}-\d{2}$/.test(raw)) return { ok: false, error: "Mês final inválido." };
  if (raw < monthKey) return { ok: false, error: "O mês final precisa ser igual ou depois do mês selecionado." };
  if (monthsBetweenCount(monthKey, raw) > MAX_REPEAT_MONTHS) {
    return { ok: false, error: `Intervalo muito longo (máximo de ${MAX_REPEAT_MONTHS} meses).` };
  }
  return { ok: true, endMonthKey: raw };
}

/** Dia do vencimento (1-31) — opcional, só existe pra despesa (não pra receita). Cada
 *  linha calcula sua própria data a partir do seu próprio mês (ver dueDateForMonth). */
function validarDiaVencimento(formData: FormData): { ok: true; dueDay: number | null } | { ok: false; error: string } {
  const raw = ((formData.get("due_day") as string) ?? "").trim();
  if (!raw) return { ok: true, dueDay: null };
  const dia = parseInt(raw, 10);
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) return { ok: false, error: "Escolha um dia do mês entre 1 e 31." };
  return { ok: true, dueDay: dia };
}

/** Escopo da edição/exclusão, só relevante quando o lançamento faz parte de um grupo "De/Até". */
function validarEscopo(formData: FormData): EscopoEdicao {
  const raw = formData.get("escopo") as string;
  return ESCOPOS_EDICAO.includes(raw) ? (raw as EscopoEdicao) : "esta";
}

/**
 * Novo período (De/Até) ao EDITAR um lançamento que já existe — lê o "Até"
 * do form e delega a regra (que depende do escopo) pra resolverPeriodoEdicao
 * (lib/monthly-budget.ts), que é pura e testada isoladamente.
 */
function validarPeriodoEdicao(
  formData: FormData,
  escopo: EscopoEdicao,
  anchorMonthKey: string,
  grupoAtual: { monthKey: string }[],
  monthKeySubmetido: string,
): { ok: true; novoPrimeiroMes: string; novoUltimoMes: string } | { ok: false; error: string } {
  const ateSubmetido = ((formData.get("repeat_until_month") as string) ?? "").trim();
  const grupoMinAtual = grupoAtual.map((g) => g.monthKey).sort()[0] ?? anchorMonthKey;
  return resolverPeriodoEdicao({ escopo, anchorMonthKey, grupoMinAtual, monthKeySubmetido, ateSubmetido });
}

// ── Despesas ─────────────────────────────────────────────────────────────────

export async function criarDespesa(formData: FormData): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const validado = validarCampos(formData);
  if (!validado.ok) return { ok: false, error: validado.error };
  const { monthKey, name, valores } = validado.campos;

  const validadoDia = validarDiaVencimento(formData);
  if (!validadoDia.ok) return { ok: false, error: validadoDia.error };

  const validadoIntervalo = validarIntervaloRepeticao(formData, monthKey);
  if (!validadoIntervalo.ok) return { ok: false, error: validadoIntervalo.error };

  const drafts = buildExpenseDrafts({
    startMonthKey: monthKey,
    endMonthKey: validadoIntervalo.endMonthKey,
    name,
    amountCarlos: valores.amountCarlos,
    amountJulia: valores.amountJulia,
    dueDay: validadoDia.dueDay,
  });

  // Toda despesa nasce com uma identidade de série estável — mesmo uma linha
  // única (sem "Até") já sai com seu próprio repeat_group_id, pra edições
  // futuras (ex: "todas as meses" expandindo o período) sempre acharem a
  // série pelo id, sem depender de heurística por nome/valor.
  const repeatGroupId = crypto.randomUUID();

  const { error } = await supabase.from("monthly_budget_expenses").insert(
    drafts.map((d) => ({
      user_id: user.id,
      month_key: monthKeyToDbDate(d.monthKey),
      name: d.name,
      amount_carlos: d.amountCarlos,
      amount_julia: d.amountJulia,
      due_date: d.dueDate,
      repeat_group_id: repeatGroupId,
    })),
  );
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

type ExpenseGroupRow = {
  id: string;
  month_key: string;
  name: string;
  amount_carlos: number | string;
  amount_julia: number | string;
  repeat_group_id: string | null;
};

const EXPENSE_GROUP_COLS = "id, month_key, name, amount_carlos, amount_julia, repeat_group_id";

/**
 * Todas as linhas do mesmo grupo lógico da linha `original`: pelo
 * repeat_group_id quando existe; senão (linha legada, criada antes da coluna
 * existir) pelas outras linhas legadas com o MESMO nome + divisão de valor —
 * mesma regra do backfill em supabase/monthly-budget.sql. Sempre inclui a
 * própria linha original.
 */
async function buscarGrupoDespesas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  original: ExpenseGroupRow,
): Promise<{ id: string; monthKey: string }[]> {
  const base = supabase.from("monthly_budget_expenses").select("id, month_key").eq("user_id", userId);
  const query = original.repeat_group_id
    ? base.eq("repeat_group_id", original.repeat_group_id)
    : base.is("repeat_group_id", null).eq("name", original.name)
        .eq("amount_carlos", Number(original.amount_carlos)).eq("amount_julia", Number(original.amount_julia));
  const { data } = await query;
  return (data ?? []).map((r) => ({ id: r.id as string, monthKey: dbDateToMonthKey(r.month_key as string) }));
}

export async function editarDespesa(formData: FormData): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Despesa inválida." };

  const validado = validarCampos(formData);
  if (!validado.ok) return { ok: false, error: validado.error };
  // Em edição, "monthKey" é o novo mês INICIAL submetido (campo "De") — só é
  // usado de fato quando o período é mostrado no form; fora isso, chega aqui
  // com o próprio mês da linha (campo escondido), sem efeito nenhum.
  const { monthKey: novoPrimeiroMesSubmetido, name, valores } = validado.campos;

  const validadoDia = validarDiaVencimento(formData);
  if (!validadoDia.ok) return { ok: false, error: validadoDia.error };

  const { data: original } = await supabase
    .from("monthly_budget_expenses")
    .select(EXPENSE_GROUP_COLS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<ExpenseGroupRow>();
  if (!original) return { ok: false, error: "Despesa não encontrada." };

  const anchorMonthKey = dbDateToMonthKey(original.month_key);
  const escopo = validarEscopo(formData);

  // Grupo atual (linhas já existentes) — sempre busca pelo id original (nunca
  // pelos valores novos submetidos), reconhecendo grupo real (repeat_group_id)
  // OU grupo legado (nome+valores, pra dados de antes dessa coluna existir).
  let grupoAtual = await buscarGrupoDespesas(supabase, user.id, original);

  // "Cura" uma série sem repeat_group_id (legado) ANTES de qualquer operação
  // que toque mais de um mês — dá um id estável pra todas as linhas do grupo
  // atual (mesmo que seja só uma). Nunca roda no escopo "esta", que só edita
  // a própria ocorrência e não precisa da identidade do grupo pra nada.
  let groupId = original.repeat_group_id;
  if (!groupId && escopo !== "esta") {
    groupId = crypto.randomUUID();
    const { error: healError } = await supabase
      .from("monthly_budget_expenses")
      .update({ repeat_group_id: groupId })
      .in("id", grupoAtual.map((g) => g.id))
      .eq("user_id", user.id);
    if (healError) return { ok: false, error: healError.message };
  }

  // ── Mudar o período — só nos escopos que olham pra frente. "esta" nunca
  // toca no período (De/Até ficam travados no form, mostrando a série inteira). ──
  if (escopo !== "esta") {
    const validadoPeriodo = validarPeriodoEdicao(formData, escopo, anchorMonthKey, grupoAtual, novoPrimeiroMesSubmetido);
    if (!validadoPeriodo.ok) return { ok: false, error: validadoPeriodo.error };

    const ajuste = resolverAjusteIntervalo(grupoAtual, validadoPeriodo.novoPrimeiroMes, validadoPeriodo.novoUltimoMes);

    if (ajuste.mesesParaCriar.length > 0) {
      const { error: insertError } = await supabase.from("monthly_budget_expenses").insert(
        ajuste.mesesParaCriar.map((monthKey) => ({
          user_id: user.id,
          month_key: monthKeyToDbDate(monthKey),
          name,
          amount_carlos: valores.amountCarlos,
          amount_julia: valores.amountJulia,
          // Toda ocorrência nova nasce pendente — nunca herda is_paid/paid_at de ninguém.
          due_date: dueDateForMonth(monthKey, validadoDia.dueDay),
          repeat_group_id: groupId,
        })),
      );
      if (insertError) return { ok: false, error: insertError.message };
    }

    if (ajuste.idsParaApagar.length > 0) {
      const { error: deleteError } = await supabase
        .from("monthly_budget_expenses")
        .delete()
        .in("id", ajuste.idsParaApagar)
        .eq("user_id", user.id);
      if (deleteError) return { ok: false, error: deleteError.message };
      const apagadosSet = new Set(ajuste.idsParaApagar);
      grupoAtual = grupoAtual.filter((g) => !apagadosSet.has(g.id));
    }
  }

  // ── Aplica nome/valor/vencimento nas linhas EXISTENTES dentro do escopo ───
  const idsAlvo = new Set(idsNoEscopoDeEdicao(grupoAtual, anchorMonthKey, escopo));
  const alvo = grupoAtual.filter((g) => idsAlvo.has(g.id));

  for (const item of alvo) {
    const { error } = await supabase
      .from("monthly_budget_expenses")
      .update({
        name,
        amount_carlos: valores.amountCarlos,
        amount_julia: valores.amountJulia,
        due_date: dueDateForMonth(item.monthKey, validadoDia.dueDay),
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
  }

  reval();
  return { ok: true };
}

export type ApagarDespesaInput = { id: string; escopo?: EscopoEdicao };

export async function apagarDespesa(input: ApagarDespesaInput): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const escopo = input.escopo ?? "esta";

  if (escopo === "esta") {
    const { error } = await supabase.from("monthly_budget_expenses").delete().eq("id", input.id).eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    reval();
    return { ok: true };
  }

  const { data: original } = await supabase
    .from("monthly_budget_expenses")
    .select(EXPENSE_GROUP_COLS)
    .eq("id", input.id)
    .eq("user_id", user.id)
    .maybeSingle<ExpenseGroupRow>();
  if (!original) return { ok: false, error: "Despesa não encontrada." };

  const anchorMonthKey = dbDateToMonthKey(original.month_key);
  const grupo = await buscarGrupoDespesas(supabase, user.id, original);
  const idsAlvo = idsNoEscopoDeEdicao(grupo, anchorMonthKey, escopo);

  const { error } = await supabase.from("monthly_budget_expenses").delete().in("id", idsAlvo).eq("user_id", user.id);
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

  const validadoIntervalo = validarIntervaloRepeticao(formData, monthKey);
  if (!validadoIntervalo.ok) return { ok: false, error: validadoIntervalo.error };

  const drafts = buildIncomeDrafts({
    startMonthKey: monthKey,
    endMonthKey: validadoIntervalo.endMonthKey,
    name,
    amountCarlos: valores.amountCarlos,
    amountJulia: valores.amountJulia,
  });

  // Mesma regra das despesas: toda receita nasce com identidade de série estável.
  const repeatGroupId = crypto.randomUUID();

  const { error } = await supabase.from("monthly_budget_incomes").insert(
    drafts.map((d) => ({
      user_id: user.id,
      month_key: monthKeyToDbDate(d.monthKey),
      name: d.name,
      amount_carlos: d.amountCarlos,
      amount_julia: d.amountJulia,
      repeat_group_id: repeatGroupId,
    })),
  );
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

type IncomeGroupRow = {
  id: string;
  month_key: string;
  name: string;
  amount_carlos: number | string;
  amount_julia: number | string;
  repeat_group_id: string | null;
};

const INCOME_GROUP_COLS = "id, month_key, name, amount_carlos, amount_julia, repeat_group_id";

/** Igual a buscarGrupoDespesas — reconhece grupo real OU grupo legado (nome+valores). */
async function buscarGrupoReceitas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  original: IncomeGroupRow,
): Promise<{ id: string; monthKey: string }[]> {
  const base = supabase.from("monthly_budget_incomes").select("id, month_key").eq("user_id", userId);
  const query = original.repeat_group_id
    ? base.eq("repeat_group_id", original.repeat_group_id)
    : base.is("repeat_group_id", null).eq("name", original.name)
        .eq("amount_carlos", Number(original.amount_carlos)).eq("amount_julia", Number(original.amount_julia));
  const { data } = await query;
  return (data ?? []).map((r) => ({ id: r.id as string, monthKey: dbDateToMonthKey(r.month_key as string) }));
}

export async function editarReceita(formData: FormData): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Receita inválida." };

  const validado = validarCampos(formData);
  if (!validado.ok) return { ok: false, error: validado.error };
  const { monthKey: novoPrimeiroMesSubmetido, name, valores } = validado.campos;

  const { data: original } = await supabase
    .from("monthly_budget_incomes")
    .select(INCOME_GROUP_COLS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<IncomeGroupRow>();
  if (!original) return { ok: false, error: "Receita não encontrada." };

  const anchorMonthKey = dbDateToMonthKey(original.month_key);
  const escopo = validarEscopo(formData);

  let grupoAtual = await buscarGrupoReceitas(supabase, user.id, original);

  let groupId = original.repeat_group_id;
  if (!groupId && escopo !== "esta") {
    groupId = crypto.randomUUID();
    const { error: healError } = await supabase
      .from("monthly_budget_incomes")
      .update({ repeat_group_id: groupId })
      .in("id", grupoAtual.map((g) => g.id))
      .eq("user_id", user.id);
    if (healError) return { ok: false, error: healError.message };
  }

  if (escopo !== "esta") {
    const validadoPeriodo = validarPeriodoEdicao(formData, escopo, anchorMonthKey, grupoAtual, novoPrimeiroMesSubmetido);
    if (!validadoPeriodo.ok) return { ok: false, error: validadoPeriodo.error };

    const ajuste = resolverAjusteIntervalo(grupoAtual, validadoPeriodo.novoPrimeiroMes, validadoPeriodo.novoUltimoMes);

    if (ajuste.mesesParaCriar.length > 0) {
      const { error: insertError } = await supabase.from("monthly_budget_incomes").insert(
        ajuste.mesesParaCriar.map((monthKey) => ({
          user_id: user.id,
          month_key: monthKeyToDbDate(monthKey),
          name,
          amount_carlos: valores.amountCarlos,
          amount_julia: valores.amountJulia,
          repeat_group_id: groupId,
        })),
      );
      if (insertError) return { ok: false, error: insertError.message };
    }

    if (ajuste.idsParaApagar.length > 0) {
      const { error: deleteError } = await supabase
        .from("monthly_budget_incomes")
        .delete()
        .in("id", ajuste.idsParaApagar)
        .eq("user_id", user.id);
      if (deleteError) return { ok: false, error: deleteError.message };
      const apagadosSet = new Set(ajuste.idsParaApagar);
      grupoAtual = grupoAtual.filter((g) => !apagadosSet.has(g.id));
    }
  }

  const idsAlvo = new Set(idsNoEscopoDeEdicao(grupoAtual, anchorMonthKey, escopo));
  const alvo = grupoAtual.filter((g) => idsAlvo.has(g.id));

  for (const item of alvo) {
    const { error } = await supabase
      .from("monthly_budget_incomes")
      .update({
        name,
        amount_carlos: valores.amountCarlos,
        amount_julia: valores.amountJulia,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
  }

  reval();
  return { ok: true };
}

export type ApagarReceitaInput = { id: string; escopo?: EscopoEdicao };

export async function apagarReceita(input: ApagarReceitaInput): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const escopo = input.escopo ?? "esta";

  if (escopo === "esta") {
    const { error } = await supabase.from("monthly_budget_incomes").delete().eq("id", input.id).eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    reval();
    return { ok: true };
  }

  const { data: original } = await supabase
    .from("monthly_budget_incomes")
    .select(INCOME_GROUP_COLS)
    .eq("id", input.id)
    .eq("user_id", user.id)
    .maybeSingle<IncomeGroupRow>();
  if (!original) return { ok: false, error: "Receita não encontrada." };

  const anchorMonthKey = dbDateToMonthKey(original.month_key);
  const grupo = await buscarGrupoReceitas(supabase, user.id, original);
  const idsAlvo = idsNoEscopoDeEdicao(grupo, anchorMonthKey, escopo);

  const { error } = await supabase.from("monthly_budget_incomes").delete().in("id", idsAlvo).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}
