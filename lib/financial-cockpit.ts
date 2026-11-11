import {
  daysUntilDue,
  getSaoPauloDateString,
  roundCurrency,
  type CashflowCoverage,
  type ChampionshipDre,
  type ChampionshipExpense,
} from "./championship-expenses";

export type FinancialHealthBand = "excelente" | "estavel" | "atencao" | "critico";
export type FinancialHealthTone = "emerald" | "blue" | "amber" | "rose";

export type FinancialHealthPillar = {
  id: "margem" | "cobertura" | "pontualidade" | "conversao";
  label: string;
  score: number;
  max: number;
  detail: string;
  tone: FinancialHealthTone;
};

export type FinancialHealthInsight = {
  id: string;
  severity: "ok" | "warn" | "danger";
  title: string;
  description: string;
  actionTab?: "visao" | "carteira" | "despesas" | "relatorios" | "taxas";
};

export type FinancialHealthResult = {
  score: number;
  band: FinancialHealthBand;
  bandLabel: string;
  tone: FinancialHealthTone;
  pillars: FinancialHealthPillar[];
  insights: FinancialHealthInsight[];
};

export type FinancialHealthInput = {
  dre: ChampionshipDre;
  coverage: CashflowCoverage;
  expenses: ChampionshipExpense[];
  paidCount: number;
  pendingCount: number;
  refundedCount: number;
  hasPixKey: boolean;
  isElite: boolean;
  now?: Date;
};

function clampInt(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Math.round(val)));
}

/**
 * Calcula o Score Inteligente de Saúde Financeira (0 a 100) do campeonato
 * combinando margem líquida, cobertura de caixa, pontualidade das contas e
 * eficiência de conversão das cobranças.
 */
