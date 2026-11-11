import assert from "node:assert/strict";
import test from "node:test";
import { courtConflicts, formatCourtLabel } from "./court-operations";

test("court operation flags simultaneous matches on the same court", () => {
  const conflicts = courtConflicts([
    { id: "a", courtLabel: "1", scheduledAt: "2026-09-04T12:00:00Z", status: "in_progress" },
    { id: "b", courtLabel: "1", scheduledAt: "2026-09-04T12:30:00Z", status: "in_progress" },
    { id: "c", courtLabel: "2", scheduledAt: "2026-09-04T12:00:00Z", status: "scheduled" },
  ]);
  assert.deepEqual([...conflicts], ["a", "b"]);
});

test("formatCourtLabel evita duplicar prefixo Quadra quando já está salvo no nome", () => {
  assert.equal(formatCourtLabel(null), undefined);
  assert.equal(formatCourtLabel("   "), undefined);
  assert.equal(formatCourtLabel("1"), "Quadra 1");
  assert.equal(formatCourtLabel("Central"), "Quadra Central");
  assert.equal(formatCourtLabel("Quadra 1"), "Quadra 1");
  assert.equal(formatCourtLabel("Quadra Central"), "Quadra Central");
  assert.equal(formatCourtLabel("quadra sul"), "quadra sul");
});
