import { createHash } from "node:crypto";

export const ASAAS_CONFIRMED_EVENTS = new Set([
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
]);

export const ASAAS_REFUNDED_EVENTS = new Set([
  "PAYMENT_REFUNDED",
  "PAYMENT_REFUND_REQUESTED",
  "PAYMENT_DELETED",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
]);

const ASAAS_EVENT_RANK: Record<string, number> = {
  PAYMENT_CREATED: 10,
  PAYMENT_UPDATED: 10,
  PAYMENT_CONFIRMED: 30,
  PAYMENT_RECEIVED: 30,
  PAYMENT_REFUND_REQUESTED: 40,
  PAYMENT_REFUNDED: 50,
  PAYMENT_DELETED: 50,
  PAYMENT_CHARGEBACK_REQUESTED: 50,
  PAYMENT_CHARGEBACK_DISPUTE: 50,
};

export type AsaasPaymentPayload = {
  id: string;
  externalReference?: string;
  status: string;
  value: number;
  billingType: string;
  subscription?: string;
  dueDate?: string;
};

export type AsaasWebhookPayload = {
  id?: string;
  dateCreated?: string;
  event: string;
  payment: AsaasPaymentPayload;
};

export function asaasEventRank(event: string): number | null {
  return ASAAS_EVENT_RANK[event] ?? null;
}

export function asaasEventDomainStatus(event: string): "pago" | "estornado" | null {
  if (ASAAS_CONFIRMED_EVENTS.has(event)) return "pago";
  if (ASAAS_REFUNDED_EVENTS.has(event)) return "estornado";
  return null;
}

export function isValidAsaasWebhookPayload(value: unknown): value is AsaasWebhookPayload {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<AsaasWebhookPayload>;
  return typeof body.event === "string"
    && body.event.length > 0
    && body.event.length <= 80
    && Boolean(body.payment)
    && typeof body.payment?.id === "string"
    && body.payment.id.length > 0
    && body.payment.id.length <= 160
    && typeof body.payment?.status === "string"
    && body.payment.status.length <= 80
    && typeof body.payment?.value === "number"
    && Number.isFinite(body.payment.value)
    && body.payment.value >= 0
    && typeof body.payment?.billingType === "string"
    && body.payment.billingType.length <= 40
    && (body.payment.externalReference == null
      || (typeof body.payment.externalReference === "string" && body.payment.externalReference.length <= 200))
    && (body.id == null || (typeof body.id === "string" && body.id.length <= 160))
    && (body.dateCreated == null || typeof body.dateCreated === "string");
}

export function asaasWebhookEventId(body: AsaasWebhookPayload): string {
  return (body.id?.trim() || createHash("sha256")
    .update(`${body.payment.id}:${body.event}:${body.dateCreated ?? ""}:${body.payment.status}`)
    .digest("hex")).slice(0, 160);
}

export function asaasEventOrderingDecision(input: {
  incomingRank: number;
  highestRank: number;
  sameRankAlreadyCommitted: boolean;
}): "process" | "out_of_order" | "duplicate_rank" {
  if (input.incomingRank < input.highestRank) return "out_of_order";
  if (input.incomingRank === input.highestRank && input.sameRankAlreadyCommitted) {
    return "duplicate_rank";
  }
  return "process";
}
