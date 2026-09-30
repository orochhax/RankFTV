import test from "node:test";
import assert from "node:assert/strict";
import { organizerFinancialNotificationCopy, organizerFinancialNotificationFailure, organizerFinancialNotificationRetryAt, organizerFinancialNotificationSourceKey } from "./organizer-financial-notifications-core";

test("fila financeira usa chave idempotente por cobrança e evento normalizado", () => {
  assert.equal(organizerFinancialNotificationSourceKey("pay_123", "payment_confirmed"), "pay_123:payment_confirmed");
  assert.notEqual(organizerFinancialNotificationSourceKey("pay_123", "payment_confirmed"), organizerFinancialNotificationSourceKey("pay_123", "refund_confirmed"));
});

test("retentativas financeiras têm backoff limitado", () => {
  assert.equal(organizerFinancialNotificationRetryAt(1, 0), new Date(5 * 60_000).toISOString());
  assert.equal(organizerFinancialNotificationRetryAt(20, 0), new Date(24 * 60 * 60_000).toISOString());
});

test("indisponibilidade temporária retenta e a quinta falha encerra a entrega", () => {
  assert.deepEqual(organizerFinancialNotificationFailure(0, 0), {
    attempts: 1,
    status: "failed",
    nextAttemptAt: new Date(5 * 60_000).toISOString(),
  });
  assert.deepEqual(organizerFinancialNotificationFailure(4, 0), {
    attempts: 5,
    status: "suppressed",
    nextAttemptAt: new Date(80 * 60_000).toISOString(),
  });
});

test("o conteúdo diferencia pagamento, estorno parcial e estorno total", () => {
  assert.match(organizerFinancialNotificationCopy("payment_confirmed").heading, /Pagamento/);
  assert.match(organizerFinancialNotificationCopy("refund_partially_confirmed").heading, /parcial/i);
  assert.match(organizerFinancialNotificationCopy("refund_confirmed").heading, /Estorno/);
});
