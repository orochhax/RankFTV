"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  monthKeyToDbDate, dbDateToMonthKey, parseBRLInput, resolverValoresOrcamento,
  monthsBetweenCount, buildExpenseDrafts, buildIncomeDrafts, MAX_REPEAT_MONTHS,
  dueDateForMonth, idsNoEscopoDeEdicao, resolverAjusteIntervalo, resolverPeriodoEdicao,
  buildEventSnapshot, historyEventToRpcPayload,
  type PersonSelecao, type SplitMode, type EscopoEdicao, type MonthlyBudgetOccurrenceSnapshot,
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

// O Extrato (/admin/gasto-mensal/extrato) lê os mesmos dados (agora via a
// tabela de histórico) — toda mutação daqui precisa revalidar as duas rotas,
// senão uma delas fica com dado velho até a próxima navegação.
function reval() {
  revalidatePath("/admin/gasto-mensal");
  revalidatePath("/admin/gasto-mensal/extrato");
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

type ExpenseGroupRow = {
  id: string;
  month_key: string;
  name: string;
  amount_carlos: number | string;
  amount_julia: number | string;
  due_date: string | null;
  is_paid: boolean;
  paid_at: string | null;
  repeat_group_id: string | null;
};

const EXPENSE_GROUP_COLS = "id, month_key, name, amount_carlos, amount_julia, due_date, is_paid, paid_at, repeat_group_id";

type GrupoDespesaItem = {
  id: string;
  monthKey: string;
  name: string;
  amountCarlos: number;
  amountJulia: number;
  dueDate: string | null;
  isPaid: boolean;
  paidAt: string | null;
};

function toExpenseOccurrenceSnapshot(item: GrupoDespesaItem): MonthlyBudgetOccurrenceSnapshot {
  return {
    id: item.id, monthKey: item.monthKey, amountCarlos: item.amountCarlos, amountJulia: item.amountJulia,
    dueDate: item.dueDate, isPaid: item.isPaid, paidAt: item.paidAt,
  };
}

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
): Promise<GrupoDespesaItem[]> {
  const base = supabase.from("monthly_budget_expenses").select(EXPENSE_GROUP_COLS).eq("user_id", userId);
  const query = original.repeat_group_id
    ? base.eq("repeat_group_id", original.repeat_group_id)
    : base.is("repeat_group_id", null).eq("name", original.name)
        .eq("amount_carlos", Number(original.amount_carlos)).eq("amount_julia", Number(original.amount_julia));
  const { data } = await query;
  return ((data ?? []) as ExpenseGroupRow[]).map((r) => ({
    id: r.id,
    monthKey: dbDateToMonthKey(r.month_key),
    name: r.name,
    amountCarlos: Number(r.amount_carlos),
    amountJulia: Number(r.amount_julia),
    dueDate: r.due_date,
    isPaid: r.is_paid,
    paidAt: r.paid_at,
  }));
}

