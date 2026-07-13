import {
  addMonthsToDate,
  monthKeyOf,
  monthLabel,
  resumoFinanceiroDoMes,
  splitAmountEqually,
  type Person,
  type PersonSelecao,
  type PersonalFinanceEntry,
  type RecurringOverride,
} from "@/lib/personal-finance";

export type SplitMode = "igual" | "personalizado";

export type PurchaseAllocation = {
  person: Person;
  amount: number;
};

export type ResolvedPurchaseAmounts = {
  totalAmount: number;
  amountCarlos: number;
  amountJulia: number;
};

export type PurchaseSimulationInput = {
  entries: PersonalFinanceEntry[];
  overrides: RecurringOverride[];
  totalAmount: number;
  person: PersonSelecao;
  splitMode: SplitMode;
  amountCarlos?: number;
  amountJulia?: number;
  installmentTotal: number;
  firstDateISO: string;
};

export type PurchaseSimulationMonth = {
  monthKey: string;
  label: string;
  beforeCombined: number;
  impactCombined: number;
  afterCombined: number;
  beforeCarlos: number;
  impactCarlos: number;
  afterCarlos: number;
  beforeJulia: number;
  impactJulia: number;
  afterJulia: number;
};

export type InstallmentDraft = {
  person: Person;
  amount: number;
  entryDate: string;
  installmentNumber: number;
  installmentTotal: number;
  installmentGroupId: string | null;
  sharedEntryGroupId: string | null;
};

function toCents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

export function splitIntoInstallments(total: number, quantity: number): number[] {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantidade de parcelas invalida.");
  const totalCents = toCents(total);
  const base = Math.floor(totalCents / quantity);
  const remainder = totalCents - base * quantity;
  return Array.from({ length: quantity }, (_, index) => fromCents(base + (index < remainder ? 1 : 0)));
}

export function resolvePurchaseAllocations(input: {
  totalAmount: number;
  person: PersonSelecao;
  splitMode: SplitMode;
  amountCarlos?: number;
  amountJulia?: number;
}): PurchaseAllocation[] {
  if (input.person === "carlos") return [{ person: "carlos", amount: input.totalAmount }];
  if (input.person === "julia") return [{ person: "julia", amount: input.totalAmount }];

  if (input.splitMode === "personalizado") {
    return [
      { person: "carlos", amount: input.amountCarlos ?? 0 },
      { person: "julia", amount: input.amountJulia ?? 0 },
    ];
  }

  const split = splitAmountEqually(input.totalAmount);
  return [
    { person: "carlos", amount: split.carlos },
    { person: "julia", amount: split.julia },
  ];
}

export function resolveCalculatorPurchaseAmounts(input: {
  totalAmount: number;
  person: PersonSelecao;
  splitMode: SplitMode;
  amountCarlos?: number;
  amountJulia?: number;
  hasAmountCarlos?: boolean;
  hasAmountJulia?: boolean;
}): ResolvedPurchaseAmounts {
  const totalAmount = Number.isFinite(input.totalAmount) && input.totalAmount > 0 ? input.totalAmount : 0;
  const amountCarlos = Number.isFinite(input.amountCarlos) && input.amountCarlos! > 0 ? input.amountCarlos! : 0;
  const amountJulia = Number.isFinite(input.amountJulia) && input.amountJulia! > 0 ? input.amountJulia! : 0;

  if (input.person === "carlos") return { totalAmount, amountCarlos: totalAmount, amountJulia: 0 };
  if (input.person === "julia") return { totalAmount, amountCarlos: 0, amountJulia: totalAmount };

  if (input.splitMode !== "personalizado") {
    const split = splitAmountEqually(totalAmount);
    return { totalAmount, amountCarlos: split.carlos, amountJulia: split.julia };
  }

  const hasCarlos = Boolean(input.hasAmountCarlos);
  const hasJulia = Boolean(input.hasAmountJulia);

  if (hasCarlos && hasJulia) {
    return { totalAmount: amountCarlos + amountJulia, amountCarlos, amountJulia };
  }

  if (totalAmount > 0 && hasCarlos) {
    const julia = Math.max(totalAmount - amountCarlos, 0);
    return { totalAmount: amountCarlos + julia, amountCarlos, amountJulia: julia };
  }

  if (totalAmount > 0 && hasJulia) {
    const carlos = Math.max(totalAmount - amountJulia, 0);
    return { totalAmount: carlos + amountJulia, amountCarlos: carlos, amountJulia };
  }

  if (totalAmount > 0) {
    const split = splitAmountEqually(totalAmount);
    return { totalAmount, amountCarlos: split.carlos, amountJulia: split.julia };
  }

  return { totalAmount: amountCarlos + amountJulia, amountCarlos, amountJulia };
}

