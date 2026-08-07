import assert from "node:assert/strict";
import test from "node:test";

import { makeOperationalPayload, sanitizeForLog } from "./observability-core";

test("observability redacts secrets and common PII", () => {
  const result = sanitizeForLog({
    authorization: "Bearer top-secret",
    email: "pessoa@example.com",
    note: "Contato pessoa@example.com CPF 123.456.789-09, telefone (71) 99999-0000, chave Pix: abc-123",
    nested: { cardNumber: "4111111111111111", safeId: "order-123" },
  }) as Record<string, unknown>;

  assert.equal(result.authorization, "[redacted]");
  assert.equal(result.email, "[redacted]");
  assert.match(String(result.note), /\[redacted-email\]/);
  assert.match(String(result.note), /\[redacted-document\]/);
  assert.match(String(result.note), /\[redacted-phone\]/);
  assert.match(String(result.note), /chave Pix: \[redacted\]/);
  assert.deepEqual(result.nested, { cardNumber: "[redacted]", safeId: "order-123" });
});

test("operational payload carries correlation fields without raw errors", () => {
  const payload = makeOperationalPayload({
    level: "error",
    event: "payment.failed",
    requestId: "request-1",
    error: new Error("Falha para pessoa@example.com"),
  });

  assert.equal(payload.service, "rankftv");
  assert.equal(payload.requestId, "request-1");
  assert.match(JSON.stringify(payload.error), /redacted-email/);
});
