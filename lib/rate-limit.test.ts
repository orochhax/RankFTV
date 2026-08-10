import assert from "node:assert/strict";
import test from "node:test";

import { hashRateLimitKey } from "./rate-limit-core";

test("rate-limit persistence uses a stable digest instead of raw PII", () => {
  const raw = "ingressos-verif:par:12345678901:pessoa@example.com";
  const first = hashRateLimitKey(raw);
  const second = hashRateLimitKey(raw);
  assert.equal(first, second);
  assert.match(first, /^rl:[a-f0-9]{64}$/);
  assert.doesNotMatch(first, /12345678901|pessoa@example\.com/);
  assert.notEqual(first, hashRateLimitKey(`${raw}:different`));
});
