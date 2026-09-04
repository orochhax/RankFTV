import assert from "node:assert/strict";
import test from "node:test";
import { courtConflicts } from "./court-operations";

test("court operation flags simultaneous matches on the same court", () => {
  const conflicts = courtConflicts([
    { id: "a", courtLabel: "1", scheduledAt: "2026-09-04T12:00:00Z", status: "in_progress" },
    { id: "b", courtLabel: "1", scheduledAt: "2026-09-04T12:30:00Z", status: "in_progress" },
    { id: "c", courtLabel: "2", scheduledAt: "2026-09-04T12:00:00Z", status: "scheduled" },
  ]);
  assert.deepEqual([...conflicts], ["a", "b"]);
});
