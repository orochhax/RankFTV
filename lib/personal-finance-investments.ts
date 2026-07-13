// Cálculo e projeção de rendimento de investimentos (/admin/gastos).
//
// Tudo aqui é matemática pura (sem React, sem fetch, sem Supabase) — dá pra
// testar isoladamente. A projeção é sempre BRUTA (sem IR/IOF) e é uma
// ESTIMATIVA: assume a taxa CDI atual constante pro horizonte inteiro e
// ignora feriados (só considera segunda a sexta como dia útil).
//
// O limite de faixa do Mercado Pago é compartilhado por TODO o saldo (Carlos
// + Julia), nunca por pessoa nem por lançamento — ver simulateDailySeries.

import {
  buildOverrideMap, resolvedEntriesForMonth, earliestMonthKey, monthKeyOf, addMonthsToKey, monthLabel,
  addDays, isBusinessDay, nextBusinessDay, lastDayOfMonthISO,
  type Person, type PersonalFinanceEntry, type RecurringOverride, type InvestmentYieldMode,
} from "@/lib/personal-finance";

export { addDays, isBusinessDay, nextBusinessDay, lastDayOfMonthISO };

// ── Fórmulas base ────────────────────────────────────────────────────────────

/** CDI anual (%) → taxa diária (fração), base 252 dias úteis. */
export function annualCdiToDaily(annualCdiPercent: number): number {
  return Math.pow(1 + annualCdiPercent / 100, 1 / 252) - 1;
}

/** Taxa diária efetiva pra quem rende X% do CDI. */
export function dailyYieldFraction(dailyCdi: number, cdiPercent: number): number {
  return dailyCdi * (cdiPercent / 100);
}

/** Juros compostos: aplica uma taxa diária fixa por N dias sobre um saldo inicial. */
export function compoundOverDays(initialBalance: number, dailyRate: number, days: number): number {
  let saldo = initialBalance;
  for (let i = 0; i < days; i++) saldo += saldo * dailyRate;
  return saldo;
}

export type MercadoPagoTierSettings = {
  bonusCdiPercent: number;
  bonusLimit: number;
  excessCdiPercent: number;
};

/**
 * Rendimento bruto de UM dia útil pro saldo total do Mercado Pago, por
 * faixas: bonusCdiPercent% do CDI até bonusLimit, excessCdiPercent% do CDI
 * no que passar disso. O limite é sobre o saldo TOTAL passado (quem chama é
 * responsável por somar Carlos + Julia antes de chamar essa função).
 */
export function mercadoPagoTieredDailyYield(
  totalBalance: number,
  dailyCdi: number,
  settings: MercadoPagoTierSettings,
): number {
  if (totalBalance <= 0) return 0;
  const bonusBase = Math.min(totalBalance, settings.bonusLimit);
  const excessBase = Math.max(totalBalance - settings.bonusLimit, 0);
  return (
    bonusBase * dailyYieldFraction(dailyCdi, settings.bonusCdiPercent) +
    excessBase * dailyYieldFraction(dailyCdi, settings.excessCdiPercent)
  );
}

/** Distribui um rendimento total entre duas pessoas, proporcional ao saldo de cada uma. */
export function distributeProportionally(
  totalYield: number,
  saldoCarlos: number,
  saldoJulia: number,
): { carlos: number; julia: number } {
  const total = saldoCarlos + saldoJulia;
  if (total <= 0) return { carlos: 0, julia: 0 };
  const carlos = totalYield * (saldoCarlos / total);
  return { carlos, julia: totalYield - carlos };
}

// ── Resolução dos aportes (reaproveita fixo/parcelas/overrides existentes) ──

export type InvestmentOccurrence = {
  entryId: string;
  person: Person;
  date: string; // "YYYY-MM-DD"
  amount: number;
  yieldMode: InvestmentYieldMode;
  cdiPercent: number; // usado só no modo single_cdi; default 100 se nunca configurado
};

/**
 * Resolve os lançamentos de investimento em ocorrências concretas (uma por
 * mês pra fixos, respeitando overrides) até `untilISO`. Reaproveita
 * resolvedEntriesForMonth de personal-finance.ts — mesma engine do resto do
 * app, sem lógica duplicada.
 */
export function resolveInvestmentOccurrences(
  investmentEntries: PersonalFinanceEntry[],
  overrides: RecurringOverride[],
  untilISO: string,
): InvestmentOccurrence[] {
  if (investmentEntries.length === 0) return [];
  const overrideMap = buildOverrideMap(overrides);
  const inicio = earliestMonthKey(investmentEntries);
  if (!inicio) return [];
  const fimMk = monthKeyOf(untilISO);
  if (inicio > fimMk) return [];

  const out: InvestmentOccurrence[] = [];
  for (let mk = inicio; mk <= fimMk; mk = addMonthsToKey(mk, 1)) {
    for (const e of resolvedEntriesForMonth(investmentEntries, overrideMap, mk)) {
      if (e.entryDate > untilISO) continue;
      out.push({
        entryId: e.id,
        person: e.person,
        date: e.entryDate,
        amount: e.amount,
        yieldMode: e.investmentYieldMode ?? "single_cdi",
        cdiPercent: e.investmentCdiPercent ?? 100,
      });
    }
  }
  return out;
}

