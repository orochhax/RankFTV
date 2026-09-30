const DAY_MS = 24 * 60 * 60 * 1000;
const WITHDRAWAL_WINDOW_MS = 7 * DAY_MS;
const VOLUNTARY_CUTOFF_MS = 72 * 60 * 60 * 1000;

export type RefundPolicyCode =
  | "cancel_without_charge"
  | "full_refund"
  | "partial_refund"
  | "blocked_checked_in"
  | "blocked_event_started"
  | "blocked_late"
  | "blocked_invalid_dates";

export type RefundPolicyDecision = {
  allowed: boolean;
  code: RefundPolicyCode;
  refundMode: "none" | "full" | "partial" | null;
  eventStartAt: string | null;
  partialRefundDeadlineAt: string | null;
};

export type RefundPolicyInput = {
  purchasedAt: string;
  eventStartDate: string | null;
  checkedIn: boolean;
  paymentStatus: string;
  hasProviderCharge: boolean;
  now?: Date;
};

function parseEventStart(eventStartDate: string | null): number | null {
  if (!eventStartDate) return null;
  const value = /^\d{4}-\d{2}-\d{2}$/.test(eventStartDate)
    ? `${eventStartDate}T00:00:00-03:00`
    : eventStartDate;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function decideRefundPolicy(input: RefundPolicyInput): RefundPolicyDecision {
  const now = input.now?.getTime() ?? Date.now();
  const eventStart = parseEventStart(input.eventStartDate);
  const eventStartAt = eventStart == null ? null : new Date(eventStart).toISOString();
  const partialDeadline = eventStart == null ? null : eventStart - VOLUNTARY_CUTOFF_MS;
  const partialRefundDeadlineAt = partialDeadline == null
    ? null
    : new Date(partialDeadline).toISOString();

  if (input.checkedIn) {
    return {
      allowed: false,
      code: "blocked_checked_in",
      refundMode: null,
      eventStartAt,
      partialRefundDeadlineAt,
    };
  }

  if (eventStart == null) {
    return {
      allowed: false,
      code: "blocked_invalid_dates",
      refundMode: null,
      eventStartAt,
      partialRefundDeadlineAt,
    };
  }

  if (now >= eventStart) {
    return {
      allowed: false,
      code: "blocked_event_started",
      refundMode: null,
      eventStartAt,
      partialRefundDeadlineAt,
    };
  }

  if (input.paymentStatus !== "pago" || !input.hasProviderCharge) {
    return {
      allowed: true,
      code: "cancel_without_charge",
      refundMode: "none",
      eventStartAt,
      partialRefundDeadlineAt,
    };
  }

  const purchasedAt = Date.parse(input.purchasedAt);
  if (!Number.isFinite(purchasedAt)) {
    return {
      allowed: false,
      code: "blocked_invalid_dates",
      refundMode: null,
      eventStartAt,
      partialRefundDeadlineAt,
    };
  }

  const purchaseAge = Math.max(0, now - purchasedAt);
  if (purchaseAge <= WITHDRAWAL_WINDOW_MS) {
    return {
      allowed: true,
      code: "full_refund",
      refundMode: "full",
      eventStartAt,
      partialRefundDeadlineAt,
    };
  }

  if (partialDeadline != null && now <= partialDeadline) {
    return {
      allowed: true,
      code: "partial_refund",
      refundMode: "partial",
      eventStartAt,
      partialRefundDeadlineAt,
    };
  }

  return {
    allowed: false,
    code: "blocked_late",
    refundMode: null,
    eventStartAt,
    partialRefundDeadlineAt,
  };
}

export function refundPolicyError(decision: RefundPolicyDecision): string {
  switch (decision.code) {
    case "blocked_checked_in":
      return "Este ingresso já foi utilizado no check-in e não pode ser cancelado.";
    case "blocked_event_started":
      return "O evento já começou e este ingresso não pode mais ser cancelado.";
    case "blocked_late":
      return "O prazo de cancelamento voluntário terminou 72 horas antes do evento.";
    case "blocked_invalid_dates":
      return "Não foi possível validar as datas da compra e do evento. Procure o suporte.";
    default:
      return "Este ingresso não pode ser cancelado agora.";
  }
}
