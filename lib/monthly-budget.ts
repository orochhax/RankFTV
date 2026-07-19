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
  /** Quando a linha foi cadastrada (timestamptz do banco) — nunca muda numa edição. */
  createdAt: string;
  /** Quando a linha foi alterada pela última vez — igual a createdAt se nunca foi editada. */
  updatedAt: string;
};

export type MonthlyBudgetIncome = {
  id: string;
  monthKey: string; // "YYYY-MM"
  name: string;
  amountCarlos: number;
  amountJulia: number;
  /** Liga linhas criadas juntas via "De/Até" — null quando foi criada só pra um mês. */
  repeatGroupId: string | null;
  /** Quando a linha foi cadastrada (timestamptz do banco) — nunca muda numa edição. */
  createdAt: string;
  /** Quando a linha foi alterada pela última vez — igual a createdAt se nunca foi editada. */
  updatedAt: string;
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

// ── Datas em Bahia (usadas pelo histórico) ───────────────────────────────────

/** Formata um timestamptz ISO em "dd/MM/yyyy HH:mm", sempre no fuso de Bahia —
 *  independe do fuso do servidor/navegador que estiver rodando. Usa
 *  formatToParts (não toLocaleString direto) pra garantir esse formato exato,
 *  sem depender de como a implementação de Intl da plataforma pontua a data. */
export function formatDateTimeBahia(iso: string): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${valor("day")}/${valor("month")}/${valor("year")} ${valor("hour")}:${valor("minute")}`;
}

/** Só a parte "YYYY-MM-DD" de um timestamptz, no fuso de Bahia — usado pro
 *  filtro de intervalo de data do evento (compara datas civis, não instantes). */
export function createdAtDateKeyBahia(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Bahia" });
}

/**
 * Conta quantos registros cada escopo de exclusão/edição afeta — pra mostrar
 * no diálogo de exclusão/edição do lançamento atual (ex.: "Apagar todos os
 * meses (5 lançamentos)"). Puro wrapper sobre idsNoEscopoDeEdicao.
 */
export function contagensDoEscopo<T extends { id: string; monthKey: string }>(
  grupo: T[],
  anchorMonthKey: string,
): Record<EscopoEdicao, number> {
  return {
    esta: idsNoEscopoDeEdicao(grupo, anchorMonthKey, "esta").length,
    esta_e_proximas: idsNoEscopoDeEdicao(grupo, anchorMonthKey, "esta_e_proximas").length,
    todas: idsNoEscopoDeEdicao(grupo, anchorMonthKey, "todas").length,
  };
}

// ═════════════════════════════════════════════════════════════════════════
// Histórico de eventos (/admin/gasto-mensal/extrato)
// ═════════════════════════════════════════════════════════════════════════
// O Extrato é uma timeline de AÇÕES sobre monthly_budget_expenses/incomes —
// criar, editar, excluir, marcar pago/pendente — nunca uma listagem de cada
// ocorrência mensal. Uma série "De/Até" de 12 meses gera UM evento "created",
// nunca 12. Os eventos em si são imutáveis: uma nova edição gera outro
// evento, nunca reescreve o anterior (ver supabase/monthly-budget.sql —
// monthly_budget_history_events, sem policy de UPDATE/DELETE).
//
// A mutação da tabela mensal e a criação do evento acontecem atomicamente
// dentro de uma função SQL (RPC) — as Server Actions só montam os parâmetros
// (before/after snapshot, quais ids inserir/atualizar/apagar) usando os
// helpers puros abaixo, e chamam supabase.rpc(...). Nada aqui toca no banco.

export type HistoryEntityKind = "income" | "expense";
export type HistoryAction = "created" | "updated" | "deleted" | "payment_changed" | "imported";

/** Uma ocorrência mensal dentro de um snapshot — o bastante pra reconstruir
 *  a linha que existiu (ou passou a existir) naquele mês específico. */
export type MonthlyBudgetOccurrenceSnapshot = {
  id: string;
  monthKey: string;
  amountCarlos: number;
  amountJulia: number;
  /** Os três campos abaixo só existem pra despesa. */
  dueDate?: string | null;
  isPaid?: boolean;
  paidAt?: string | null;
};

/** Antes/depois de um evento: nome, pessoa, valores, período e só as
 *  ocorrências que ESSE evento especificamente afetou — uma edição de
 *  "somente este mês" tem 1 ocorrência aqui, nunca a série inteira. */
export type MonthlyBudgetEventSnapshot = {
  name: string;
  person: PersonSelecao;
  amountCarlos: number;
  amountJulia: number;
  amountTotal: number;
  periodStart: string; // monthKey
  periodEnd: string;   // monthKey
  monthsCount: number;
  /** Só despesa — dia do vencimento (1-31), quando configurado. */
  dueDay?: number | null;
  occurrences: MonthlyBudgetOccurrenceSnapshot[];
};

export type MonthlyBudgetHistoryEvent = {
  id: string;
  entityKind: HistoryEntityKind;
  action: HistoryAction;
  entityGroupId: string | null;
  anchorEntryId: string | null;
  anchorMonthKey: string; // "YYYY-MM"
  editScope: EscopoEdicao | null;
  previousEventId: string | null;
  occurredAt: string; // ISO
  beforeSnapshot: MonthlyBudgetEventSnapshot | null;
  afterSnapshot: MonthlyBudgetEventSnapshot | null;
  affectedMonths: string[]; // "YYYY-MM"[]
  metadata: Record<string, unknown>;
};

/**
 * Monta o snapshot (antes OU depois) de um evento a partir das ocorrências
 * que aquela ação especificamente tocou. `name` vem à parte porque a
 * ocorrência não guarda nome — ele é uma propriedade do lançamento inteiro,
 * uma vez por snapshot, não repetido em cada mês. O dia de vencimento
 * (dueDay) é derivado da primeira ocorrência com due_date — nunca recebido
 * à parte, pra não arriscar divergir do que as ocorrências realmente têm.
 */
export function buildEventSnapshot(
  name: string,
  occurrences: MonthlyBudgetOccurrenceSnapshot[],
): MonthlyBudgetEventSnapshot | null {
  if (occurrences.length === 0) return null;
  const ordenadas = [...occurrences].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  const { amountCarlos, amountJulia } = ordenadas[0];
  const comVencimento = ordenadas.find((o) => o.dueDate);
  return {
    name,
    person: personOfAmounts({ amountCarlos, amountJulia }),
    amountCarlos,
    amountJulia,
    amountTotal: amountCarlos + amountJulia,
    periodStart: ordenadas[0].monthKey,
    periodEnd: ordenadas[ordenadas.length - 1].monthKey,
    monthsCount: ordenadas.length,
    dueDay: comVencimento?.dueDate ? dayOfDate(comVencimento.dueDate) : null,
    occurrences: ordenadas,
  };
}

const MESES_ABREV_ANO4 = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function mesAbrevAno4(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MESES_ABREV_ANO4[m - 1]}/${y}`;
}

