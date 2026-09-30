export type OrganizerFinancialNotificationKind = "payment_confirmed" | "refund_confirmed" | "refund_partially_confirmed";

export function organizerFinancialNotificationSourceKey(paymentId: string, kind: OrganizerFinancialNotificationKind): string {
  return `${paymentId}:${kind}`;
}

export function organizerFinancialNotificationCopy(kind: OrganizerFinancialNotificationKind) {
  switch (kind) {
    case "payment_confirmed": return { subject: "Pagamento confirmado", heading: "Pagamento confirmado", detail: "Um pagamento foi confirmado para o seu campeonato." };
    case "refund_partially_confirmed": return { subject: "Estorno parcial confirmado", heading: "Estorno parcial confirmado", detail: "Um estorno parcial foi confirmado para o seu campeonato." };
    default: return { subject: "Estorno confirmado", heading: "Estorno confirmado", detail: "Um estorno foi confirmado e a inscrição ou ingresso foi cancelado." };
  }
}

export function organizerFinancialNotificationRetryAt(attemptCount: number, now = Date.now()): string {
  const delayMinutes = Math.min(24 * 60, 5 * 2 ** Math.max(0, attemptCount - 1));
  return new Date(now + delayMinutes * 60_000).toISOString();
}
