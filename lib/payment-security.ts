import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/rate-limit";
import { maskedCardLast4, normalizeCardNumber } from "@/lib/payment-security-core";
import { reportOperationalEvent } from "@/lib/observability";

export type CardAttempt = {
  allowed: boolean;
  attemptId: string;
  retryAfterSeconds: number;
};

function paymentFingerprintSecret(): string | null {
  return process.env.PAYMENT_FINGERPRINT_SECRET?.trim() || null;
}

function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

async function beginAttempt(input: {
  flow: string;
  orderReference: string;
  actorId?: string | null;
  fingerprintValue: string;
  last4: string;
}): Promise<CardAttempt> {
  const secret = paymentFingerprintSecret();
  if (!secret || !/^[0-9]{4}$/.test(input.last4) || !input.fingerprintValue) {
    return { allowed: false, attemptId: "", retryAfterSeconds: 60 };
  }

  const requestHeaders = await headers();
  const ipHash = hmac(`ip:${getClientIp(requestHeaders)}`, secret);
  const cardFingerprint = hmac(`card:${input.fingerprintValue}`, secret);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("begin_card_payment_attempt", {
    p_flow: input.flow,
    p_order_reference: input.orderReference,
    p_actor_id: input.actorId ?? null,
    p_ip_hash: ipHash,
    p_card_fingerprint: cardFingerprint,
    p_card_last4: input.last4,
  });
  if (error || !data) {
    await reportOperationalEvent({
      level: "critical",
      event: "card_security.guard_unavailable",
      message: "Card payment was blocked because the durable guard is unavailable",
      context: { flow: input.flow, orderReference: input.orderReference },
      error,
      alert: true,
    });
    return { allowed: false, attemptId: "", retryAfterSeconds: 60 };
  }
  const result = data as unknown as { allowed?: boolean; attemptId?: string; retryAfterSeconds?: number };
  if (result.allowed !== true) {
    await reportOperationalEvent({
      level: "warn",
      event: "card_security.attempt_blocked",
      message: "Card attempt was blocked by the durable guard",
      context: {
        flow: input.flow,
        orderReference: input.orderReference,
        retryAfterSeconds: Number(result.retryAfterSeconds ?? 0),
      },
      alert: true,
    });
  }
  return {
    allowed: result.allowed === true,
    attemptId: result.attemptId ?? "",
    retryAfterSeconds: Number(result.retryAfterSeconds ?? 0),
  };
}

export async function beginCardPaymentAttempt(input: {
  flow: string;
  orderReference: string;
  actorId?: string | null;
  cardNumber: string;
}): Promise<CardAttempt> {
  const digits = normalizeCardNumber(input.cardNumber);
  const last4 = maskedCardLast4(digits);
  if (!last4) return { allowed: false, attemptId: "", retryAfterSeconds: 60 };
  return beginAttempt({ ...input, fingerprintValue: digits, last4 });
}

export async function beginStoredCardPaymentAttempt(input: {
  flow: string;
  orderReference: string;
  actorId?: string | null;
  providerToken: string;
  last4: string;
}): Promise<CardAttempt> {
  return beginAttempt({
    flow: input.flow,
    orderReference: input.orderReference,
    actorId: input.actorId,
    fingerprintValue: `token:${input.providerToken}`,
    last4: input.last4,
  });
}

export async function finishCardPaymentAttempt(
  attemptId: string,
  outcome: "success" | "declined" | "ambiguous" | "error",
  providerCode?: string,
): Promise<{ blockedSeconds: number }> {
  if (!attemptId) return { blockedSeconds: 0 };
  const { data } = await createAdminClient().rpc("finish_card_payment_attempt", {
    p_attempt_id: attemptId,
    p_outcome: outcome,
    p_provider_code: providerCode?.slice(0, 80) ?? null,
  });
  const result = data as unknown as { blockedSeconds?: number } | null;
  const blockedSeconds = Number(result?.blockedSeconds ?? 0);
  if (blockedSeconds > 0) {
    await reportOperationalEvent({
      level: "warn",
      event: "card_security.decline_threshold_reached",
      message: "Repeated card declines triggered a cooldown",
      context: { attemptId, blockedSeconds },
      alert: true,
    });
  }
  return { blockedSeconds };
}

export function cardBlockedMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Muitas tentativas de cartao. Aguarde ${minutes} minuto${minutes === 1 ? "" : "s"} antes de tentar novamente.`;
}
