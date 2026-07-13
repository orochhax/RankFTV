// Helpers do controle financeiro pessoal (/admin/gastos). Tabela isolada
// (personal_finance_entries) — nada aqui toca no financeiro de campeonatos/arenas.

import { formatBRL } from "@/lib/format";

export type Person = "carlos" | "julia";
export type PersonFilter = "todos" | Person;
/** Valor do form de novo lançamento — "carlos_e_julia" nunca é salvo em `person`; vira 2 linhas. */
export type PersonSelecao = Person | "carlos_e_julia";
export type EntryType = "gasto" | "renda" | "investimento";
export type Bank = "inter" | "c6" | "mercado_pago" | "nubank" | "vale";
export type PaymentMethod = "credito" | "debito" | "pix";
/** Regra de rendimento — só relevante quando type === "investimento". */
export type InvestmentYieldMode = "single_cdi" | "mercado_pago_tiered";
/** Regra de qual dia do mês um lançamento fixo cai — só relevante quando isRecurring === true. */
export type RecurrenceDayMode = "calendar_day" | "business_day";

export type PersonalFinanceEntry = {
  id: string;
  person: Person;
  name: string;
  category: string;
  entryDate: string; // "YYYY-MM-DD"
  amount: number;
  type: EntryType;
  bank: Bank;
  paymentMethod: PaymentMethod;
  isInstallment: boolean;
  installmentGroupId: string | null;
  installmentNumber: number;
  installmentTotal: number;
  // Fixo/recorrente: se true, o lançamento vale todo mês a partir de entryDate,
  // pra sempre (ex: salário). Não gera linhas novas — é aplicado "virtualmente"
  // em cada mês na hora de agregar (ver resolveEntryForMonth). Exceções pontuais
  // (um mês diferente/pulado) ficam em personal_finance_recurring_overrides.
  isRecurring: boolean;
  // Regra de qual dia do mês o fixo cai. Sempre null quando isRecurring é false.
  recurrenceDayMode: RecurrenceDayMode | null;
  // calendar_day: 1–31 (dia do mês, clampado no último dia se o mês for curto).
  // business_day: 1–23 (Nº-ésimo dia útil do mês). Sempre null quando isRecurring é false.
  recurrenceDay: number | null;
  // Regra de rendimento do investimento. Sempre null pra type !== "investimento".
  investmentYieldMode: InvestmentYieldMode | null;
  // % do CDI, usado só no modo single_cdi (ex: 100, 105, 110, 120).
  investmentCdiPercent: number | null;
  // Liga os dois lançamentos criados juntos a partir da opção "Carlos e Julia"
  // no formulário. Cada linha continua totalmente independente (próprio id,
  // próprios overrides) — isso só serve pra descoberta/edição conjunta na UI.
  sharedEntryGroupId: string | null;
};

/** Exceção mensal de um lançamento fixo. Campo null = usa o valor original nesse campo. */
export type RecurringOverride = {
  id: string;
  recurringEntryId: string;
  monthKey: string; // "YYYY-MM"
  name: string | null;
  category: string | null;
  entryDate: string | null;
  amount: number | null;
  type: EntryType | null;
  bank: Bank | null;
  paymentMethod: PaymentMethod | null;
  person: Person | null;
  recurrenceDayMode: RecurrenceDayMode | null;
  recurrenceDay: number | null;
  investmentYieldMode: InvestmentYieldMode | null;
  investmentCdiPercent: number | null;
  deleted: boolean;
};

export type PersonalFinanceCategory = {
  id: string;
  name: string;
  active: boolean;
};

export const SEM_CATEGORIA = "Sem categoria";

const MESES_ABREV = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const MESES_LONGOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Data de hoje no fuso de Brasília, como "YYYY-MM-DD". */
export function hojeISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

export function monthKeyNow(): string {
  return monthKeyOf(hojeISO());
}

function monthIndex(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  return y * 12 + (m - 1);
}

