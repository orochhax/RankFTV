import { formatBRL } from "@/lib/format";

export const PRE_EVENT_ADVANCE_PERCENTAGE = 0.70;
export const PRE_EVENT_SECURITY_RESERVE_PERCENTAGE = 0.30;
export const POST_EVENT_BUSINESS_DAYS_DELAY = 2;

/**
 * Retorna a data no formato YYYY-MM-DD no fuso de Brasília.
 */
export function toBahiaDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Adiciona dias úteis (segunda a sexta) a uma data base.
 */
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const result = new Date(startDate.getTime());
  let added = 0;
  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  return result;
}

/**
 * Calcula a data exata de liberação integral pós-evento (D+2 dias úteis após data_fim 23:59:59 America/Sao_Paulo).
 */
export function calculatePostEventReleaseDate(dataFim: string | null | undefined): Date {
  if (!dataFim) {
    return new Date();
  }
  const rawDate = dataFim.split("T")[0];
  // Parse YYYY-MM-DD em partes para evitar desvios de fuso horário
  const parts = rawDate.split("-").map(Number);
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    const [year, month, day] = parts;
    // Cria data às 23:59:59.999 local
    const baseDate = new Date(year, month - 1, day, 23, 59, 59, 999);
    return addBusinessDays(baseDate, POST_EVENT_BUSINESS_DAYS_DELAY);
  }

  const parsed = new Date(dataFim);
  const baseDate = Number.isFinite(parsed.getTime()) ? parsed : new Date();
  return addBusinessDays(baseDate, POST_EVENT_BUSINESS_DAYS_DELAY);
}

export type WalletSnapshotNumbers = {
  totalNet?: number | null;
  available?: number | null;
  pending?: number | null;
  reserved?: number | null;
  withdrawn?: number | null;
};

export type WalletAccountingTotals = {
  remainingNet: number;
  available: number;
  pending: number;
  reserved: number;
  withdrawn: number;
  lifetimeTotalNet: number;
  totalCommitted: number;
};

/**
 * Converte o snapshot retornado por `organizer_wallet_snapshot` em totais contábeis consistentes.
 * Na RPC, `totalNet` já exclui valores pagos (`withdrawn`), então o faturamento líquido total
 * acumulado do campeonato é `totalNet + withdrawn`.
 */
export function resolveWalletAccountingTotals(
  snapshot: WalletSnapshotNumbers,
): WalletAccountingTotals {
  const round2 = (v: number) => Math.max(0, Math.round((Number.isFinite(v) ? v : 0) * 100) / 100);
  const remainingNet = round2(Number(snapshot.totalNet ?? 0));
  const available = round2(Number(snapshot.available ?? 0));
  const pending = round2(Number(snapshot.pending ?? 0));
  const reserved = round2(Number(snapshot.reserved ?? 0));
  const withdrawn = round2(Number(snapshot.withdrawn ?? 0));

  const lifetimeTotalNet = round2(remainingNet + withdrawn);
  const totalCommitted = round2(withdrawn + reserved);

  return {
    remainingNet,
    available,
    pending,
    reserved,
    withdrawn,
    lifetimeTotalNet,
    totalCommitted,
  };
}

/**
 * Retorna o menor valor entre o saldo já liquidado na carteira e o teto de saque da regra 70/30.
 */
export function computeWithdrawableCashNow(input: {
  available: number;
  maxWithdrawableNow: number;
}): number {
  const avail = Math.max(0, Number(input.available) || 0);
  const maxNow = Math.max(0, Number(input.maxWithdrawableNow) || 0);
  return Math.round(Math.min(avail, maxNow) * 100) / 100;
}

export type OrganizerWithdrawalLimits = {
  isPostEvent: boolean;
  releaseDate: Date;
  releaseDateFormatted: string;
  totalNet: number;
  alreadyWithdrawn: number;
  securityReserveAmount: number;
  advanceCap: number;
  maxWithdrawableNow: number;
};

/**
 * Avalia os limites de saque do organizador:
 * - Pré-evento: até 70% do faturamento líquido total pode ser sacado. 30% fica retido em Reserva Técnica.
 * - Pós-evento (D+2 dias úteis após data_fim): 100% do saldo remanescente é liberado.
 */
