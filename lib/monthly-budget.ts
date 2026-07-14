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
  /** Vencimento opcional dessa dívida/despesa nesse mês ("YYYY-MM-DD"). Não obrigatório. */
  dueDate: string | null;
  /** Liga linhas criadas juntas via "De/Até" — null quando foi criada só pra um mês. */
  repeatGroupId: string | null;
};

export type MonthlyBudgetIncome = {
  id: string;
  monthKey: string; // "YYYY-MM"
  name: string;
  amountCarlos: number;
  amountJulia: number;
  /** Liga linhas criadas juntas via "De/Até" — null quando foi criada só pra um mês. */
  repeatGroupId: string | null;
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

// ── Repetir lançamento por vários meses (criação em lote, sem recorrência) ──
// Cada mês vira uma linha própria e totalmente independente no banco — não é
// um mecanismo de recorrência virtual como o de /admin/gastos. É só um atalho
// pra não precisar cadastrar a mesma despesa/receita mês a mês na mão.

/** Limite de segurança pra "repetir até" — evita inserir centenas de linhas por engano
 *  (60 meses cobre financiamentos típicos de veículo, ex: moto em 48-60x). */
export const MAX_REPEAT_MONTHS = 60;

function monthIndexOf(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  return y * 12 + (m - 1);
}

/** Quantos meses existem entre startMonthKey e endMonthKey, inclusive nas duas pontas. */
export function monthsBetweenCount(startMonthKey: string, endMonthKey: string): number {
  return monthIndexOf(endMonthKey) - monthIndexOf(startMonthKey) + 1;
}

// Proteção contra loop infinito com entrada inválida — o limite real e
// user-facing (MAX_REPEAT_MONTHS) é validado ANTES de chamar monthKeyRange
// (ver validarIntervaloRepeticao em app/admin/gasto-mensal/actions.ts).
const HARD_SAFETY_CAP = 240;

/**
 * Lista de "YYYY-MM" de startMonthKey até endMonthKey, inclusive. Sem
 * endMonthKey (ou com endMonthKey <= startMonthKey), retorna só o mês
 * inicial — repetir "pra trás" não é uma operação válida aqui.
 */
export function monthKeyRange(startMonthKey: string, endMonthKey: string | null): string[] {
  if (!endMonthKey || endMonthKey <= startMonthKey) return [startMonthKey];
  const keys: string[] = [startMonthKey];
  let mk = startMonthKey;
  while (mk < endMonthKey && keys.length < HARD_SAFETY_CAP) {
    mk = addMonthsToKey(mk, 1);
    keys.push(mk);
  }
  return keys;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Constrói a data de vencimento de UM mês a partir só do dia (1-31),
 * clampando no último dia se o mês for mais curto (ex: dia 31 em fevereiro
 * vira 28). Sem dia informado, retorna null. Cada linha calcula seu PRÓPRIO
 * vencimento a partir do seu PRÓPRIO mês — nunca "avança" a partir de uma
 * data anterior, então não tem como acumular deslocamento entre meses.
 */
export function dueDateForMonth(monthKey: string, day: number | null): string | null {
  if (day == null) return null;
  const [y, m] = monthKey.split("-").map(Number);
  const ultimoDia = new Date(y, m, 0).getDate();
  const dia = Math.min(Math.max(1, Math.trunc(day)), ultimoDia);
  return `${monthKey}-${pad2(dia)}`;
}

/** Extrai só o dia (1-31) de uma data "YYYY-MM-DD" salva — usado pra preencher o form de edição a partir do due_date já gravado. */
export function dayOfDate(iso: string | null): number | null {
  if (!iso) return null;
  const [, , d] = iso.split("-").map(Number);
  return d;
}

export type ExpenseDraft = {
  monthKey: string;
  name: string;
  amountCarlos: number;
  amountJulia: number;
  dueDate: string | null;
};

/**
 * Gera uma linha de despesa por mês do intervalo. O vencimento é só o dia
 * (1-31) — cada linha calcula sua própria data a partir do seu próprio mês
 * (dueDateForMonth), então dá pra escolher "De"/"Até" livremente sem o
 * vencimento "vazar" pro mês errado. Sem dia informado, todas as linhas
 * ficam com dueDate null.
 */
export function buildExpenseDrafts(input: {
  startMonthKey: string;
  endMonthKey: string | null;
  name: string;
  amountCarlos: number;
  amountJulia: number;
  dueDay: number | null;
}): ExpenseDraft[] {
  return monthKeyRange(input.startMonthKey, input.endMonthKey).map((monthKey) => ({
    monthKey,
    name: input.name,
    amountCarlos: input.amountCarlos,
    amountJulia: input.amountJulia,
    dueDate: dueDateForMonth(monthKey, input.dueDay),
  }));
}

export type IncomeDraft = { monthKey: string; name: string; amountCarlos: number; amountJulia: number };

export function buildIncomeDrafts(input: {
  startMonthKey: string;
  endMonthKey: string | null;
  name: string;
  amountCarlos: number;
  amountJulia: number;
}): IncomeDraft[] {
  return monthKeyRange(input.startMonthKey, input.endMonthKey).map((monthKey) => ({
    monthKey,
    name: input.name,
    amountCarlos: input.amountCarlos,
    amountJulia: input.amountJulia,
  }));
}

// ── Escopo de edição de um lançamento que faz parte de um grupo "De/Até" ────

export type EscopoEdicao = "esta" | "esta_e_proximas" | "todas";

/**
 * Dado o grupo inteiro de linhas ligadas pelo mesmo repeat_group_id, resolve
 * quais ids devem receber a edição, conforme o escopo escolhido: "esta" só a
 * âncora; "esta_e_proximas" a âncora e tudo com mês >= o dela; "todas" o
 * grupo inteiro, independente do mês.
 */
export function idsNoEscopoDeEdicao<T extends { id: string; monthKey: string }>(
  grupo: T[],
  anchorMonthKey: string,
  escopo: EscopoEdicao,
): string[] {
  if (escopo === "todas") return grupo.map((item) => item.id);
  if (escopo === "esta_e_proximas") return grupo.filter((item) => item.monthKey >= anchorMonthKey).map((item) => item.id);
  return grupo.filter((item) => item.monthKey === anchorMonthKey).map((item) => item.id);
}

export type ResolverPeriodoEdicaoInput = {
  escopo: EscopoEdicao;
  /** Mês da ocorrência clicada (a que abriu o formulário de edição). */
  anchorMonthKey: string;
  /** Menor mês já existente no grupo atual, antes desta edição. */
  grupoMinAtual: string;
  /** "De" submetido pelo form — só usado (e livre) no escopo "todas". */
  monthKeySubmetido: string;
  /** "Até" submetido pelo form ("" quando não informado). */
  ateSubmetido: string;
};

export type ResolverPeriodoEdicaoResult =
  | { ok: true; novoPrimeiroMes: string; novoUltimoMes: string }
  | { ok: false; error: string };

/**
 * Resolve o novo período [De, Até] de uma edição, conforme o escopo:
 * - "esta_e_proximas": o INÍCIO nunca muda (ignora o que foi submetido, usa
 *   sempre o menor mês já existente no grupo); o FIM pode mudar, mas nunca
 *   pode ficar antes do mês que está sendo editado (senão a própria
 *   ocorrência clicada desapareceria).
 * - "todas": os dois lados são livres.
 * Nunca chamar pro escopo "esta" (esse nunca mexe no período).
 */
export function resolverPeriodoEdicao(input: ResolverPeriodoEdicaoInput): ResolverPeriodoEdicaoResult {
  let novoPrimeiroMes: string;
  let novoUltimoMes: string;

  if (input.escopo === "esta_e_proximas") {
    novoPrimeiroMes = input.grupoMinAtual;
    novoUltimoMes = input.ateSubmetido || input.anchorMonthKey;
    if (!/^\d{4}-\d{2}$/.test(novoUltimoMes)) return { ok: false, error: "Mês final inválido." };
    if (novoUltimoMes < input.anchorMonthKey) {
      return { ok: false, error: "O mês final não pode ser antes do mês que você está editando." };
    }
  } else {
    novoPrimeiroMes = input.monthKeySubmetido;
    novoUltimoMes = input.ateSubmetido || novoPrimeiroMes;
    if (!/^\d{4}-\d{2}$/.test(novoUltimoMes)) return { ok: false, error: "Mês final inválido." };
    if (novoUltimoMes < novoPrimeiroMes) {
      return { ok: false, error: "O mês final precisa ser igual ou depois do mês inicial." };
    }
  }

  if (monthsBetweenCount(novoPrimeiroMes, novoUltimoMes) > MAX_REPEAT_MONTHS) {
    return { ok: false, error: `Intervalo muito longo (máximo de ${MAX_REPEAT_MONTHS} meses).` };
  }
  return { ok: true, novoPrimeiroMes, novoUltimoMes };
}

// ── Mudar o período (De/Até) de um lançamento já existente ──────────────────
// Reconcilia o grupo atual (linhas já existentes) com o período desejado
// [novoPrimeiroMes, novoUltimoMes]: cria o que falta, apaga o que sobrou.
// Funciona pros dois lados — dá pra adiantar/atrasar o início e aumentar/
// diminuir o fim, inclusive os dois ao mesmo tempo (move o período inteiro).

export type AjusteIntervalo = {
  /** Meses que precisam virar linha nova (entraram no período e ainda não existem). */
  mesesParaCriar: string[];
  /** Ids de linhas existentes que ficaram fora do novo período. */
  idsParaApagar: string[];
};

/**
 * Compara o grupo atual com o período desejado e resolve o que precisa ser
 * criado ou apagado pra "redesenhar" o período pro novo formato.
 */
export function resolverAjusteIntervalo<T extends { id: string; monthKey: string }>(
  grupoAtual: T[],
  novoPrimeiroMes: string,
  novoUltimoMes: string,
): AjusteIntervalo {
  if (grupoAtual.length === 0) return { mesesParaCriar: [], idsParaApagar: [] };

  const novoConjunto = new Set(monthKeyRange(novoPrimeiroMes, novoUltimoMes));
  const mesesExistentes = new Set(grupoAtual.map((g) => g.monthKey));

  const mesesParaCriar = [...novoConjunto].filter((mk) => !mesesExistentes.has(mk)).sort();
  const idsParaApagar = grupoAtual.filter((g) => !novoConjunto.has(g.monthKey)).map((g) => g.id);

  return { mesesParaCriar, idsParaApagar };
}

/**
 * Chave de agrupamento "legado". Lançamentos criados ANTES da coluna
 * repeat_group_id existir (ex: a Parcela - Moto das primeiras versões) ficaram
 * sem grupo. Reconhecemos que são o mesmo lançamento repetido pelo nome +
 * divisão de valor (Carlos/Julia) — mesma regra do backfill em
 * supabase/monthly-budget.sql, então o comportamento é idêntico com ou sem o
 * SQL rodado.
 */
export function legacyGroupKey(item: { name: string; amountCarlos: number; amountJulia: number }): string {
  return `${item.name}||${item.amountCarlos}||${item.amountJulia}`;
}

type GroupableItem = { id: string; monthKey: string; name: string; amountCarlos: number; amountJulia: number; repeatGroupId: string | null };

/**
 * Todas as linhas do mesmo grupo lógico de `item`: pelo repeatGroupId quando
 * ele existe; senão (linha legada sem grupo), pelas outras linhas legadas com
 * a mesma chave (nome + valores). Sempre inclui o próprio `item`.
 */
export function siblingsOfGroup<T extends GroupableItem>(allItems: T[], item: T): T[] {
  if (item.repeatGroupId) return allItems.filter((i) => i.repeatGroupId === item.repeatGroupId);
  const key = legacyGroupKey(item);
  return allItems.filter((i) => i.repeatGroupId === null && legacyGroupKey(i) === key);
}

/** Faz parte de um lançamento que abrange mais de um mês (por grupo ou por chave legada). */
export function fazParteDeGrupo<T extends GroupableItem>(allItems: T[], item: T): boolean {
  return siblingsOfGroup(allItems, item).length > 1;
}

/** Menor e maior mês do grupo de `item` — ou só o próprio mês, se não abranger mais de um. */
export function groupMonthBounds<T extends GroupableItem>(
  allItems: T[],
  item: T,
): { start: string; end: string } {
  const meses = siblingsOfGroup(allItems, item).map((i) => i.monthKey).sort();
  return { start: meses[0] ?? item.monthKey, end: meses[meses.length - 1] ?? item.monthKey };
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
