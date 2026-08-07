import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { isAmbiguousAsaasFailure } from "./asaas-errors";

test("network and provider timeout failures remain pending for reconciliation", () => {
  assert.equal(isAmbiguousAsaasFailure(null), true);
  assert.equal(isAmbiguousAsaasFailure(408), true);
  assert.equal(isAmbiguousAsaasFailure(409), true);
  assert.equal(isAmbiguousAsaasFailure(429), true);
  assert.equal(isAmbiguousAsaasFailure(503), true);
});

test("deterministic validation failures may be safely returned", () => {
  assert.equal(isAmbiguousAsaasFailure(400), false);
  assert.equal(isAmbiguousAsaasFailure(401), false);
  assert.equal(isAmbiguousAsaasFailure(422), false);
});

test("timeout fixture documents an idempotent reconciliation outcome", () => {
  const fixture = JSON.parse(readFileSync(
    path.join(process.cwd(), "e2e", "fixtures", "asaas", "timeout.json"),
    "utf8",
  )) as { expectedOperationStatus: string; retryCreatesNewCharge: boolean; reconcileBy: string };

  assert.equal(fixture.expectedOperationStatus, "provider_pending");
  assert.equal(fixture.retryCreatesNewCharge, false);
  assert.equal(fixture.reconcileBy, "externalReference");
});
