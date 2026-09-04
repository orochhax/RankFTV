import assert from "node:assert/strict";
import test from "node:test";
import { supportSlaDueAt } from "./support-sla";

test("support SLA becomes shorter as priority increases", () => {
  const from = new Date("2026-09-04T12:00:00Z");
  assert.equal(supportSlaDueAt("critical", from), "2026-09-04T16:00:00.000Z");
  assert.equal(supportSlaDueAt("normal", from), "2026-09-05T12:00:00.000Z");
});