/** "ago/2026 até dez/2026 · 5 meses" (ou "ago/2026 · 1 mês" pra um só mês). */
export function periodoResumoLabel(
  snapshot: Pick<MonthlyBudgetEventSnapshot, "periodStart" | "periodEnd" | "monthsCount">,
): string {
  if (snapshot.periodStart === snapshot.periodEnd) return `${mesAbrevAno4(snapshot.periodStart)} · 1 mês`;
  const meses = snapshot.monthsCount === 1 ? "mês" : "meses";
  return `${mesAbrevAno4(snapshot.periodStart)} até ${mesAbrevAno4(snapshot.periodEnd)} · ${snapshot.monthsCount} ${meses}`;
}

export function personSelecaoLabel(pessoa: PersonSelecao): string {
  return pessoa === "carlos" ? "Carlos" : pessoa === "julia" ? "Julia" : "Carlos e Julia";
}

/** Quais campos mudaram entre dois snapshots — pra destacar só o que de fato
 *  foi alterado numa edição (nome, valores, vencimento, período). */
export type EventSnapshotDiff = {
  name: boolean;
  amountCarlos: boolean;
  amountJulia: boolean;
  dueDay: boolean;
  period: boolean;
};

export function diffEventSnapshots(
  before: MonthlyBudgetEventSnapshot | null,
  after: MonthlyBudgetEventSnapshot | null,
): EventSnapshotDiff {
  if (!before || !after) {
    return { name: false, amountCarlos: false, amountJulia: false, dueDay: false, period: false };
  }
  return {
    name: before.name !== after.name,
    amountCarlos: before.amountCarlos !== after.amountCarlos,
    amountJulia: before.amountJulia !== after.amountJulia,
    dueDay: (before.dueDay ?? null) !== (after.dueDay ?? null),
    period: before.periodStart !== after.periodStart || before.periodEnd !== after.periodEnd,
  };
}

