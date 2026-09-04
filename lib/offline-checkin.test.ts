import assert from "node:assert/strict";
import test from "node:test";
import { enqueuePendingCheckin, parsePendingCheckins } from "./offline-checkin";

const item = { championshipId: "11111111-1111-4111-8111-111111111111", token: "ABC-123", scannedAt: "2026-09-04T12:00:00Z" };

test("offline queue rejects invalid data and deduplicates a credential per event", () => {
  assert.deepEqual(parsePendingCheckins("not-json"), []);
  assert.deepEqual(enqueuePendingCheckin([item], item), [item]);
  assert.equal(enqueuePendingCheckin([], { ...item, token: "x.or(secret)" }).length, 0);
});
