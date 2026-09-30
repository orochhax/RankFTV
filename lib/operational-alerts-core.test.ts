import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEmailQueueAlertCandidates,
  operationalAlertDedupeKey,
} from "./operational-alerts-core";

test("email backlog only alerts after the configured threshold", () => {
  const below = buildEmailQueueAlertCandidates({
    championshipBacklogIds: ["notice-1"],
    organizerBacklogIds: [],
    exhaustedChampionshipIds: [],
    exhaustedOrganizerIds: [],
    failedTransactionalEmailIds: [],
  }, 2);
  assert.deepEqual(below, []);

  const reached = buildEmailQueueAlertCandidates({
    championshipBacklogIds: ["notice-1"],
    organizerBacklogIds: ["financial-1"],
    exhaustedChampionshipIds: [],
    exhaustedOrganizerIds: [],
    failedTransactionalEmailIds: [],
  }, 2);
  assert.equal(reached.length, 1);
  assert.equal(reached[0].kind, "email_queue_backlog");
  assert.match(reached[0].title, /2 pendências/);
});

test("terminal email failures are critical and idempotent per delivery", () => {
  const candidates = buildEmailQueueAlertCandidates({
    championshipBacklogIds: [],
    organizerBacklogIds: [],
    exhaustedChampionshipIds: ["notice-1"],
    exhaustedOrganizerIds: ["financial-1"],
    failedTransactionalEmailIds: ["event-1"],
  }, 10);

  assert.equal(candidates.length, 3);
  assert.ok(candidates.every((candidate) => candidate.severity === "critical"));
  assert.equal(new Set(candidates.map(operationalAlertDedupeKey)).size, 3);
});