/** "2026-07" + delta meses → "YYYY-MM" (delta pode ser negativo). */
export function addMonthsToKey(monthKey: string, delta: number): string {
  const total = monthIndex(monthKey) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/** Avança uma data em N meses, preservando o dia quando possível (clampa no último dia do mês destino). */
export function addMonthsToDate(iso: string, delta: number): string {
  const [, , d] = iso.split("-").map(Number);
  const alvo = addMonthsToKey(monthKeyOf(iso), delta);
  const [ny, nm] = alvo.split("-").map(Number);
  const ultimoDia = new Date(ny, nm, 0).getDate();
  const dia = Math.min(d, ultimoDia);
  return `${alvo}-${String(dia).padStart(2, "0")}`;
}

// ── Datas (dia a dia) — usadas pelo dia útil do lançamento fixo e reaproveitadas
// por lib/personal-finance-investments.ts (fonte única, evita duplicar/divergir). ──

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Soma (ou subtrai) N dias a uma data local, sem passar por UTC (evita off-by-one). */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

/** Segunda a sexta. Feriados não são considerados (estimativa — ver disclaimers do módulo de investimentos). */
export function isBusinessDay(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return dow >= 1 && dow <= 5;
}

export function nextBusinessDay(iso: string): string {
  let d = addDays(iso, 1);
  while (!isBusinessDay(d)) d = addDays(d, 1);
  return d;
}

export function lastDayOfMonthISO(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${monthKey}-${pad2(last)}`;
}

/**
 * O Nº-ésimo dia útil (segunda a sexta) do mês `monthKey`, 1-indexado. Se o
 * mês tiver menos dias úteis que `position`, retorna o último dia útil do mês
 * (nunca "vaza" pro mês seguinte). Timezone-safe: usa Date local (y, m, d),
 * nunca parsing de string ISO via UTC.
 */
export function nthBusinessDayOfMonth(monthKey: string, position: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const totalDias = new Date(y, m, 0).getDate();

  let contador = 0;
  let ultimoUtil = `${monthKey}-01`;
  for (let dia = 1; dia <= totalDias; dia++) {
    const iso = `${monthKey}-${pad2(dia)}`;
    if (isBusinessDay(iso)) {
      contador++;
      ultimoUtil = iso;
      if (contador === position) return iso;
    }
  }
  return ultimoUtil;
}

/**
 * Data efetiva de um lançamento fixo num mês, segundo a regra de recorrência.
 * calendar_day usa o dia escolhido, clampado no último dia do mês (ex: dia 31
 * em fevereiro vira o último dia de fevereiro). business_day usa o Nº-ésimo
 * dia útil (varia mês a mês, nunca é sempre o mesmo número de dia corrido).
 * Sem `dayMode`/`day` (fixos legados, se algum dia existir), cai no fallback
 * de preservar o dia original (mesmo comportamento de antes desta função).
 */
export function computeEffectiveDateForMonth(
  dayMode: RecurrenceDayMode | null,
  day: number | null,
  fallbackEntryDate: string,
  monthKey: string,
): string {
  if (dayMode === "business_day" && day != null) {
    return nthBusinessDayOfMonth(monthKey, day);
  }
  if (dayMode === "calendar_day" && day != null) {
    const [y, m] = monthKey.split("-").map(Number);
    const ultimoDia = new Date(y, m, 0).getDate();
    return `${monthKey}-${pad2(Math.min(day, ultimoDia))}`;
  }
  const delta = monthIndex(monthKey) - monthIndex(monthKeyOf(fallbackEntryDate));
  return addMonthsToDate(fallbackEntryDate, delta);
}

/**
 * Divide um valor total entre Carlos e Julia, sem perder nem criar centavo.
 * Carlos recebe a metade arredondada pra baixo; Julia recebe o restante —
 * garante soma exata mesmo com centavo indivisível (ex: R$301,01 → 150,50/150,51).
 */
export function splitAmountEqually(totalAmount: number): { carlos: number; julia: number } {
  const totalCents = Math.round(totalAmount * 100);
  const carlosCents = Math.floor(totalCents / 2);
  const juliaCents = totalCents - carlosCents;
  return { carlos: carlosCents / 100, julia: juliaCents / 100 };
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MESES_ABREV[m - 1]}/${String(y).slice(2)}`;
}

/**
 * Converte um valor digitado no formato BR ("2.212,50", "2.212" ou "50,00")
 * pra number. Ponto é sempre separador de milhar, vírgula é sempre decimal —
 * mesma convenção do placeholder "0,00" dos campos de valor.
 */
export function parseBRLInput(raw: string): number {
  const normalized = raw.trim().replace(/[^\d,.-]/g, "");
  if (!normalized) return NaN;

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma >= 0) {
    const integer = normalized.slice(0, lastComma).replace(/[^\d-]/g, "");
    const decimal = normalized.slice(lastComma + 1).replace(/\D/g, "");
    return parseFloat(`${integer || "0"}.${decimal}`);
  }

  if (lastDot >= 0) {
    const decimalDigits = normalized.length - lastDot - 1;
    if (decimalDigits > 0 && decimalDigits <= 2) {
      const integer = normalized.slice(0, lastDot).replace(/[^\d-]/g, "");
      const decimal = normalized.slice(lastDot + 1).replace(/\D/g, "");
      return parseFloat(`${integer || "0"}.${decimal}`);
    }
  }

  return parseFloat(normalized.replace(/[^\d-]/g, ""));
}