export function computeFinancialHealthScore(
  input: FinancialHealthInput,
): FinancialHealthResult {
  const { dre, coverage, expenses, paidCount, pendingCount, refundedCount, hasPixKey, isElite } = input;
  const now = input.now ?? new Date();

  const insights: FinancialHealthInsight[] = [];

  // 1. Pilar Margem Líquida Real (0 a 30 pontos)
  let margemScore = 0;
  let margemDetail = "Aguardando primeiras vendas pagas";
  let margemTone: FinancialHealthTone = "blue";

  if (dre.receitaLiquida <= 0 && dre.despesasTotais <= 0) {
    margemScore = 18; // Estado neutro inicial antes das vendas
    margemTone = "blue";
  } else if (dre.receitaLiquida <= 0 && dre.despesasTotais > 0) {
    margemScore = 0;
    margemDetail = "Despesas lançadas sem receita líquida ainda";
    margemTone = "rose";
  } else {
    const marginRatio = dre.lucroLiquidoReal / dre.receitaLiquida;
    if (marginRatio >= 0.45) {
      margemScore = 30;
      margemTone = "emerald";
    } else if (marginRatio >= 0.2) {
      margemScore = clampInt(18 + ((marginRatio - 0.2) / 0.25) * 12, 18, 30);
      margemTone = "blue";
    } else if (marginRatio > 0) {
      margemScore = clampInt(6 + (marginRatio / 0.2) * 12, 6, 17);
      margemTone = "amber";
    } else {
      margemScore = 0;
      margemTone = "rose";
    }
    margemDetail = `${dre.margemLucroPercentual}% de margem líquida sobre entradas`;
  }

  // 2. Pilar Cobertura de Caixa vs Contas Pendentes (0 a 30 pontos)
  let coberturaScore = 30;
  let coberturaDetail = "Nenhuma despesa pendente pressionando o caixa";
  let coberturaTone: FinancialHealthTone = "emerald";

  if (coverage.despesasPendentes > 0) {
    const ratio = coverage.saldoDisponivel / coverage.despesasPendentes;
    if (ratio >= 1.25) {
      coberturaScore = 30;
      coberturaTone = "emerald";
      coberturaDetail = `Folga de caixa (${coverage.percentualCobertura}%+ coberto)`;
    } else if (ratio >= 1) {
      coberturaScore = 26;
      coberturaTone = "emerald";
      coberturaDetail = "Saldo disponível cobre 100% das contas a vencer";
    } else if (ratio >= 0.5) {
      coberturaScore = clampInt(12 + ((ratio - 0.5) / 0.5) * 12, 12, 24);
      coberturaTone = "amber";
      coberturaDetail = `${coverage.percentualCobertura}% das contas cobertas pelo saldo livre`;
    } else {
      coberturaScore = clampInt(ratio * 24, 0, 11);
      coberturaTone = "rose";
      coberturaDetail = `Apenas ${coverage.percentualCobertura}% das despesas a vencer já cobertas`;
    }
  }

  // 3. Pilar Pontualidade / Vencimentos (0 a 20 pontos)
  const pendingExpenses = expenses.filter((e) => e.status === "pendente");
  const overdueExpenses = pendingExpenses.filter((e) => daysUntilDue(e.dataVencimento, now) < 0);
  const dueSoonExpenses = pendingExpenses.filter((e) => {
    const d = daysUntilDue(e.dataVencimento, now);
    return d >= 0 && d <= 3;
  });

  let pontualidadeScore = 20;
  let pontualidadeDetail = "Todas as despesas em dia";
  let pontualidadeTone: FinancialHealthTone = "emerald";

  if (overdueExpenses.length > 0) {
    pontualidadeScore = Math.max(0, 10 - overdueExpenses.length * 5);
    pontualidadeTone = "rose";
    pontualidadeDetail = `${overdueExpenses.length} despesa${overdueExpenses.length > 1 ? "s" : ""} vencida${overdueExpenses.length > 1 ? "s" : ""}`;
  } else if (dueSoonExpenses.length > 0) {
    pontualidadeScore = 15;
    pontualidadeTone = "amber";
    pontualidadeDetail = `${dueSoonExpenses.length} despesa${dueSoonExpenses.length > 1 ? "s" : ""} vence${dueSoonExpenses.length > 1 ? "m" : ""} em até 3 dias`;
  }

  // 4. Pilar Eficiência de Conversão & Operação (0 a 20 pontos)
  const totalOrders = paidCount + pendingCount + refundedCount;
  let conversaoScore = 15;
  let conversaoDetail = "Aguardando histórico de cobranças";
  let conversaoTone: FinancialHealthTone = "blue";

  if (totalOrders > 0) {
    const paidRatio = paidCount / totalOrders;
    const refundPenalty = refundedCount / totalOrders > 0.15 ? 4 : 0;
    conversaoScore = clampInt(paidRatio * 20 - refundPenalty, 2, 20);
    const pct = Math.round(paidRatio * 100);
    conversaoDetail = `${pct}% dos pedidos convertidos (${paidCount}/${totalOrders})`;
    conversaoTone = conversaoScore >= 16 ? "emerald" : conversaoScore >= 10 ? "amber" : "rose";
  }

  // Insights acionáveis priorizados
  if (overdueExpenses.length > 0) {
    const overdueSum = roundCurrency(overdueExpenses.reduce((acc, e) => acc + e.valor, 0));
    insights.push({
      id: "overdue-expenses",
      severity: "danger",
      title: `${overdueExpenses.length} conta${overdueExpenses.length > 1 ? "s" : ""} vencida${overdueExpenses.length > 1 ? "s" : ""}`,
      description: `Total em atraso de ${overdueSum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Quite ou atualize o status na aba Despesas.`,
      actionTab: "despesas",
    });
  } else if (dueSoonExpenses.length > 0) {
    const soonSum = roundCurrency(dueSoonExpenses.reduce((acc, e) => acc + e.valor, 0));
    insights.push({
      id: "soon-expenses",
      severity: "warn",
      title: `${dueSoonExpenses.length} conta${dueSoonExpenses.length > 1 ? "s" : ""} vence${dueSoonExpenses.length > 1 ? "m" : ""} em até 3 dias`,
      description: `Reserve ${soonSum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} para evitar atraso com fornecedores.`,
      actionTab: "despesas",
    });
  }

  if (coverage.despesasPendentes > 0 && !coverage.coberto) {
    insights.push({
      id: "cash-gap",
      severity: "warn",
      title: "Caixa disponível abaixo das contas a vencer",
      description: `Faltam ${coverage.diferenca.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} para cobrir todas as despesas pendentes. Avalie antecipar vendas no cartão se precisar.`,
      actionTab: "carteira",
    });
  }

  if (!hasPixKey) {
    insights.push({
      id: "missing-pix",
      severity: "warn",
      title: "Chave Pix ainda não configurada",
      description: "Cadastre sua chave Pix na aba Carteira & Saques para liberar transferências imediatas.",
      actionTab: "carteira",
    });
  }

  if (pendingCount > 0) {
    insights.push({
      id: "pending-charges",
      severity: "warn",
      title: `${pendingCount} cobrança${pendingCount > 1 ? "s" : ""} pendente${pendingCount > 1 ? "s" : ""}`,
      description: "Você pode sincronizar pagamentos pendentes direto na aba Carteira & Saques.",
      actionTab: "carteira",
    });
  }

  if (!isElite && dre.vendasBrutas >= 3000) {
    insights.push({
      id: "elite-tip",
      severity: "ok",
      title: "Potencial de economia no Plano PRO / Elite",
      description: "Com esse volume de vendas, compare na aba Taxas & PRO se a redução de tarifas aumenta seu lucro.",
      actionTab: "taxas",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "all-healthy",
      severity: "ok",
      title: "Operação financeira equilibrada",
      description: "Margem positiva, contas sob controle e fluxo de caixa saudável para o evento.",
      actionTab: "relatorios",
    });
  }

  const totalScore = clampInt(margemScore + coberturaScore + pontualidadeScore + conversaoScore, 0, 100);
  let band: FinancialHealthBand = "estavel";
  let bandLabel = "Saúde Estável";
  let tone: FinancialHealthTone = "blue";

  if (totalScore >= 80) {
    band = "excelente";
    bandLabel = "Saúde Excelente";
    tone = "emerald";
  } else if (totalScore >= 55) {
    band = "estavel";
    bandLabel = "Saúde Estável";
    tone = "blue";
  } else if (totalScore >= 30) {
    band = "atencao";
    bandLabel = "Ponto de Atenção";
    tone = "amber";
  } else {
    band = "critico";
    bandLabel = "Risco Financeiro";
    tone = "rose";
  }

  return {
    score: totalScore,
    band,
    bandLabel,
    tone,
    pillars: [
      { id: "margem", label: "Margem Líquida", score: margemScore, max: 30, detail: margemDetail, tone: margemTone },
      { id: "cobertura", label: "Cobertura de Caixa", score: coberturaScore, max: 30, detail: coberturaDetail, tone: coberturaTone },
      { id: "pontualidade", label: "Contas em Dia", score: pontualidadeScore, max: 20, detail: pontualidadeDetail, tone: pontualidadeTone },
      { id: "conversao", label: "Eficiência de Vendas", score: conversaoScore, max: 20, detail: conversaoDetail, tone: conversaoTone },
    ],
    insights: insights.slice(0, 4),
  };
}