export async function criarDespesa(formData: FormData): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase } = ctx;

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
  // série pelo id, sem depender de heurística por nome/valor. Cada linha
  // também recebe seu id já aqui (não deixa o banco gerar) — assim dá pra
  // montar o snapshot "depois" do evento com os ids reais, na mesma chamada.
  const repeatGroupId = crypto.randomUUID();
  const draftsComId = drafts.map((d) => ({ ...d, id: crypto.randomUUID() }));

  const rowsToInsert = draftsComId.map((d) => ({
    id: d.id,
    month_key: monthKeyToDbDate(d.monthKey),
    name: d.name,
    amount_carlos: d.amountCarlos,
    amount_julia: d.amountJulia,
    due_date: d.dueDate ?? "",
    repeat_group_id: repeatGroupId,
  }));

  const afterSnapshot = buildEventSnapshot(
    name,
    draftsComId.map((d): MonthlyBudgetOccurrenceSnapshot => ({
      id: d.id, monthKey: d.monthKey, amountCarlos: d.amountCarlos, amountJulia: d.amountJulia,
      dueDate: d.dueDate, isPaid: false, paidAt: null,
    })),
  );

  const { error } = await supabase.rpc("mb_write_expense_event", {
    p_ids_to_delete: null,
    p_rows_to_insert: rowsToInsert,
    p_updates: null,
    p_event: historyEventToRpcPayload({
      action: "created",
      entityGroupId: repeatGroupId,
      anchorEntryId: draftsComId[0].id,
      anchorMonthKey: draftsComId[0].monthKey,
      editScope: null,
      beforeSnapshot: null,
      afterSnapshot,
      affectedMonths: draftsComId.map((d) => d.monthKey),
    }),
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
  // Em edição, "monthKey" é o novo mês INICIAL submetido (campo "De") — só é
  // usado de fato quando o período é mostrado no form; fora isso, chega aqui
  // com o próprio mês da linha (campo escondido), sem efeito nenhum.
  const { monthKey: novoPrimeiroMesSubmetido, name, valores } = validado.campos;

  const validadoDia = validarDiaVencimento(formData);
  if (!validadoDia.ok) return { ok: false, error: validadoDia.error };

  const { data: originalRaw } = await supabase
    .from("monthly_budget_expenses")
    .select(EXPENSE_GROUP_COLS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<ExpenseGroupRow>();
  if (!originalRaw) return { ok: false, error: "Despesa não encontrada." };

  const anchorMonthKey = dbDateToMonthKey(originalRaw.month_key);
  const escopo = validarEscopo(formData);

  // Grupo ORIGINAL, nunca mutado — é dele que tiramos o snapshot "antes"
  // (inclusive de linhas que vão ser apagadas pelo ajuste de período).
  const grupoOriginal = await buscarGrupoDespesas(supabase, user.id, originalRaw);

  // "Cura" uma série sem repeat_group_id (legado) ANTES de qualquer operação
  // que toque mais de um mês — dá um id estável pra todas as linhas do grupo
  // atual (mesmo que seja só uma). Nunca roda no escopo "esta".
  let groupId = originalRaw.repeat_group_id;
  if (!groupId && escopo !== "esta") {
    groupId = crypto.randomUUID();
    const { error: healError } = await supabase
      .from("monthly_budget_expenses")
      .update({ repeat_group_id: groupId })
      .in("id", grupoOriginal.map((g) => g.id))
      .eq("user_id", user.id);
    if (healError) return { ok: false, error: healError.message };
  }

  const idsToDelete: string[] = [];
  const mesesParaCriar: { id: string; monthKey: string }[] = [];
  let grupoSobrevivente = grupoOriginal;

  // ── Mudar o período — só nos escopos que olham pra frente. "esta" nunca
  // toca no período (De/Até ficam travados no form, mostrando a série inteira). ──
  if (escopo !== "esta") {
    const validadoPeriodo = validarPeriodoEdicao(formData, escopo, anchorMonthKey, grupoOriginal, novoPrimeiroMesSubmetido);
    if (!validadoPeriodo.ok) return { ok: false, error: validadoPeriodo.error };

    const ajuste = resolverAjusteIntervalo(grupoOriginal, validadoPeriodo.novoPrimeiroMes, validadoPeriodo.novoUltimoMes);
    for (const monthKey of ajuste.mesesParaCriar) {
      mesesParaCriar.push({ id: crypto.randomUUID(), monthKey });
    }
    idsToDelete.push(...ajuste.idsParaApagar);

    const apagadosSet = new Set(ajuste.idsParaApagar);
    grupoSobrevivente = grupoOriginal.filter((g) => !apagadosSet.has(g.id));
  }

  // ── Linhas EXISTENTES que recebem os novos valores, dentro do escopo ──────
  const idsAlvoSet = new Set(idsNoEscopoDeEdicao(grupoSobrevivente, anchorMonthKey, escopo));
  const alvoExistente = grupoSobrevivente.filter((g) => idsAlvoSet.has(g.id));

  // ── Snapshot ANTES: estado antigo de tudo que este evento especificamente
  // afeta — as linhas que vão ser atualizadas + as que vão ser apagadas.
  // Linhas novas não têm "antes" (não existiam). Sempre a partir do grupo
  // ORIGINAL (nunca do sobrevivente, que já perdeu os dados das apagadas). ──
  const idsAfetadosAntes = new Set([...alvoExistente.map((g) => g.id), ...idsToDelete]);
  const beforeSnapshot = buildEventSnapshot(
    originalRaw.name,
    grupoOriginal.filter((g) => idsAfetadosAntes.has(g.id)).map(toExpenseOccurrenceSnapshot),
  );

  // ── Snapshot DEPOIS: novo estado das mesmas linhas existentes + as recém-
  // criadas — nunca as apagadas. is_paid/paid_at são preservados das linhas
  // que já existiam (editar valor nunca mexe em status de pagamento); linhas
  // novas sempre nascem pendentes. ──
  const afterOccorrencias: MonthlyBudgetOccurrenceSnapshot[] = [
    ...alvoExistente.map((g): MonthlyBudgetOccurrenceSnapshot => ({
      id: g.id, monthKey: g.monthKey, amountCarlos: valores.amountCarlos, amountJulia: valores.amountJulia,
      dueDate: dueDateForMonth(g.monthKey, validadoDia.dueDay), isPaid: g.isPaid, paidAt: g.paidAt,
    })),
    ...mesesParaCriar.map((m): MonthlyBudgetOccurrenceSnapshot => ({
      id: m.id, monthKey: m.monthKey, amountCarlos: valores.amountCarlos, amountJulia: valores.amountJulia,
      dueDate: dueDateForMonth(m.monthKey, validadoDia.dueDay), isPaid: false, paidAt: null,
    })),
  ];
  const afterSnapshot = buildEventSnapshot(name, afterOccorrencias);

  const affectedMonths = Array.from(new Set([
    ...(beforeSnapshot?.occurrences.map((o) => o.monthKey) ?? []),
    ...afterOccorrencias.map((o) => o.monthKey),
  ]));

  const { error } = await supabase.rpc("mb_write_expense_event", {
    p_ids_to_delete: idsToDelete.length > 0 ? idsToDelete : null,
    p_rows_to_insert: mesesParaCriar.length > 0
      ? mesesParaCriar.map((m) => ({
          id: m.id,
          month_key: monthKeyToDbDate(m.monthKey),
          name,
          amount_carlos: valores.amountCarlos,
          amount_julia: valores.amountJulia,
          due_date: dueDateForMonth(m.monthKey, validadoDia.dueDay) ?? "",
          repeat_group_id: groupId,
        }))
      : null,
    p_updates: alvoExistente.length > 0
      ? alvoExistente.map((g) => ({
          id: g.id,
          name,
          amount_carlos: valores.amountCarlos,
          amount_julia: valores.amountJulia,
          due_date: dueDateForMonth(g.monthKey, validadoDia.dueDay) ?? "",
        }))
      : null,
    p_event: historyEventToRpcPayload({
      action: "updated",
      entityGroupId: groupId,
      anchorEntryId: id,
      anchorMonthKey,
      editScope: escopo,
      beforeSnapshot,
      afterSnapshot,
      affectedMonths,
    }),
  });
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

export type ApagarDespesaInput = { id: string; escopo?: EscopoEdicao };

export async function apagarDespesa(input: ApagarDespesaInput): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const escopo = input.escopo ?? "esta";

  const { data: originalRaw } = await supabase
    .from("monthly_budget_expenses")
    .select(EXPENSE_GROUP_COLS)
    .eq("id", input.id)
    .eq("user_id", user.id)
    .maybeSingle<ExpenseGroupRow>();
  if (!originalRaw) return { ok: false, error: "Despesa não encontrada." };

  const anchorMonthKey = dbDateToMonthKey(originalRaw.month_key);
  const grupo = await buscarGrupoDespesas(supabase, user.id, originalRaw);
  const idsAlvo = idsNoEscopoDeEdicao(grupo, anchorMonthKey, escopo);
  const idsAlvoSet = new Set(idsAlvo);
  const removidos = grupo.filter((g) => idsAlvoSet.has(g.id));

  const beforeSnapshot = buildEventSnapshot(originalRaw.name, removidos.map(toExpenseOccurrenceSnapshot));

  const { error } = await supabase.rpc("mb_write_expense_event", {
    p_ids_to_delete: idsAlvo,
    p_rows_to_insert: null,
    p_updates: null,
    p_event: historyEventToRpcPayload({
      action: "deleted",
      entityGroupId: originalRaw.repeat_group_id,
      anchorEntryId: input.id,
      anchorMonthKey,
      editScope: escopo,
      beforeSnapshot,
      afterSnapshot: null,
      affectedMonths: removidos.map((r) => r.monthKey),
    }),
  });
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

/** Marca ou desmarca como paga — nunca altera nome/valor/mês, só o status (e paid_at). */
export async function alternarPagoDespesa(id: string, pago: boolean): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const { data: originalRaw } = await supabase
    .from("monthly_budget_expenses")
    .select(EXPENSE_GROUP_COLS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<ExpenseGroupRow>();
  if (!originalRaw) return { ok: false, error: "Despesa não encontrada." };

  const anchorMonthKey = dbDateToMonthKey(originalRaw.month_key);
  const antes: MonthlyBudgetOccurrenceSnapshot = {
    id, monthKey: anchorMonthKey,
    amountCarlos: Number(originalRaw.amount_carlos), amountJulia: Number(originalRaw.amount_julia),
    dueDate: originalRaw.due_date, isPaid: originalRaw.is_paid, paidAt: originalRaw.paid_at,
  };
  const depois: MonthlyBudgetOccurrenceSnapshot = {
    ...antes, isPaid: pago, paidAt: pago ? new Date().toISOString() : null,
  };

  const { error } = await supabase.rpc("mb_toggle_expense_paid", {
    p_id: id,
    p_paid: pago,
    p_event: historyEventToRpcPayload({
      action: "payment_changed",
      entityGroupId: originalRaw.repeat_group_id,
      anchorEntryId: id,
      anchorMonthKey,
      editScope: null,
      beforeSnapshot: buildEventSnapshot(originalRaw.name, [antes]),
      afterSnapshot: buildEventSnapshot(originalRaw.name, [depois]),
      affectedMonths: [anchorMonthKey],
    }),
  });
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

// ── Receitas ─────────────────────────────────────────────────────────────────

type IncomeGroupRow = {
  id: string;
  month_key: string;
  name: string;
  amount_carlos: number | string;
  amount_julia: number | string;
  repeat_group_id: string | null;
};

const INCOME_GROUP_COLS = "id, month_key, name, amount_carlos, amount_julia, repeat_group_id";

type GrupoReceitaItem = {
  id: string;
  monthKey: string;
  name: string;
  amountCarlos: number;
  amountJulia: number;
};

function toIncomeOccurrenceSnapshot(item: GrupoReceitaItem): MonthlyBudgetOccurrenceSnapshot {
  return { id: item.id, monthKey: item.monthKey, amountCarlos: item.amountCarlos, amountJulia: item.amountJulia };
}

/** Igual a buscarGrupoDespesas — reconhece grupo real OU grupo legado (nome+valores). */
async function buscarGrupoReceitas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  original: IncomeGroupRow,
): Promise<GrupoReceitaItem[]> {
  const base = supabase.from("monthly_budget_incomes").select(INCOME_GROUP_COLS).eq("user_id", userId);
  const query = original.repeat_group_id
    ? base.eq("repeat_group_id", original.repeat_group_id)
    : base.is("repeat_group_id", null).eq("name", original.name)
        .eq("amount_carlos", Number(original.amount_carlos)).eq("amount_julia", Number(original.amount_julia));
  const { data } = await query;
  return ((data ?? []) as IncomeGroupRow[]).map((r) => ({
    id: r.id,
    monthKey: dbDateToMonthKey(r.month_key),
    name: r.name,
    amountCarlos: Number(r.amount_carlos),
    amountJulia: Number(r.amount_julia),
  }));
}

export async function criarReceita(formData: FormData): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase } = ctx;

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

  // Mesma regra das despesas: toda receita nasce com identidade de série
  // estável e com ids já atribuídos, pro snapshot "depois" usar ids reais.
  const repeatGroupId = crypto.randomUUID();
  const draftsComId = drafts.map((d) => ({ ...d, id: crypto.randomUUID() }));

  const rowsToInsert = draftsComId.map((d) => ({
    id: d.id,
    month_key: monthKeyToDbDate(d.monthKey),
    name: d.name,
    amount_carlos: d.amountCarlos,
    amount_julia: d.amountJulia,
    repeat_group_id: repeatGroupId,
  }));

  const afterSnapshot = buildEventSnapshot(
    name,
    draftsComId.map((d): MonthlyBudgetOccurrenceSnapshot => ({
      id: d.id, monthKey: d.monthKey, amountCarlos: d.amountCarlos, amountJulia: d.amountJulia,
    })),
  );

  const { error } = await supabase.rpc("mb_write_income_event", {
    p_ids_to_delete: null,
    p_rows_to_insert: rowsToInsert,
    p_updates: null,
    p_event: historyEventToRpcPayload({
      action: "created",
      entityGroupId: repeatGroupId,
      anchorEntryId: draftsComId[0].id,
      anchorMonthKey: draftsComId[0].monthKey,
      editScope: null,
      beforeSnapshot: null,
      afterSnapshot,
      affectedMonths: draftsComId.map((d) => d.monthKey),
    }),
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
  const { monthKey: novoPrimeiroMesSubmetido, name, valores } = validado.campos;

  const { data: originalRaw } = await supabase
    .from("monthly_budget_incomes")
    .select(INCOME_GROUP_COLS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<IncomeGroupRow>();
  if (!originalRaw) return { ok: false, error: "Receita não encontrada." };

  const anchorMonthKey = dbDateToMonthKey(originalRaw.month_key);
  const escopo = validarEscopo(formData);

  const grupoOriginal = await buscarGrupoReceitas(supabase, user.id, originalRaw);

  let groupId = originalRaw.repeat_group_id;
  if (!groupId && escopo !== "esta") {
    groupId = crypto.randomUUID();
    const { error: healError } = await supabase
      .from("monthly_budget_incomes")
      .update({ repeat_group_id: groupId })
      .in("id", grupoOriginal.map((g) => g.id))
      .eq("user_id", user.id);
    if (healError) return { ok: false, error: healError.message };
  }

  const idsToDelete: string[] = [];
  const mesesParaCriar: { id: string; monthKey: string }[] = [];
  let grupoSobrevivente = grupoOriginal;

  if (escopo !== "esta") {
    const validadoPeriodo = validarPeriodoEdicao(formData, escopo, anchorMonthKey, grupoOriginal, novoPrimeiroMesSubmetido);
    if (!validadoPeriodo.ok) return { ok: false, error: validadoPeriodo.error };

    const ajuste = resolverAjusteIntervalo(grupoOriginal, validadoPeriodo.novoPrimeiroMes, validadoPeriodo.novoUltimoMes);
    for (const monthKey of ajuste.mesesParaCriar) {
      mesesParaCriar.push({ id: crypto.randomUUID(), monthKey });
    }
    idsToDelete.push(...ajuste.idsParaApagar);

    const apagadosSet = new Set(ajuste.idsParaApagar);
    grupoSobrevivente = grupoOriginal.filter((g) => !apagadosSet.has(g.id));
  }

  const idsAlvoSet = new Set(idsNoEscopoDeEdicao(grupoSobrevivente, anchorMonthKey, escopo));
  const alvoExistente = grupoSobrevivente.filter((g) => idsAlvoSet.has(g.id));

  const idsAfetadosAntes = new Set([...alvoExistente.map((g) => g.id), ...idsToDelete]);
  const beforeSnapshot = buildEventSnapshot(
    originalRaw.name,
    grupoOriginal.filter((g) => idsAfetadosAntes.has(g.id)).map(toIncomeOccurrenceSnapshot),
  );

  const afterOccorrencias: MonthlyBudgetOccurrenceSnapshot[] = [
    ...alvoExistente.map((g): MonthlyBudgetOccurrenceSnapshot => ({
      id: g.id, monthKey: g.monthKey, amountCarlos: valores.amountCarlos, amountJulia: valores.amountJulia,
    })),
    ...mesesParaCriar.map((m): MonthlyBudgetOccurrenceSnapshot => ({
      id: m.id, monthKey: m.monthKey, amountCarlos: valores.amountCarlos, amountJulia: valores.amountJulia,
    })),
  ];
  const afterSnapshot = buildEventSnapshot(name, afterOccorrencias);

  const affectedMonths = Array.from(new Set([
    ...(beforeSnapshot?.occurrences.map((o) => o.monthKey) ?? []),
    ...afterOccorrencias.map((o) => o.monthKey),
  ]));

  const { error } = await supabase.rpc("mb_write_income_event", {
    p_ids_to_delete: idsToDelete.length > 0 ? idsToDelete : null,
    p_rows_to_insert: mesesParaCriar.length > 0
      ? mesesParaCriar.map((m) => ({
          id: m.id,
          month_key: monthKeyToDbDate(m.monthKey),
          name,
          amount_carlos: valores.amountCarlos,
          amount_julia: valores.amountJulia,
          repeat_group_id: groupId,
        }))
      : null,
    p_updates: alvoExistente.length > 0
      ? alvoExistente.map((g) => ({
          id: g.id, name, amount_carlos: valores.amountCarlos, amount_julia: valores.amountJulia,
        }))
      : null,
    p_event: historyEventToRpcPayload({
      action: "updated",
      entityGroupId: groupId,
      anchorEntryId: id,
      anchorMonthKey,
      editScope: escopo,
      beforeSnapshot,
      afterSnapshot,
      affectedMonths,
    }),
  });
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

export type ApagarReceitaInput = { id: string; escopo?: EscopoEdicao };

export async function apagarReceita(input: ApagarReceitaInput): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const escopo = input.escopo ?? "esta";

  const { data: originalRaw } = await supabase
    .from("monthly_budget_incomes")
    .select(INCOME_GROUP_COLS)
    .eq("id", input.id)
    .eq("user_id", user.id)
    .maybeSingle<IncomeGroupRow>();
  if (!originalRaw) return { ok: false, error: "Receita não encontrada." };

  const anchorMonthKey = dbDateToMonthKey(originalRaw.month_key);
  const grupo = await buscarGrupoReceitas(supabase, user.id, originalRaw);
  const idsAlvo = idsNoEscopoDeEdicao(grupo, anchorMonthKey, escopo);
  const idsAlvoSet = new Set(idsAlvo);
  const removidos = grupo.filter((g) => idsAlvoSet.has(g.id));

  const beforeSnapshot = buildEventSnapshot(originalRaw.name, removidos.map(toIncomeOccurrenceSnapshot));

  const { error } = await supabase.rpc("mb_write_income_event", {
    p_ids_to_delete: idsAlvo,
    p_rows_to_insert: null,
    p_updates: null,
    p_event: historyEventToRpcPayload({
      action: "deleted",
      entityGroupId: originalRaw.repeat_group_id,
      anchorEntryId: input.id,
      anchorMonthKey,
      editScope: escopo,
      beforeSnapshot,
      afterSnapshot: null,
      affectedMonths: removidos.map((r) => r.monthKey),
    }),
  });
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}