/** Inverso de parseBRLInput — pra preencher um <input> de valor com o formato BR ("2.212,50"). */
export function formatBRLInput(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "Julho/2026" — usado nos títulos de grupo do extrato. */
export function monthLabelLong(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MESES_LONGOS[m - 1]}/${y}`;
}

export function filterByPerson(
  entries: PersonalFinanceEntry[],
  filtro: PersonFilter,
): PersonalFinanceEntry[] {
  if (filtro === "todos") return entries;
  return entries.filter((e) => e.person === filtro);
}

// ── Resolução de overrides ──────────────────────────────────────────────────

export function buildOverrideMap(overrides: RecurringOverride[]): Map<string, RecurringOverride> {
  const map = new Map<string, RecurringOverride>();
  for (const o of overrides) map.set(`${o.recurringEntryId}|${o.monthKey}`, o);
  return map;
}

/**
 * Resolve um lançamento no contexto de um mês específico. Pra lançamentos
 * normais/parcelas, só existe no próprio mês. Pra fixos, projeta a data pro
 * mês (preservando o dia) e aplica o override daquele mês, se houver.
 * Retorna null quando o lançamento não vale nesse mês (fora do período, ou
 * override com deleted=true).
 */
export function resolveEntryForMonth(
  entry: PersonalFinanceEntry,
  monthKey: string,
  overrideMap: Map<string, RecurringOverride>,
): PersonalFinanceEntry | null {
  const mesInicio = monthKeyOf(entry.entryDate);

  if (!entry.isRecurring) {
    return mesInicio === monthKey ? entry : null;
  }

  if (monthKey < mesInicio) return null;

  const override = overrideMap.get(`${entry.id}|${monthKey}`);
  if (override?.deleted) return null;

  const dataProjetada = computeEffectiveDateForMonth(entry.recurrenceDayMode, entry.recurrenceDay, entry.entryDate, monthKey);
  if (!override) return { ...entry, entryDate: dataProjetada };

  return {
    ...entry,
    name:                  override.name ?? entry.name,
    category:              override.category ?? entry.category,
    entryDate:             override.entryDate ?? dataProjetada,
    amount:                override.amount ?? entry.amount,
    type:                  override.type ?? entry.type,
    bank:                  override.bank ?? entry.bank,
    paymentMethod:         override.paymentMethod ?? entry.paymentMethod,
    person:                override.person ?? entry.person,
    recurrenceDayMode:     override.recurrenceDayMode ?? entry.recurrenceDayMode,
    recurrenceDay:         override.recurrenceDay ?? entry.recurrenceDay,
    investmentYieldMode:   override.investmentYieldMode ?? entry.investmentYieldMode,
    investmentCdiPercent:  override.investmentCdiPercent ?? entry.investmentCdiPercent,
  };
}

/** Todos os lançamentos "efetivos" (já com overrides aplicados) que valem num mês. */
export function resolvedEntriesForMonth(
  entries: PersonalFinanceEntry[],
  overrideMap: Map<string, RecurringOverride>,
  monthKey: string,
): PersonalFinanceEntry[] {
  const out: PersonalFinanceEntry[] = [];
  for (const e of entries) {
    const resolved = resolveEntryForMonth(e, monthKey, overrideMap);
    if (resolved) out.push(resolved);
  }
  return out;
}

export type ResumoFinanceiroMes = {
  monthKey: string;
  renda: number;
  gastos: number;
  resultado: number;
};

/** Resumo do mês: renda - gastos. Investimentos não entram nessa conta. */
export function resumoFinanceiroDoMes(
  entries: PersonalFinanceEntry[],
  overrides: RecurringOverride[],
  monthKey: string,
  filtro: PersonFilter = "todos",
): ResumoFinanceiroMes {
  const overrideMap = buildOverrideMap(overrides);
  const doMes = resolvedEntriesForMonth(entries, overrideMap, monthKey)
    .filter((e) => filtro === "todos" || e.person === filtro);
  const renda = doMes.filter((e) => e.type === "renda").reduce((s, e) => s + e.amount, 0);
  const gastos = doMes.filter((e) => e.type === "gasto").reduce((s, e) => s + e.amount, 0);
  return { monthKey, renda, gastos, resultado: renda - gastos };
}

export function earliestMonthKey(entries: PersonalFinanceEntry[]): string | null {
  if (entries.length === 0) return null;
  return entries.reduce((min, e) => {
    const mk = monthKeyOf(e.entryDate);
    return mk < min ? mk : min;
  }, monthKeyOf(entries[0].entryDate));
}

function somaMes(
  entries: PersonalFinanceEntry[],
  overrideMap: Map<string, RecurringOverride>,
  type: EntryType,
  monthKey: string,
): number {
  return resolvedEntriesForMonth(entries, overrideMap, monthKey)
    .filter((e) => e.type === type)
    .reduce((s, e) => s + e.amount, 0);
}

/** Soma acumulada até a data informada, mês a mês (fixos contam do início até "ateISO", com overrides aplicados). */
function somaAcumulada(
  entries: PersonalFinanceEntry[],
  overrideMap: Map<string, RecurringOverride>,
  type: EntryType,
  ateISO: string,
): number {
  const mesLimite = monthKeyOf(ateISO);
  const inicio = earliestMonthKey(entries);
  if (!inicio || inicio > mesLimite) return 0;

  let total = 0;
  for (let mk = inicio; mk <= mesLimite; mk = addMonthsToKey(mk, 1)) {
    total += somaMes(entries, overrideMap, type, mk);
  }
  return total;
}

/** Soma acumulada de investimentos até a data informada. */
export function valorInvestidoAcumulado(
  entries: PersonalFinanceEntry[],
  overrides: RecurringOverride[],
  hojeIso: string,
): number {
  return somaAcumulada(entries, buildOverrideMap(overrides), "investimento", hojeIso);
}

/** Caixa acumulado: renda - gasto - investimento, até a data informada. */
export function caixaAcumulado(
  entries: PersonalFinanceEntry[],
  overrides: RecurringOverride[],
  hojeIso: string,
): number {
  const overrideMap = buildOverrideMap(overrides);
  const renda = somaAcumulada(entries, overrideMap, "renda", hojeIso);
  const gasto = somaAcumulada(entries, overrideMap, "gasto", hojeIso);
  const invest = somaAcumulada(entries, overrideMap, "investimento", hojeIso);
  return renda - gasto - invest;
}

export type SituacaoStatus = "boa" | "atencao" | "critica";
export type Situacao = { status: SituacaoStatus; motivo: string };

/** Classifica a situação financeira do mês atual. Ver regra em ftv.md/tarefa original. */
export function calcularSituacao(
  entries: PersonalFinanceEntry[],
  overrides: RecurringOverride[],
  hojeIso: string,
): Situacao {
  const overrideMap = buildOverrideMap(overrides);
  const mesAtual = monthKeyOf(hojeIso);
  const rendaMes = somaMes(entries, overrideMap, "renda", mesAtual);
  const gastosMes = somaMes(entries, overrideMap, "gasto", mesAtual);
  const investMes = somaMes(entries, overrideMap, "investimento", mesAtual);
  const caixa = caixaAcumulado(entries, overrides, hojeIso);

  const taxaGastos = rendaMes > 0 ? gastosMes / rendaMes : gastosMes > 0 ? Infinity : 0;
  const taxaInvestimento = rendaMes > 0 ? investMes / rendaMes : 0;

  const mediaGastos3 =
    ([0, -1, -2] as const)
      .map((d) => somaMes(entries, overrideMap, "gasto", addMonthsToKey(mesAtual, d)))
      .reduce((s, v) => s + v, 0) / 3;
  const mesesDeCaixa = mediaGastos3 > 0 ? caixa / mediaGastos3 : caixa > 0 ? Infinity : 0;

  const pctGastos = Number.isFinite(taxaGastos) ? Math.round(taxaGastos * 100) : null;
  const caixaTxt = Number.isFinite(mesesDeCaixa) ? mesesDeCaixa.toFixed(1) : "∞";
  const mesLabel = (v: string) => (v === "1.0" ? "mês" : "meses");

  const critica = (rendaMes <= 0 && gastosMes > 0) || taxaGastos > 0.9 || caixa < 0;
  if (critica) {
    if (caixa < 0) return { status: "critica", motivo: `Caixa negativo (${formatBRL(caixa)}).` };
    if (rendaMes <= 0 && gastosMes > 0) return { status: "critica", motivo: "Sem renda registrada este mês, mas com gastos lançados." };
    return { status: "critica", motivo: `Gastos em ${pctGastos}% da renda do mês.` };
  }

  const boa = taxaGastos <= 0.7 && taxaInvestimento >= 0.1 && mesesDeCaixa >= 1;
  if (boa) {
    return {
      status: "boa",
      motivo: `Gastos em ${pctGastos}% da renda e caixa cobre ${caixaTxt} ${mesLabel(caixaTxt)}.`,
    };
  }

  return {
    status: "atencao",
    motivo: `Gastos em ${pctGastos ?? 0}% da renda e caixa cobre ${caixaTxt} ${mesLabel(caixaTxt)}.`,
  };
}

export type MonthlyGastoPoint = {
  monthKey: string;
  label: string;
  carlos: number;
  julia: number;
  total: number;
  isFuture: boolean;
};

/**
 * Gasto total por mês: mês anterior + mês atual + N meses de horizonte futuro.
 * Meses futuros só somam parcelas já geradas e lançamentos fixos (recorrentes) —
 * nunca uma média inventada.
 */
export function gastoMensal(
  entries: PersonalFinanceEntry[],
  overrides: RecurringOverride[],
  hojeIso: string,
  horizonteMeses: number,
): MonthlyGastoPoint[] {
  const overrideMap = buildOverrideMap(overrides);
  const mesAtual = monthKeyOf(hojeIso);
  const meses = [addMonthsToKey(mesAtual, -1), mesAtual];
  for (let i = 1; i <= horizonteMeses; i++) meses.push(addMonthsToKey(mesAtual, i));

  return meses.map((mk) => {
    const doMes = resolvedEntriesForMonth(entries, overrideMap, mk).filter((e) => e.type === "gasto");
    const carlos = doMes.filter((e) => e.person === "carlos").reduce((s, e) => s + e.amount, 0);
    const julia = doMes.filter((e) => e.person === "julia").reduce((s, e) => s + e.amount, 0);
    return { monthKey: mk, label: monthLabel(mk), carlos, julia, total: carlos + julia, isFuture: mk > mesAtual };
  });
}

export type CategoriaGasto = { categoria: string; carlos: number; julia: number; total: number };

/** Gastos do mês em análise, agrupados por categoria e ordenados do maior pro menor. */
export function categoriasDoMes(
  entries: PersonalFinanceEntry[],
  overrides: RecurringOverride[],
  monthKey: string,
): CategoriaGasto[] {
  const overrideMap = buildOverrideMap(overrides);
  const doMes = resolvedEntriesForMonth(entries, overrideMap, monthKey).filter((e) => e.type === "gasto");
  const map = new Map<string, CategoriaGasto>();
  for (const e of doMes) {
    const cur = map.get(e.category) ?? { categoria: e.category, carlos: 0, julia: 0, total: 0 };
    if (e.person === "carlos") cur.carlos += e.amount; else cur.julia += e.amount;
    cur.total += e.amount;
    map.set(e.category, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Lançamentos de uma categoria que valem num mês específico (inclui fixos recorrentes já resolvidos). */
export function lancamentosDaCategoriaNoMes(
  entries: PersonalFinanceEntry[],
  overrides: RecurringOverride[],
  monthKey: string,
  categoria: string,
): PersonalFinanceEntry[] {
  const overrideMap = buildOverrideMap(overrides);
  return resolvedEntriesForMonth(entries, overrideMap, monthKey)
    .filter((e) => e.type === "gasto" && e.category === categoria)
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate));
}

// ── Extrato ──────────────────────────────────────────────────────────────────

export type ExtratoFiltros = {
  pessoa: PersonFilter;
  tipo: "todos" | EntryType;
  dataInicio: string | null; // "YYYY-MM-DD"
  dataFim: string | null;
  busca: string;
};

export type ExtratoItem = {
  entry: PersonalFinanceEntry; // já resolvido (data projetada/override aplicado)
  monthKey: string;
  hasOverride: boolean;
};

export type ExtratoMes = {
  monthKey: string;
  label: string; // "Julho/2026"
  itens: ExtratoItem[];
  totalRenda: number;
  totalGasto: number;
  totalInvestido: number;
  saldo: number;
};

/** Extrato agrupado por mês (mais recente primeiro), com filtros próprios — independentes do dashboard. */
export function extratoPorMes(
  entries: PersonalFinanceEntry[],
  overrides: RecurringOverride[],
  filtros: ExtratoFiltros,
  hojeIso: string,
): ExtratoMes[] {
  const overrideMap = buildOverrideMap(overrides);
  const porPessoa = filterByPerson(entries, filtros.pessoa);
  if (porPessoa.length === 0) return [];

  const inicio = earliestMonthKey(porPessoa) ?? monthKeyOf(hojeIso);
  const fim = [monthKeyOf(hojeIso), ...porPessoa.map((e) => monthKeyOf(e.entryDate))]
    .reduce((max, mk) => (mk > max ? mk : max));

  const busca = filtros.busca.trim().toLowerCase();
  const meses: ExtratoMes[] = [];

  for (let mk = inicio; mk <= fim; mk = addMonthsToKey(mk, 1)) {
    let itens: ExtratoItem[] = resolvedEntriesForMonth(porPessoa, overrideMap, mk).map((entry) => ({
      entry,
      monthKey: mk,
      hasOverride: overrideMap.has(`${entry.id}|${mk}`),
    }));

    if (filtros.tipo !== "todos") itens = itens.filter((it) => it.entry.type === filtros.tipo);
    if (filtros.dataInicio) itens = itens.filter((it) => it.entry.entryDate >= filtros.dataInicio!);
    if (filtros.dataFim) itens = itens.filter((it) => it.entry.entryDate <= filtros.dataFim!);
    if (busca) {
      itens = itens.filter(
        (it) => it.entry.name.toLowerCase().includes(busca) || it.entry.category.toLowerCase().includes(busca),
      );
    }
    if (itens.length === 0) continue;

    itens.sort((a, b) => b.entry.entryDate.localeCompare(a.entry.entryDate));
    const totalRenda = itens.filter((it) => it.entry.type === "renda").reduce((s, it) => s + it.entry.amount, 0);
    const totalGasto = itens.filter((it) => it.entry.type === "gasto").reduce((s, it) => s + it.entry.amount, 0);
    const totalInvestido = itens.filter((it) => it.entry.type === "investimento").reduce((s, it) => s + it.entry.amount, 0);

    meses.push({
      monthKey: mk,
      label: monthLabelLong(mk),
      itens,
      totalRenda,
      totalGasto,
      totalInvestido,
      saldo: totalRenda - totalGasto - totalInvestido,
    });
  }

  return meses.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

export const BANK_LABEL: Record<Bank, string> = {
  inter: "Inter",
  c6: "C6",
  mercado_pago: "Mercado Pago",
  nubank: "Nubank",
  vale: "Vale",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  credito: "Crédito",
  debito: "Débito",
  pix: "Pix",
};

export const TYPE_LABEL: Record<EntryType, string> = {
  gasto: "Gasto",
  renda: "Renda",
  investimento: "Investimento",
};
