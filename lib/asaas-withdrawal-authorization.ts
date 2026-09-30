import { createHmac } from "node:crypto";

export type PixRefundAuthorizationPayload = {
  type: "PIX_REFUND";
  pixRefund: {
    id: string;
    payment: string;
    value: number;
    status: string;
    type: string;
  };
};

export type TransferAuthorizationPayload = {
  type: "TRANSFER";
  transfer: {
    id: string;
    value: number;
    status: string;
    operationType: string;
    externalReference?: string;
    pixAddressKey?: string;
  };
};

export type WithdrawalAuthorizationPayload = PixRefundAuthorizationPayload | TransferAuthorizationPayload;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAYMENT_ID = /^pay_[A-Za-z0-9_-]{6,80}$/;

export function parsePixRefundAuthorization(value: unknown): PixRefundAuthorizationPayload | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (body.type !== "PIX_REFUND" || !body.pixRefund || typeof body.pixRefund !== "object") return null;
  const refund = body.pixRefund as Record<string, unknown>;
  if (
    typeof refund.id !== "string" || !UUID.test(refund.id)
    || typeof refund.payment !== "string" || !PAYMENT_ID.test(refund.payment)
    || typeof refund.value !== "number" || !Number.isFinite(refund.value) || refund.value <= 0
    || refund.value > 1_000_000
    || typeof refund.status !== "string" || refund.status !== "AWAITING_REQUEST"
    || refund.type !== "CREDIT_REFUND"
  ) return null;

  return {
    type: "PIX_REFUND",
    pixRefund: {
      id: refund.id,
      payment: refund.payment,
      value: refund.value,
      status: refund.status,
      type: refund.type,
    },
  };
}

export function parseWithdrawalAuthorization(value: unknown): WithdrawalAuthorizationPayload | null {
  const refund = parsePixRefundAuthorization(value);
  if (refund) return refund;
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (body.type !== "TRANSFER" || !body.transfer || typeof body.transfer !== "object") return null;
  const transfer = body.transfer as Record<string, unknown>;
  if (
    typeof transfer.id !== "string" || !UUID.test(transfer.id)
    || typeof transfer.value !== "number" || !Number.isFinite(transfer.value) || transfer.value <= 0
    || transfer.value > 1_000_000
    || transfer.status !== "PENDING"
    || transfer.operationType !== "PIX"
  ) return null;
  const bankAccount = transfer.bankAccount && typeof transfer.bankAccount === "object"
    ? transfer.bankAccount as Record<string, unknown> : null;
  const pixAddressKey = typeof transfer.pixAddressKey === "string" ? transfer.pixAddressKey
    : typeof bankAccount?.pixAddressKey === "string" ? bankAccount.pixAddressKey : undefined;
  return {
    type: "TRANSFER",
    transfer: {
      id: transfer.id,
      value: transfer.value,
      status: transfer.status,
      operationType: transfer.operationType,
      ...(typeof transfer.externalReference === "string" ? { externalReference: transfer.externalReference } : {}),
      ...(pixAddressKey ? { pixAddressKey } : {}),
    },
  };
}

export function withdrawalRecipientDigest(pixKey: string, secret: string): string {
  return createHmac("sha256", secret).update(pixKey.trim().toLowerCase(), "utf8").digest("hex");
}

export function sameMoney(left: number | null | undefined, right: number | null | undefined): boolean {
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  return Math.round(Number(left) * 100) === Math.round(Number(right) * 100);
}

export function isAuthorizableProviderRefundStatus(status: string | null | undefined): boolean {
  return status === "AWAITING_CRITICAL_ACTION_AUTHORIZATION"
    || status === "AWAITING_CUSTOMER_EXTERNAL_AUTHORIZATION"
    || status === "AWAITING_REQUEST";
}

type ProviderRefundCandidate = {
  id?: string;
  payment?: string;
  status?: string;
  value?: number;
};

// The payment-scoped Asaas refunds endpoint can omit both `id` and `payment`.
// In that case, accept only one pending refund with the exact amount. The
// webhook payload still supplies the refund/payment IDs, and the route also
// validates those IDs against our ledger and the active domain record.
export function hasUniqueAuthorizableProviderRefund(
  refunds: ProviderRefundCandidate[],
  expected: { refundId: string; paymentId: string; value: number },
): boolean {
  const candidates = refunds.filter((refund) =>
    isAuthorizableProviderRefundStatus(refund.status)
    && sameMoney(refund.value, expected.value)
    && (!refund.payment || refund.payment === expected.paymentId));
  const exact = candidates.filter((refund) => refund.id === expected.refundId);
  if (exact.length === 1) return true;
  if (exact.length > 1) return false;
  return candidates.length === 1 && !candidates[0]?.id;
}
