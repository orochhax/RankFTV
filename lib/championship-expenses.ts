// ==============================================================================
// Módulo de Despesas e DRE Operacional do Campeonato (RankFTV)
// Cálculos matemáticos puros, auditoria de margens e cobertura de caixa.
// ==============================================================================

export const CATEGORIAS_DESPESA_PADRAO = [
  "Premiação",
  "Arbitragem",
  "Quadra & Estrutura",
  "Kits & Camisas",
  "Alimentação & Hidratação",
  "Marketing & Mídia",
  "Outros",
] as const;

export type ChampionshipExpenseStatus = "pendente" | "pago";

export type ChampionshipExpense = {
  id: string;
  championshipId: string;
  organizadorId: string;
  categoria: string;
  nome: string;
  valor: number;
  status: ChampionshipExpenseStatus;
  dataVencimento: string; // "YYYY-MM-DD"
  dataPagamento: string | null;
  observacao: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseSummary = {
  total: number;
  totalPagas: number;
  totalPendentes: number;
  count: number;
  countPagas: number;
  countPendentes: number;
  porCategoria: Array<{
    categoria: string;
    total: number;
    count: number;
    percentual: number;
  }>;
};

export type ChampionshipDre = {
  vendasBrutas: number;
  taxasPlataforma: number;
  receitaLiquida: number;
  despesasTotais: number;
  despesasPagas: number;
  despesasPendentes: number;
  lucroLiquidoReal: number;
  lucroRealPago: number;
  margemLucroPercentual: number;
  status: "lucro" | "empate" | "prejuizo";
};

export type CashflowCoverage = {
  saldoDisponivel: number;
  despesasPendentes: number;
  saldoAposDespesas: number;
  coberto: boolean;
  diferenca: number;
  percentualCobertura: number;
};

/**
 * Normaliza número para duas casas decimais evitando imprecisões de ponto flutuante.
 */
export function roundCurrency(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula o sumário completo de uma lista de despesas.
 */
export function calculateExpenseSummary(expenses: ChampionshipExpense[]): ExpenseSummary {
  let total = 0;
  let totalPagas = 0;
  let totalPendentes = 0;
  let countPagas = 0;
  let countPendentes = 0;

  const catMap = new Map<string, { total: number; count: number }>();

  for (const exp of expenses) {
    const v = roundCurrency(Number(exp.valor) || 0);
    total = roundCurrency(total + v);

    if (exp.status === "pago") {
      totalPagas = roundCurrency(totalPagas + v);
      countPagas += 1;
    } else {
      totalPendentes = roundCurrency(totalPendentes + v);
      countPendentes += 1;
    }

    const catKey = (exp.categoria || "Outros").trim();
    const cur = catMap.get(catKey) ?? { total: 0, count: 0 };
    cur.total = roundCurrency(cur.total + v);
    cur.count += 1;
    catMap.set(catKey, cur);
  }

  const porCategoria = Array.from(catMap.entries())
    .map(([categoria, stat]) => ({
      categoria,
      total: stat.total,
      count: stat.count,
      percentual: total > 0 ? Math.round((stat.total / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    total,
    totalPagas,
    totalPendentes,
    count: expenses.length,
    countPagas,
    countPendentes,
    porCategoria,
  };
};

/**
 * Calcula o DRE consolidado (Vendas - Taxas = Líquido - Despesas = Lucro Real).
 */
export function calculateChampionshipDre(input: {
  vendasBrutas: number;
  taxasPlataforma: number;
  receitaLiquida: number;
  expenses: ChampionshipExpense[];
}): ChampionshipDre {
  const vendasBrutas = roundCurrency(Math.max(0, input.vendasBrutas));
  const taxasPlataforma = roundCurrency(Math.max(0, input.taxasPlataforma));
  const receitaLiquida = roundCurrency(Math.max(0, input.receitaLiquida));

  const summary = calculateExpenseSummary(input.expenses);
  const despesasTotais = summary.total;
  const despesasPagas = summary.totalPagas;
  const despesasPendentes = summary.totalPendentes;

  const lucroLiquidoReal = roundCurrency(receitaLiquida - despesasTotais);
  const lucroRealPago = roundCurrency(receitaLiquida - despesasPagas);

  const margemLucroPercentual = vendasBrutas > 0
    ? Math.round((lucroLiquidoReal / vendasBrutas) * 1000) / 10
    : 0;

  let status: "lucro" | "empate" | "prejuizo" = "empate";
  if (lucroLiquidoReal > 0.009) {
    status = "lucro";
  } else if (lucroLiquidoReal < -0.009) {
    status = "prejuizo";
  }

  return {
    vendasBrutas,
    taxasPlataforma,
    receitaLiquida,
    despesasTotais,
    despesasPagas,
    despesasPendentes,
    lucroLiquidoReal,
    lucroRealPago,
    margemLucroPercentual,
    status,
  };
}

/**
 * Avalia se o saldo liberado/disponível na carteira cobre as despesas a vencer.
 */
export function calculateCashflowCoverage(input: {
  saldoDisponivel: number;
  despesasPendentes: number;
}): CashflowCoverage {
  const saldoDisponivel = roundCurrency(Math.max(0, input.saldoDisponivel));
  const despesasPendentes = roundCurrency(Math.max(0, input.despesasPendentes));

  const saldoAposDespesas = roundCurrency(saldoDisponivel - despesasPendentes);
  const coberto = saldoDisponivel >= despesasPendentes;
  const diferenca = roundCurrency(Math.abs(saldoDisponivel - despesasPendentes));

  const percentualCobertura = despesasPendentes > 0
    ? Math.min(100, Math.round((saldoDisponivel / despesasPendentes) * 1000) / 10)
    : 100;

  return {
    saldoDisponivel,
    despesasPendentes,
    saldoAposDespesas,
    coberto,
    diferenca,
    percentualCobertura,
  };
}

/**
 * Calcula DRE e cobertura de caixa usando os mesmos critérios nas páginas de Financeiro e Despesas.
 * `lifetimeReceitaLiquida` deve somar `wallet.totalNet + wallet.withdrawn` para não transformar saques já realizados em taxa.
 */
export function computeDreAndCoverageFromWallet(input: {
  totalInscricoesBruto: number;
  totalPlateiaBruto: number;
  lifetimeReceitaLiquida: number | null;
  saldoSacavelAgora: number;
  expenses: ChampionshipExpense[];
}): { dre: ChampionshipDre; coverage: CashflowCoverage } {
  const vendasBrutas = roundCurrency(
    Math.max(0, Number(input.totalInscricoesBruto) || 0) +
      Math.max(0, Number(input.totalPlateiaBruto) || 0),
  );
  const receitaLiquida =
    input.lifetimeReceitaLiquida !== null && Number.isFinite(input.lifetimeReceitaLiquida)
      ? roundCurrency(Math.max(0, input.lifetimeReceitaLiquida))
      : roundCurrency(vendasBrutas > 0 ? vendasBrutas * 0.92 : 0);
  const taxasPlataforma = roundCurrency(Math.max(0, vendasBrutas - receitaLiquida));

  const dre = calculateChampionshipDre({
    vendasBrutas,
    taxasPlataforma,
    receitaLiquida,
    expenses: input.expenses,
  });

  const coverage = calculateCashflowCoverage({
    saldoDisponivel: input.saldoSacavelAgora,
    despesasPendentes: dre.despesasPendentes,
  });

  return { dre, coverage };
}

/**
 * Retorna data "YYYY-MM-DD" no fuso oficial de Brasília (America/Sao_Paulo).
 */
export function getSaoPauloDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Soma N dias civis a uma data YYYY-MM-DD sem sofrer desvio de timezone UTC do servidor.
 */
export function addDaysSaoPauloDateString(dateStr: string, days: number): string {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr;
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Converte strings monetárias em formato PT-BR ("1.500,50" / "250,00") ou US ("1500.50") para número.
 */
export function parseCurrencyBR(raw: string): number {
  const cleaned = raw.replace(/[R$\s]/g, "").trim();
  if (!cleaned) return Number.NaN;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    return lastComma > lastDot
      ? Number(cleaned.replace(/\./g, "").replace(",", "."))
      : Number(cleaned.replace(/,/g, ""));
  }
  if (cleaned.includes(",")) {
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }
  return Number(cleaned);
}

/**
 * Diferença em dias civis entre uma data YYYY-MM-DD e hoje (America/Sao_Paulo).
 * Retorna negativo se atrasada, 0 se hoje, positivo se futura.
 */
export function daysUntilDue(dataVencimento: string, now: Date = new Date()): number {
  const todayStr = getSaoPauloDateString(now);
  const [y1, m1, d1] = todayStr.split("-").map(Number);
  const [y2, m2, d2] = dataVencimento.split("-").map(Number);

  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;

  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  const diffMs = t2 - t1;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function isExpenseOverdue(dataVencimento: string, now: Date = new Date()): boolean {
  return daysUntilDue(dataVencimento, now) < 0;
}

export function isExpenseDueSoon(
  dataVencimento: string,
  now: Date = new Date(),
  diasLimite = 3,
): boolean {
  const diff = daysUntilDue(dataVencimento, now);
  return diff >= 0 && diff <= diasLimite;
}

export type ValidatedExpenseInput = {
  nome: string;
  categoria: string;
  valor: number;
  status: ChampionshipExpenseStatus;
  dataVencimento: string;
  observacao: string | null;
};

function isValidIsoCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parts = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return (
    d.getUTCFullYear() === parts[0] &&
    d.getUTCMonth() === parts[1] - 1 &&
    d.getUTCDate() === parts[2]
  );
}

/**
 * Validação rigorosa de payload para criação/edição de despesa.
 */
export function validateExpenseInput(raw: unknown): {
  valid: boolean;
  errors: string[];
  data?: ValidatedExpenseInput;
} {
  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Dados inválidos"] };
  }

  const errors: string[] = [];
  const obj = raw as Record<string, unknown>;

  const nome = typeof obj.nome === "string" ? obj.nome.trim() : "";
  if (nome.length < 2 || nome.length > 120) {
    errors.push("O nome da despesa deve ter entre 2 e 120 caracteres.");
  }

  const categoria = typeof obj.categoria === "string" ? obj.categoria.trim() : "";
  if (categoria.length < 2 || categoria.length > 60) {
    errors.push("A categoria deve ter entre 2 e 60 caracteres.");
  }

  const rawValor = Number(obj.valor);
  const valor = roundCurrency(rawValor);
  if (!Number.isFinite(rawValor) || valor < 0.01 || valor > 10_000_000) {
    errors.push("O valor deve ser de no mínimo R$ 0,01 e menor que R$ 10.000.000,00.");
  }

  const status = obj.status === "pago" ? "pago" : "pendente";

  const dataVencimento = typeof obj.dataVencimento === "string" ? obj.dataVencimento.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataVencimento)) {
    errors.push("Data de vencimento inválida. Use o formato YYYY-MM-DD.");
  } else if (!isValidIsoCalendarDate(dataVencimento)) {
    errors.push("Data de vencimento não existe no calendário.");
  }

  const observacao = typeof obj.observacao === "string" && obj.observacao.trim().length > 0
    ? obj.observacao.trim().slice(0, 500)
    : null;

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: { nome, categoria, valor, status, dataVencimento, observacao },
  };
}
