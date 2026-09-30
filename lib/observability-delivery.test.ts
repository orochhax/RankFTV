import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { reportOperationalEvent } from "./observability";

test("payout settlement requests an operational alert whenever a due payout fails", () => {
  const route = readFileSync("app/api/cron/repasse-liquidacao/route.ts", "utf8");
  assert.match(route, /level: falhas > 0 \? "error" : "info"/);
  assert.match(route, /event: "cron\.payout_settlement_completed"/);
  assert.match(route, /alert: falhas > 0/);
});

test("configured alert sink receives the sanitized payout failure event", async () => {
  const originalFetch = globalThis.fetch;
  const originalAlertUrl = process.env.OPERATIONS_ALERT_WEBHOOK_URL;
  const originalObservabilityUrl = process.env.OBSERVABILITY_HTTP_ENDPOINT;
  const originalConsoleError = console.error;
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];

  process.env.OPERATIONS_ALERT_WEBHOOK_URL = "https://alerts.example.invalid/rankftv";
  delete process.env.OBSERVABILITY_HTTP_ENDPOINT;
  console.error = () => undefined;
  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return new Response(null, { status: 204 });
  };

  try {
    await reportOperationalEvent({
      level: "error",
      event: "cron.payout_settlement_completed",
      message: "Some due payouts failed",
      context: { falhas: 1, paymentToken: "must-not-leak" },
      alert: true,
    });

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, process.env.OPERATIONS_ALERT_WEBHOOK_URL);
    assert.equal(requests[0].body.event, "cron.payout_settlement_completed");
    assert.match(String(requests[0].body.text), /Some due payouts failed/);
    assert.equal(
      (requests[0].body.context as Record<string, unknown>).paymentToken,
      "[redacted]",
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    if (originalAlertUrl === undefined) delete process.env.OPERATIONS_ALERT_WEBHOOK_URL;
    else process.env.OPERATIONS_ALERT_WEBHOOK_URL = originalAlertUrl;
    if (originalObservabilityUrl === undefined) delete process.env.OBSERVABILITY_HTTP_ENDPOINT;
    else process.env.OBSERVABILITY_HTTP_ENDPOINT = originalObservabilityUrl;
  }
});