export function buildInstallmentDrafts(input: {
  allocations: PurchaseAllocation[];
  installmentTotal: number;
  firstDateISO: string;
  idFactory: () => string;
}): InstallmentDraft[] {
  const installmentTotal = Math.max(1, input.installmentTotal);
  const shared = input.allocations.length > 1;
  const installmentGroupByPerson = new Map<Person, string | null>();
  const sharedGroupByInstallment = new Map<number, string | null>();

  for (const allocation of input.allocations) {
    installmentGroupByPerson.set(allocation.person, installmentTotal > 1 ? input.idFactory() : null);
  }

  if (shared) {
    for (let i = 1; i <= installmentTotal; i++) sharedGroupByInstallment.set(i, input.idFactory());
  }

  return input.allocations.flatMap((allocation) => {
    const amounts = splitIntoInstallments(allocation.amount, installmentTotal);
    return amounts.map((amount, index) => ({
      person: allocation.person,
      amount,
      entryDate: index === 0 ? input.firstDateISO : addMonthsToDate(input.firstDateISO, index),
      installmentNumber: index + 1,
      installmentTotal,
      installmentGroupId: installmentGroupByPerson.get(allocation.person) ?? null,
      sharedEntryGroupId: shared ? sharedGroupByInstallment.get(index + 1) ?? null : null,
    }));
  });
}

export function simulateQuickPurchase(input: PurchaseSimulationInput): PurchaseSimulationMonth[] {
  const installmentTotal = Math.max(1, input.installmentTotal);
  if (!Number.isFinite(input.totalAmount) || input.totalAmount <= 0) return [];

  const allocations = resolvePurchaseAllocations(input).filter((a) => Number.isFinite(a.amount) && a.amount > 0);
  if (allocations.length === 0) return [];

  const drafts = buildInstallmentDrafts({
    allocations,
    installmentTotal,
    firstDateISO: input.firstDateISO,
    idFactory: () => "preview",
  });

  const monthKeys = [...new Set(drafts.map((d) => monthKeyOf(d.entryDate)))].sort();
  return monthKeys.map((monthKey) => {
    const beforeCombined = resumoFinanceiroDoMes(input.entries, input.overrides, monthKey, "todos").resultado;
    const beforeCarlos = resumoFinanceiroDoMes(input.entries, input.overrides, monthKey, "carlos").resultado;
    const beforeJulia = resumoFinanceiroDoMes(input.entries, input.overrides, monthKey, "julia").resultado;
    const draftsMonth = drafts.filter((d) => monthKeyOf(d.entryDate) === monthKey);
    const impactCarlos = draftsMonth.filter((d) => d.person === "carlos").reduce((s, d) => s + d.amount, 0);
    const impactJulia = draftsMonth.filter((d) => d.person === "julia").reduce((s, d) => s + d.amount, 0);
    const impactCombined = impactCarlos + impactJulia;

    return {
      monthKey,
      label: monthLabel(monthKey),
      beforeCombined,
      impactCombined,
      afterCombined: beforeCombined - impactCombined,
      beforeCarlos,
      impactCarlos,
      afterCarlos: beforeCarlos - impactCarlos,
      beforeJulia,
      impactJulia,
      afterJulia: beforeJulia - impactJulia,
    };
  });
}
