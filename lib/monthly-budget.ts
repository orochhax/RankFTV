// Helpers puros do planejamento financeiro mensal (/admin/gasto-mensal).
// Tabelas isoladas (monthly_budget_expenses/monthly_budget_incomes) — nada
// aqui consulta nem altera personal_finance_* (página /admin/gastos) nem
// qualquer outra tabela do RankFTV.
//
// Reaproveita só utilitários PUROS de lib/personal-finance.ts (formatação de
// moeda/mês, split de valor, tipos de pessoa) — isso não acopla os bancos,
// já que nenhuma tabela é compartilhada entre as duas telas.

import {
  addMonthsToKey, monthLabel, monthLabelLong, parseBRLInput, formatBRLInput, splitAmountEqually,
  type Person, type PersonFilter, type PersonSelecao,
} from "@/lib/personal-finance";

export { addMonthsToKey, monthLabel, monthLabelLong, parseBRLInput, formatBRLInput, splitAmountEqually };
export type { Person, PersonFilter, PersonSelecao };

export type MonthlyBudgetExpense = {
  id: string;
  monthKey: string; // "YYYY-MM"
  name: string;
  amountCarlos: number;
  amountJulia: number;
  isPaid: boolean;
  paidAt: string | null;
};

export type MonthlyBudgetIncome = {
  id: string;
  monthKey: string; // "YYYY-MM"
  name: string;
  amountCarlos: number;
  amountJulia: number;
};

type PersonAmounts = { amountCarlos: number; amountJulia: number };

// ── Conversão de mês/data ────────────────────────────────────────────────────

/** "YYYY-MM" -> "YYYY-MM-01", formato `date` das tabelas monthly_budget_*. */
export function monthKeyToDbDate(monthKey: string): string {
  return `${monthKey}-01`;
}

/** "YYYY-MM-01" (ou qualquer data desse mês) -> "YYYY-MM". */
export function dbDateToMonthKey(date: string): string {
  return date.slice(0, 7);
}

/** Hoje no fuso de Bahia, como "YYYY-MM-DD". */
export function hojeISOBahia(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bahia" });
}

export function monthKeyNowBahia(): string {
  return hojeISOBahia().slice(0, 7);
}

/** Mês padrão de abertura da tela: o PRÓXIMO mês a partir de hoje (fuso Bahia). */
export function defaultMonthKey(): string {
  return addMonthsToKey(monthKeyNowBahia(), 1);
}

// ── Pessoa / divisão de valor ────────────────────────────────────────────────

/** Quem participa do valor: só Carlos, só Julia, ou os dois (as duas partes > 0). */
export function personOfAmounts({ amountCarlos, amountJulia }: PersonAmounts): PersonSelecao {
  if (amountJulia <= 0 && amountCarlos > 0) return "carlos";
  if (amountCarlos <= 0 && amountJulia > 0) return "julia";
  return "carlos_e_julia";
}

export function totalAmount({ amountCarlos, amountJulia }: PersonAmounts): number {
  return amountCarlos + amountJulia;
}

/** Valor "visível" sob um filtro: o total no filtro Todos, só a fatia da pessoa nos outros. */
export function amountForFilter(item: PersonAmounts, filtro: PersonFilter): number {
  if (filtro === "todos") return totalAmount(item);
  return filtro === "carlos" ? item.amountCarlos : item.amountJulia;
}

/** Um item participa do filtro se tiver valor > 0 pra aquela pessoa (sempre, no Todos). */
export function participaDoFiltro(item: PersonAmounts, filtro: PersonFilter): boolean {
  if (filtro === "todos") return true;
  return amountForFilter(item, filtro) > 0;
}

export function filterByPersonParticipation<T extends PersonAmounts>(items: T[], filtro: PersonFilter): T[] {
  return items.filter((item) => participaDoFiltro(item, filtro));
}

export function itemsOfMonth<T extends { monthKey: string }>(items: T[], monthKey: string): T[] {
  return items.filter((item) => item.monthKey === monthKey);
}

/** Ordena do maior valor VISÍVEL (conforme o filtro ativo) pro menor. */
export function sortByVisibleAmountDesc<T extends PersonAmounts>(items: T[], filtro: PersonFilter): T[] {
  return [...items].sort((a, b) => amountForFilter(b, filtro) - amountForFilter(a, filtro));
}

export function sumVisibleAmount<T extends PersonAmounts>(items: T[], filtro: PersonFilter): number {
  return items.reduce((s, item) => s + amountForFilter(item, filtro), 0);
}

// ── Resultado do mês ─────────────────────────────────────────────────────────

export type ResultadoStatus = "positivo" | "negativo" | "neutro";

export function classificarResultado(resultado: number): ResultadoStatus {
  if (resultado > 0) return "positivo";
  if (resultado < 0) return "negativo";
  return "neutro";
}