// ── Simulação dia a dia ──────────────────────────────────────────────────────

export type InvestmentSettings = {
  mercadoPagoBonusCdiPercent: number;
  mercadoPagoBonusLimit: number;
  mercadoPagoExcessCdiPercent: number;
  lastCdiAnnual: number | null;
  lastCdiReferenceDate: string | null;
};

export type DailyInvestmentPoint = {
  date: string;
  saldoCarlos: number;
  saldoJulia: number;
  saldoTotal: number;
  rendimentoCarlosDia: number;
  rendimentoJuliaDia: number;
  rendimentoDia: number;
  rendimentoAcumuladoCarlos: number;
  rendimentoAcumuladoJulia: number;
  rendimentoAcumuladoTotal: number;
  aporteDia: number;
};

/**
 * Simula dia útil a dia útil, de hojeISO até fimISO (inclusive). O saldo
 * inicial é a soma das ocorrências com data <= hojeISO (o "principal" já
 * aportado); ocorrências futuras (data > hojeISO) entram no dia certo.
 *
 * Cada dia: 1) calcula o rendimento sobre o saldo de ONTEM (aportes de hoje
 * ainda não rendem), aplica os juros compostos ao saldo; 2) só DEPOIS soma
 * os aportes de hoje — por isso um aporte só começa a render no próximo dia
 * útil. O Mercado Pago usa saldo total (Carlos+Julia) pra achar a faixa e
 * distribui o rendimento proporcionalmente a cada saldo.
 */
export function simulateDailySeries(
  occurrences: InvestmentOccurrence[],
  settings: InvestmentSettings,
  hojeISO: string,
  fimISO: string,
): DailyInvestmentPoint[] {
  if (settings.lastCdiAnnual == null) return [];
  if (occurrences.length === 0) return [];

  const historicas = occurrences.filter((o) => o.date <= hojeISO);
  const futurasPorData = new Map<string, InvestmentOccurrence[]>();
  for (const o of occurrences) {
    if (o.date <= hojeISO || o.date > fimISO) continue;
    const lista = futurasPorData.get(o.date) ?? [];
    lista.push(o);
    futurasPorData.set(o.date, lista);
  }

  let saldoMPCarlos = 0;
  let saldoMPJulia = 0;
  const singleBuckets = new Map<string, { person: Person; cdiPercent: number; saldo: number }>();

  function addToBucket(o: { person: Person; yieldMode: InvestmentYieldMode; cdiPercent: number; amount: number }) {
    if (o.yieldMode === "mercado_pago_tiered") {
      if (o.person === "carlos") saldoMPCarlos += o.amount; else saldoMPJulia += o.amount;
    } else {
      const key = `${o.person}|${o.cdiPercent}`;
      const atual = singleBuckets.get(key) ?? { person: o.person, cdiPercent: o.cdiPercent, saldo: 0 };
      atual.saldo += o.amount;
      singleBuckets.set(key, atual);
    }
  }
  for (const o of historicas) addToBucket(o);

  const dailyCdi = annualCdiToDaily(settings.lastCdiAnnual);
  const mpSettings: MercadoPagoTierSettings = {
    bonusCdiPercent: settings.mercadoPagoBonusCdiPercent,
    bonusLimit: settings.mercadoPagoBonusLimit,
    excessCdiPercent: settings.mercadoPagoExcessCdiPercent,
  };

  const pontos: DailyInvestmentPoint[] = [];
  let data = hojeISO;
  let rendimentoAcumuladoCarlos = 0;
  let rendimentoAcumuladoJulia = 0;

  while (data <= fimISO) {
    if (isBusinessDay(data)) {
      const totalMP = saldoMPCarlos + saldoMPJulia;
      const yMPTotal = mercadoPagoTieredDailyYield(totalMP, dailyCdi, mpSettings);
      const { carlos: yMPCarlos, julia: yMPJulia } = distributeProportionally(yMPTotal, saldoMPCarlos, saldoMPJulia);
      saldoMPCarlos += yMPCarlos;
      saldoMPJulia += yMPJulia;

      let ySingleCarlos = 0;
      let ySingleJulia = 0;
      for (const bucket of singleBuckets.values()) {
        const y = bucket.saldo * dailyYieldFraction(dailyCdi, bucket.cdiPercent);
        bucket.saldo += y;
        if (bucket.person === "carlos") ySingleCarlos += y; else ySingleJulia += y;
      }

      const rendimentoCarlosDia = yMPCarlos + ySingleCarlos;
      const rendimentoJuliaDia = yMPJulia + ySingleJulia;
      const rendimentoDia = rendimentoCarlosDia + rendimentoJuliaDia;
      rendimentoAcumuladoCarlos += rendimentoCarlosDia;
      rendimentoAcumuladoJulia += rendimentoJuliaDia;

      const aportesHoje = futurasPorData.get(data) ?? [];
      let aporteDia = 0;
      for (const o of aportesHoje) {
        aporteDia += o.amount;
        addToBucket(o);
      }

      const saldoCarlosSingle = [...singleBuckets.values()].filter((b) => b.person === "carlos").reduce((s, b) => s + b.saldo, 0);
      const saldoJuliaSingle  = [...singleBuckets.values()].filter((b) => b.person === "julia").reduce((s, b) => s + b.saldo, 0);
      const saldoCarlos = saldoMPCarlos + saldoCarlosSingle;
      const saldoJulia  = saldoMPJulia + saldoJuliaSingle;

      pontos.push({
        date: data,
        saldoCarlos,
        saldoJulia,
        saldoTotal: saldoCarlos + saldoJulia,
        rendimentoCarlosDia,
        rendimentoJuliaDia,
        rendimentoDia,
        rendimentoAcumuladoCarlos,
        rendimentoAcumuladoJulia,
        rendimentoAcumuladoTotal: rendimentoAcumuladoCarlos + rendimentoAcumuladoJulia,
        aporteDia,
      });
    }
    data = addDays(data, 1);
  }

  return pontos;
}