/**
 * Converte timestamp ISO ou YYYY-MM-DD para data civil YYYY-MM-DD no fuso America/Sao_Paulo.
 */
export function toSaoPauloYmd(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return getSaoPauloDateString(parsed);
}

/**
 * Filtra uma data civil YYYY-MM-DD entre startDate e endDate (inclusivo).
 */
export function isYmdWithinRange(
  ymd: string,
  startDate?: string | null,
  endDate?: string | null,
): boolean {
  if (!ymd) return !startDate && !endDate;
  if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && ymd < startDate) return false;
  if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate) && ymd > endDate) return false;
  return true;
}

export type ReportSectionKey = "inscricoes" | "plateia" | "despesas" | "repasses";

export const VALID_REPORT_SECTIONS: readonly ReportSectionKey[] = [
  "inscricoes",
  "plateia",
  "despesas",
  "repasses",
];

export type ReportFieldKey =
  | "secao"
  | "origem"
  | "categoria"
  | "status"
  | "formaPagamento"
  | "valorBruto"
  | "data";

export type ReportRow = {
  secao: ReportSectionKey;
  secaoLabel: string;
  origem: string;
  categoria: string;
  status: string;
  formaPagamento: string;
  valorBruto: number;
  data: string; // YYYY-MM-DD (America/Sao_Paulo)
};

export const REPORT_FIELD_DEFINITIONS: Record<
  ReportFieldKey,
  { label: string; defaultSelected: boolean }
> = {
  secao: { label: "Módulo", defaultSelected: true },
  origem: { label: "Descrição / Origem", defaultSelected: true },
  categoria: { label: "Categoria / Tipo", defaultSelected: true },
  status: { label: "Status", defaultSelected: true },
  formaPagamento: { label: "Forma / Vencimento", defaultSelected: true },
  valorBruto: { label: "Valor (R$)", defaultSelected: true },
  data: { label: "Data", defaultSelected: true },
};

export const VALID_REPORT_FIELDS = Object.keys(REPORT_FIELD_DEFINITIONS) as ReportFieldKey[];

export function sanitizeReportSections(raw: string | null | undefined): ReportSectionKey[] {
  if (!raw) return [...VALID_REPORT_SECTIONS];
  const parsed = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is ReportSectionKey => (VALID_REPORT_SECTIONS as readonly string[]).includes(s));
  return parsed.length > 0 ? Array.from(new Set(parsed)) : [...VALID_REPORT_SECTIONS];
}

export function sanitizeReportFields(raw: string | null | undefined): ReportFieldKey[] {
  if (!raw) return [...VALID_REPORT_FIELDS];
  const parsed = raw
    .split(",")
    .map((f) => f.trim())
    .filter((f): f is ReportFieldKey => (VALID_REPORT_FIELDS as readonly string[]).includes(f));
  return parsed.length > 0 ? Array.from(new Set(parsed)) : [...VALID_REPORT_FIELDS];
}