// ── Montagem dos parâmetros da RPC ───────────────────────────────────────────
// As Server Actions montam esses parâmetros e chamam supabase.rpc(...); esta
// função só formata pro shape jsonb que mb_write_*_event/mb_toggle_expense_paid
// esperam (datas de mês viram "YYYY-MM-DD", campos vazios viram "").

export type HistoryEventInput = {
  action: HistoryAction;
  entityGroupId: string | null;
  anchorEntryId: string | null;
  anchorMonthKey: string;
  editScope: EscopoEdicao | null;
  beforeSnapshot: MonthlyBudgetEventSnapshot | null;
  afterSnapshot: MonthlyBudgetEventSnapshot | null;
  affectedMonths: string[];
  metadata?: Record<string, unknown>;
};

export function historyEventToRpcPayload(input: HistoryEventInput): Record<string, unknown> {
  return {
    action: input.action,
    entity_group_id: input.entityGroupId ?? "",
    anchor_entry_id: input.anchorEntryId ?? "",
    anchor_month_key: monthKeyToDbDate(input.anchorMonthKey),
    edit_scope: input.editScope ?? "",
    before_snapshot: input.beforeSnapshot,
    after_snapshot: input.afterSnapshot,
    affected_months: input.affectedMonths.map(monthKeyToDbDate),
    metadata: input.metadata ?? {},
  };
}

// ── Mapeamento da linha crua do banco ────────────────────────────────────────

export type HistoryEventRow = {
  id: string;
  entity_kind: string;
  action: string;
  entity_group_id: string | null;
  anchor_entry_id: string | null;
  anchor_month_key: string; // date
  edit_scope: string | null;
  previous_event_id: string | null;
  occurred_at: string;
  before_snapshot: MonthlyBudgetEventSnapshot | null;
  after_snapshot: MonthlyBudgetEventSnapshot | null;
  affected_months: string[] | null; // date[]
  metadata: Record<string, unknown> | null;
};

export function mapHistoryEventRow(row: HistoryEventRow): MonthlyBudgetHistoryEvent {
  return {
    id: row.id,
    entityKind: row.entity_kind as HistoryEntityKind,
    action: row.action as HistoryAction,
    entityGroupId: row.entity_group_id,
    anchorEntryId: row.anchor_entry_id,
    anchorMonthKey: dbDateToMonthKey(row.anchor_month_key),
    editScope: (row.edit_scope as EscopoEdicao | null) || null,
    previousEventId: row.previous_event_id,
    occurredAt: row.occurred_at,
    beforeSnapshot: row.before_snapshot,
    afterSnapshot: row.after_snapshot,
    affectedMonths: (row.affected_months ?? []).map(dbDateToMonthKey),
    metadata: row.metadata ?? {},
  };
}

// ── Agrupar eventos por lançamento (entity_group_id) ─────────────────────────

export type HistoryGroupState = {
  entityGroupId: string;
  /** Do mais recente pro mais antigo. */
  events: MonthlyBudgetHistoryEvent[];
  latestEvent: MonthlyBudgetHistoryEvent;
  /** true quando o evento mais recente da cadeia é 'deleted' — o lançamento
   *  não existe mais na página principal. */
  isDeleted: boolean;
};