// ── Agregação mensal (pro gráfico) ───────────────────────────────────────────

export type MonthlyInvestmentPoint = {
  monthKey: string;
  label: string;
  saldoCarlos: number;
  saldoJulia: number;
  saldoTotal: number;
  aportesDoMes: number;
  rendimentoDoMes: number;
  rendimentoDoMesCarlos: number;
  rendimentoDoMesJulia: number;
  rendimentoAcumuladoCarlos: number;
  rendimentoAcumuladoJulia: number;
  rendimentoAcumuladoTotal: number;
};

export function aggregateMonthly(daily: DailyInvestmentPoint[]): MonthlyInvestmentPoint[] {
  const porMes = new Map<string, MonthlyInvestmentPoint>();
  for (const d of daily) {
    const mk = monthKeyOf(d.date);
    const atual = porMes.get(mk);
    if (!atual) {
      porMes.set(mk, {
        monthKey: mk,
        label: monthLabel(mk),
        saldoCarlos: d.saldoCarlos,
        saldoJulia: d.saldoJulia,
        saldoTotal: d.saldoTotal,
        aportesDoMes: d.aporteDia,
        rendimentoDoMes: d.rendimentoDia,
        rendimentoDoMesCarlos: d.rendimentoCarlosDia,
        rendimentoDoMesJulia: d.rendimentoJuliaDia,
        rendimentoAcumuladoCarlos: d.rendimentoAcumuladoCarlos,
        rendimentoAcumuladoJulia: d.rendimentoAcumuladoJulia,
        rendimentoAcumuladoTotal: d.rendimentoAcumuladoTotal,
      });
    } else {
      atual.saldoCarlos = d.saldoCarlos; // último dia do mês "vence"
      atual.saldoJulia = d.saldoJulia;
      atual.saldoTotal = d.saldoTotal;
      atual.aportesDoMes += d.aporteDia;
      atual.rendimentoDoMes += d.rendimentoDia;
      atual.rendimentoDoMesCarlos += d.rendimentoCarlosDia;
      atual.rendimentoDoMesJulia += d.rendimentoJuliaDia;
      atual.rendimentoAcumuladoCarlos = d.rendimentoAcumuladoCarlos;
      atual.rendimentoAcumuladoJulia = d.rendimentoAcumuladoJulia;
      atual.rendimentoAcumuladoTotal = d.rendimentoAcumuladoTotal;
    }
  }
  return [...porMes.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

/** Ponto de entrada usado pela UI: junta resolução de ocorrências + simulação + agregação mensal. */
export function projetarInvestimentos(
  todosOsLancamentos: PersonalFinanceEntry[],
  overrides: RecurringOverride[],
  settings: InvestmentSettings,
  hojeISO: string,
  horizonteMeses: number,
): MonthlyInvestmentPoint[] {
  const investimentos = todosOsLancamentos.filter((e) => e.type === "investimento");
  if (investimentos.length === 0) return [];

  const fimISO = lastDayOfMonthISO(addMonthsToKey(monthKeyOf(hojeISO), horizonteMeses));
  const occurrences = resolveInvestmentOccurrences(investimentos, overrides, fimISO);
  const daily = simulateDailySeries(occurrences, settings, hojeISO, fimISO);
  return aggregateMonthly(daily);
}
