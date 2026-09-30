import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { financialMutationSandboxEnabled } from "../lib/e2e-sandbox-safety";
import {
  cleanupAsaasWebhookFixture,
  createAsaasWebhookFixture,
  type AsaasWebhookFixture,
} from "./support/sandbox-financial-fixture";

const mutationsEnabled = financialMutationSandboxEnabled("E2E_ASAAS_MUTATION_TESTS");

function requiredWebhookToken(): string {
  const token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!token) throw new Error("Token do webhook Sandbox ausente");
  return token;
}

async function fixture(name: string, paymentId?: string, externalReference?: string) {
  const raw = await readFile(path.join(process.cwd(), "e2e", "fixtures", "asaas", name), "utf8");
  const payload = JSON.parse(raw.replaceAll("__PAYMENT_ID__", paymentId ?? process.env.E2E_ASAAS_PAYMENT_ID ?? "pay_fixture")
    .replaceAll("__EXTERNAL_REFERENCE__", externalReference ?? process.env.E2E_ASAAS_EXTERNAL_REFERENCE ?? "record_fixture"));
  payload.payment.billingType = "CREDIT_CARD";
  return payload;
}

test("rejects an invalid webhook token before touching financial state", async ({ request }) => {
  const response = await request.post("/api/webhooks/asaas", {
    headers: { "asaas-access-token": "invalid-fixture-token" },
    data: await fixture("confirmed.json"),
  });
  expect(response.status()).toBe(401);
});

test("rejects a signed payload with an invalid schema", async ({ request }) => {
  test.skip(!process.env.ASAAS_WEBHOOK_TOKEN, "Webhook sandbox token was not configured");
  const response = await request.post("/api/webhooks/asaas", {
    headers: { "asaas-access-token": requiredWebhookToken() },
    data: await fixture("invalid.json"),
  });
  expect(response.status()).toBe(400);
});

async function assertConfirmedState(generated: AsaasWebhookFixture, paymentId: string) {
  const { admin, ticketId } = generated;
  const [{ data: ticket }, { count: credentialCount }, { count: confirmedNoticeCount }] = await Promise.all([
    admin.from("athlete_tickets").select("status_pagamento").eq("id", ticketId).single(),
    admin.from("athlete_ticket_credentials").select("id", { count: "exact", head: true })
      .eq("athlete_ticket_id", ticketId),
    admin.from("organizer_financial_notification_deliveries").select("id", { count: "exact", head: true })
      .eq("payment_id", paymentId).eq("event_kind", "payment_confirmed"),
  ]);
  expect(ticket?.status_pagamento).toBe("pago");
  expect(credentialCount).toBe(2);
  expect(confirmedNoticeCount).toBe(1);
}

async function assertRefundedState(generated: AsaasWebhookFixture, paymentId: string) {
  const { admin, ticketId } = generated;
  const [{ data: ticket }, { count: refundedNoticeCount }] = await Promise.all([
    admin.from("athlete_tickets").select("status_pagamento").eq("id", ticketId).single(),
    admin.from("organizer_financial_notification_deliveries").select("id", { count: "exact", head: true })
      .eq("payment_id", paymentId).eq("event_kind", "refund_confirmed"),
  ]);
  expect(ticket?.status_pagamento).toBe("estornado");
  expect(refundedNoticeCount).toBe(1);
}

async function postFixture(
  request: APIRequestContext,
  headers: Record<string, string>,
  name: string,
  reference: { paymentId: string; externalReference: string },
) {
  return request.post("/api/webhooks/asaas", {
    headers, data: await fixture(name, reference.paymentId, reference.externalReference),
  });
}

async function financialReference() {
  const configuredPaymentId = process.env.E2E_ASAAS_PAYMENT_ID;
  const configuredReference = process.env.E2E_ASAAS_EXTERNAL_REFERENCE;
  if (configuredPaymentId && configuredReference) {
    return { generated: null, paymentId: configuredPaymentId, externalReference: configuredReference };
  }
  const generated = await createAsaasWebhookFixture();
  return { generated, paymentId: generated.paymentId, externalReference: generated.externalReference };
}

test("sandbox ledger ignores duplicates and confirmed events after a refund", async ({ request }) => {
  test.skip(
    !mutationsEnabled
      || !process.env.ASAAS_WEBHOOK_TOKEN,
    "Disposable Asaas/Supabase sandbox mutation mode was not configured",
  );

  const { generated, paymentId, externalReference } = await financialReference();
  const headers = {
    "asaas-access-token": requiredWebhookToken(),
    "x-rankftv-event-source": "fixture",
  };
  const reference = { paymentId, externalReference };
  try {
    const confirmed = await postFixture(request, headers, "confirmed.json", reference);
    expect(confirmed.ok()).toBe(true);

    const duplicate = await postFixture(request, headers, "duplicate.json", reference);
    expect(duplicate.ok()).toBe(true);
    expect(await duplicate.json()).toMatchObject({ ignored: true });
    if (generated) await assertConfirmedState(generated, paymentId);

    const refunded = await postFixture(request, headers, "refunded.json", reference);
    expect(refunded.ok()).toBe(true);

    const outOfOrder = await postFixture(request, headers, "out-of-order.json", reference);
    expect(outOfOrder.ok()).toBe(true);
    expect(await outOfOrder.json()).toMatchObject({ ignored: true, reason: "out_of_order" });
    if (generated) await assertRefundedState(generated, paymentId);
  } finally {
    if (generated) await cleanupAsaasWebhookFixture(generated);
  }
});
