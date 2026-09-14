import assert from "node:assert/strict";
import test from "node:test";
import {
  athleteCheckoutDraftStorageKey,
  parseAthleteCheckoutDraft,
} from "./athlete-checkout-draft";

const expiresAt = "2026-09-14T15:00:00.000Z";
const now = Date.parse("2026-09-14T14:00:00.000Z");

function draft(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    version: 1,
    expiresAt,
    values: { comprador_nome: "Atleta Sandbox" },
    paymentMethod: "pix",
    useSameEmail: false,
    ...overrides,
  });
}

test("uses an isolated transient key for each reservation", () => {
  assert.equal(
    athleteCheckoutDraftStorageKey("champ-a", "reservation-a"),
    "rankftv:athlete-checkout-draft:v1:champ-a:reservation-a",
  );
});

test("restores only a current draft for the matching reservation expiry", () => {
  assert.deepEqual(parseAthleteCheckoutDraft(draft(), expiresAt, now), {
    version: 1,
    expiresAt,
    values: { comprador_nome: "Atleta Sandbox" },
    paymentMethod: "pix",
    useSameEmail: false,
  });
  assert.equal(parseAthleteCheckoutDraft(draft(), "2026-09-14T15:01:00.000Z", now), null);
});

test("rejects expired, malformed and oversized drafts", () => {
  assert.equal(parseAthleteCheckoutDraft(draft(), expiresAt, Date.parse(expiresAt)), null);
  assert.equal(parseAthleteCheckoutDraft("{", expiresAt, now), null);
  assert.equal(parseAthleteCheckoutDraft(draft({ values: { x: "a".repeat(501) } }), expiresAt, now), null);
});