/**
 * Agrupa eventos pelo mesmo entity_group_id — cada grupo é a cadeia de um
 * lançamento ao longo do tempo (nunca agrupar por nome/valor/data). Eventos
 * sem entity_group_id viram grupo de 1 evento, usando o próprio id como
 * chave (não deveria acontecer na prática, mas evita perder o evento).
 */
export function groupHistoryEventsByEntity(events: MonthlyBudgetHistoryEvent[]): HistoryGroupState[] {
  const porGrupo = new Map<string, MonthlyBudgetHistoryEvent[]>();
  for (const evento of events) {
    const chave = evento.entityGroupId ?? evento.id;
    const lista = porGrupo.get(chave) ?? [];
    lista.push(evento);
    porGrupo.set(chave, lista);
  }
  return Array.from(porGrupo.entries()).map(([entityGroupId, eventosDoGrupo]) => {
    const ordenados = [...eventosDoGrupo].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return {
      entityGroupId,
      events: ordenados,
      latestEvent: ordenados[0],
      isDeleted: ordenados[0].action === "deleted",
    };
  });
}

// ── Filtros da timeline ───────────────────────────────────────────────────

export type HistoryTipoFiltro = "todos" | HistoryEntityKind;
export type HistoryAcaoFiltro = "todos" | HistoryAction;

export type HistoryFiltros = {
  tipo: HistoryTipoFiltro;
  acao: HistoryAcaoFiltro;
  pessoa: PersonFilter;
  busca: string;
  /** "" = todos os meses — casa quando o mês está em affectedMonths. */
  monthKey: string;
  /** "YYYY-MM-DD" ou "" — filtra pela data (civil, fuso Bahia) de occurred_at. */
  dataInicio: string;
  dataFim: string;
};

export const HISTORY_FILTROS_VAZIOS: HistoryFiltros = {
  tipo: "todos",
  acao: "todos",
  pessoa: "todos",
  busca: "",
  monthKey: "",
  dataInicio: "",
  dataFim: "",
};

function eventoNome(evento: MonthlyBudgetHistoryEvent): string {
  return evento.afterSnapshot?.name ?? evento.beforeSnapshot?.name ?? "";
}

function eventoValores(evento: MonthlyBudgetHistoryEvent): PersonAmounts | null {
  const snap = evento.afterSnapshot ?? evento.beforeSnapshot;
  return snap ? { amountCarlos: snap.amountCarlos, amountJulia: snap.amountJulia } : null;
}

/**
 * Aplica todos os filtros da timeline de uma vez (tipo, ação, pessoa, nome,
 * mês afetado e intervalo de data do evento). Pura — não ordena; use
 * sortHistoryByOccurredAtDesc separadamente.
 */
export function filtrarHistorico(events: MonthlyBudgetHistoryEvent[], filtros: HistoryFiltros): MonthlyBudgetHistoryEvent[] {
  return events.filter((evento) => {
    if (filtros.tipo !== "todos" && evento.entityKind !== filtros.tipo) return false;
    if (filtros.acao !== "todos" && evento.action !== filtros.acao) return false;

    if (filtros.pessoa !== "todos") {
      const valores = eventoValores(evento);
      if (!valores || !participaDoFiltro(valores, filtros.pessoa)) return false;
    }

    if (filtros.busca.trim()) {
      const termo = filtros.busca.trim().toLowerCase();
      if (!eventoNome(evento).toLowerCase().includes(termo)) return false;
    }

    if (filtros.monthKey && !evento.affectedMonths.includes(filtros.monthKey)) return false;

    if (filtros.dataInicio || filtros.dataFim) {
      const dataEvento = createdAtDateKeyBahia(evento.occurredAt);
      if (filtros.dataInicio && dataEvento < filtros.dataInicio) return false;
      if (filtros.dataFim && dataEvento > filtros.dataFim) return false;
    }

    return true;
  });
}

/** Mais recente primeiro — ordem padrão da timeline do Extrato. */
export function sortHistoryByOccurredAtDesc(events: MonthlyBudgetHistoryEvent[]): MonthlyBudgetHistoryEvent[] {
  return [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