export type ResultadoMes = {
  receitas: number;
  despesas: number;
  resultado: number;
  status: ResultadoStatus;
};

/** resultado = receitas previstas - despesas previstas, já considerando o filtro de pessoa. */
export function resultadoPrevisto(
  incomes: MonthlyBudgetIncome[],
  expenses: MonthlyBudgetExpense[],
  monthKey: string,
  filtro: PersonFilter,
): ResultadoMes {
  const receitas = sumVisibleAmount(filterByPersonParticipation(itemsOfMonth(incomes, monthKey), filtro), filtro);
  const despesas = sumVisibleAmount(filterByPersonParticipation(itemsOfMonth(expenses, monthKey), filtro), filtro);
  const resultado = receitas - despesas;
  return { receitas, despesas, resultado, status: classificarResultado(resultado) };
}

/** Marcar/desmarcar como paga NUNCA muda os totais — só conta quantas estão em cada status. */
export function contarPagoPendente(
  expenses: MonthlyBudgetExpense[],
  monthKey: string,
  filtro: PersonFilter,
): { pagas: number; pendentes: number } {
  const doMes = filterByPersonParticipation(itemsOfMonth(expenses, monthKey), filtro);
  const pagas = doMes.filter((e) => e.isPaid).length;
  return { pagas, pendentes: doMes.length - pagas };
}

// ── Gráfico: mês atual + 3 anteriores (fixo, independe do mês navegado) ─────

export function lastFourMonthKeys(referenceMonthKey: string): string[] {
  return [
    addMonthsToKey(referenceMonthKey, -3),
    addMonthsToKey(referenceMonthKey, -2),
    addMonthsToKey(referenceMonthKey, -1),
    referenceMonthKey,
  ];
}

export type ExpenseChartPoint = { monthKey: string; label: string; carlos: number; julia: number; total: number };

/** Todas as despesas planejadas (pagas ou pendentes) dos 4 meses — meses sem despesa entram com zero. */
export function buildExpenseChartPoints(expenses: MonthlyBudgetExpense[], referenceMonthKey: string): ExpenseChartPoint[] {
  return lastFourMonthKeys(referenceMonthKey).map((mk) => {
    const doMes = itemsOfMonth(expenses, mk);
    const carlos = doMes.reduce((s, e) => s + e.amountCarlos, 0);
    const julia = doMes.reduce((s, e) => s + e.amountJulia, 0);
    return { monthKey: mk, label: monthLabel(mk), carlos, julia, total: carlos + julia };
  });
}

// ── Validação/recálculo de valores (servidor nunca confia no client) ────────

export type SplitMode = "igual" | "personalizado";

export type ResolverValoresInput = {
  pessoa: PersonSelecao;
  splitMode: SplitMode;
  /** NaN quando não se aplica (ex: modo personalizado não usa amountTotal). */
  amountTotal: number;
  amountCarlos: number;
  amountJulia: number;
};

export type ResolverValoresResult =
  | { ok: true; valores: { amountCarlos: number; amountJulia: number } }
  | { ok: false; error: string };

/**
 * Recalcula amountCarlos/amountJulia a partir da seleção de pessoa + modo de
 * divisão. "igual" divide o total sem perder centavo (splitAmountEqually);
 * "personalizado" usa os dois valores informados, cada um precisa ser > 0.
 * Chamar SEMPRE no servidor, nunca confiar no total já calculado no client.
 */
export function resolverValoresOrcamento(input: ResolverValoresInput): ResolverValoresResult {
  if (input.pessoa === "carlos" || input.pessoa === "julia") {
    if (!Number.isFinite(input.amountTotal) || input.amountTotal <= 0) {
      return { ok: false, error: "O valor precisa ser maior que zero." };
    }
    return input.pessoa === "carlos"
      ? { ok: true, valores: { amountCarlos: input.amountTotal, amountJulia: 0 } }
      : { ok: true, valores: { amountCarlos: 0, amountJulia: input.amountTotal } };
  }

  if (input.splitMode === "personalizado") {
    if (!Number.isFinite(input.amountCarlos) || input.amountCarlos <= 0) {
      return { ok: false, error: "O valor de Carlos precisa ser maior que zero." };
    }
    if (!Number.isFinite(input.amountJulia) || input.amountJulia <= 0) {
      return { ok: false, error: "O valor de Julia precisa ser maior que zero." };
    }
    return { ok: true, valores: { amountCarlos: input.amountCarlos, amountJulia: input.amountJulia } };
  }

  if (!Number.isFinite(input.amountTotal) || input.amountTotal <= 0) {
    return { ok: false, error: "O valor precisa ser maior que zero." };
  }
  const split = splitAmountEqually(input.amountTotal);
  return { ok: true, valores: { amountCarlos: split.carlos, amountJulia: split.julia } };
}