export function calculateOrganizerWithdrawalLimits(input: {
  totalNet: number;
  alreadyWithdrawn: number;
  dataFim: string | null | undefined;
  now?: Date;
}): OrganizerWithdrawalLimits {
  const now = input.now ?? new Date();
  const totalNet = Math.max(0, Math.round(input.totalNet * 100) / 100);
  const alreadyWithdrawn = Math.max(0, Math.round(input.alreadyWithdrawn * 100) / 100);
  const releaseDate = calculatePostEventReleaseDate(input.dataFim);
  const isPostEvent = now.getTime() >= releaseDate.getTime();

  const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
  const releaseDateFormatted = dateFormatter.format(releaseDate);

  if (isPostEvent) {
    const available = Math.max(0, Math.round((totalNet - alreadyWithdrawn) * 100) / 100);
    return {
      isPostEvent: true,
      releaseDate,
      releaseDateFormatted,
      totalNet,
      alreadyWithdrawn,
      securityReserveAmount: 0,
      advanceCap: totalNet,
      maxWithdrawableNow: available,
    };
  }

  const advanceCap = Math.round(totalNet * PRE_EVENT_ADVANCE_PERCENTAGE * 100) / 100;
  const securityReserveAmount = Math.round(totalNet * PRE_EVENT_SECURITY_RESERVE_PERCENTAGE * 100) / 100;
  const maxWithdrawableNow = Math.max(0, Math.round((advanceCap - alreadyWithdrawn) * 100) / 100);

  return {
    isPostEvent: false,
    releaseDate,
    releaseDateFormatted,
    totalNet,
    alreadyWithdrawn,
    securityReserveAmount,
    advanceCap,
    maxWithdrawableNow,
  };
}

/**
 * Valida se uma solicitação de saque em reais respeita a política 70/30 ou pós-evento.
 */
export function validateWithdrawalRequestAmount(input: {
  requestedAmount: number;
  totalNet: number;
  alreadyWithdrawn: number;
  dataFim: string | null | undefined;
  now?: Date;
}): { allowed: boolean; message?: string; limits: OrganizerWithdrawalLimits } {
  const limits = calculateOrganizerWithdrawalLimits({
    totalNet: input.totalNet,
    alreadyWithdrawn: input.alreadyWithdrawn,
    dataFim: input.dataFim,
    now: input.now,
  });

  const requested = Math.round(input.requestedAmount * 100) / 100;
  if (requested <= 0) {
    return {
      allowed: false,
      message: "Selecione ao menos um ingresso válido para sacar.",
      limits,
    };
  }

  if (limits.isPostEvent) {
    if (requested > limits.maxWithdrawableNow + 0.009) {
      return {
        allowed: false,
        message: `O valor selecionado (${formatBRL(requested)}) excede o saldo remanescente disponível (${formatBRL(limits.maxWithdrawableNow)}).`,
        limits,
      };
    }
    return { allowed: true, limits };
  }

  // Modo Pré-Evento (limite de 70% com reserva de 30%)
  if (limits.maxWithdrawableNow < 0.01) {
    return {
      allowed: false,
      message: `Você já atingiu o limite de adiantamento pré-evento de 70% (${formatBRL(limits.advanceCap)}). A Reserva Técnica de 30% (${formatBRL(limits.securityReserveAmount)}) é mantida para garantir cancelamentos legais de atletas e será liberada em ${limits.releaseDateFormatted} (2 dias úteis após o término).`,
      limits,
    };
  }

  if (requested > limits.maxWithdrawableNow + 0.009) {
    return {
      allowed: false,
      message: `O valor selecionado (${formatBRL(requested)}) ultrapassa o limite disponível para adiantamento pré-evento (${formatBRL(limits.maxWithdrawableNow)}). A Reserva Técnica de 30% (${formatBRL(limits.securityReserveAmount)}) é retida para segurança dos reembolsos e será liberada em ${limits.releaseDateFormatted}.`,
      limits,
    };
  }

  return { allowed: true, limits };
}
