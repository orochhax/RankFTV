import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

async function fixture(name: string) {
  const raw = await readFile(path.join(process.cwd(), "e2e", "fixtures", "asaas", name), "utf8");
  return JSON.parse(raw.replaceAll("__PAYMENT_ID__", process.env.E2E_ASAAS_PAYMENT_ID ?? "pay_fixture")
    .replaceAll("__EXTERNAL_REFERENCE__", process.env.E2E_ASAAS_EXTERNAL_REFERENCE ?? "record_fixture"));
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
    headers: { "asaas-access-token": process.env.ASAAS_WEBHOOK_TOKEN! },
    data: await fixture("invalid.json"),
  });
  expect(response.status()).toBe(400);
});

test("sandbox ledger ignores duplicates and confirmed events after a refund", async ({ request }) => {
  test.skip(
    !process.env.E2E_ASAAS_MUTATION_TESTS
      || !process.env.ASAAS_WEBHOOK_TOKEN
      || !process.env.E2E_ASAAS_PAYMENT_ID
      || !process.env.E2E_ASAAS_EXTERNAL_REFERENCE,
    "Disposable Asaas/Supabase sandbox fixture was not configured",
  );

  const headers = {
    "asaas-access-token": process.env.ASAAS_WEBHOOK_TOKEN!,
    "x-rankftv-event-source": "fixture",
  };
  const confirmed = await request.post("/api/webhooks/asaas", { headers, data: await fixture("confirmed.json") });
  expect(confirmed.ok()).toBe(true);

  const duplicate = await request.post("/api/webhooks/asaas", { headers, data: await fixture("duplicate.json") });
  expect(duplicate.ok()).toBe(true);
  expect(await duplicate.json()).toMatchObject({ ignored: true });

  const refunded = await request.post("/api/webhooks/asaas", { headers, data: await fixture("refunded.json") });
  expect(refunded.ok()).toBe(true);

  const outOfOrder = await request.post("/api/webhooks/asaas", { headers, data: await fixture("out-of-order.json") });
  expect(outOfOrder.ok()).toBe(true);
  expect(await outOfOrder.json()).toMatchObject({ ignored: true, reason: "out_of_order" });
});
