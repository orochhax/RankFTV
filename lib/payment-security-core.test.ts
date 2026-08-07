import assert from "node:assert/strict";
import test from "node:test";
import {
  cardAttemptExceedsLimit,
  cardAttemptLimitForScope,
  cardAttemptOutcomeFromError,
  cooldownSecondsForDeclines,
  maskedCardLast4,
  normalizeCardNumber,
} from "./payment-security-core";

test("card identifiers never require persisting the full PAN", () => {
  assert.equal(normalizeCardNumber("4111 1111 1111 1234"), "4111111111111234");
  assert.equal(maskedCardLast4("4111 1111 1111 1234"), "1234");
  assert.equal(maskedCardLast4("123"), null);
});

test("declines apply progressive cooldowns", () => {
  assert.equal(cooldownSecondsForDeclines(2), 0);
  assert.equal(cooldownSecondsForDeclines(3), 900);
  assert.equal(cooldownSecondsForDeclines(5), 3_600);
  assert.equal(cooldownSecondsForDeclines(8), 86_400);
});

test("network uncertainty does not count as a card decline", () => {
  assert.equal(cardAttemptOutcomeFromError(true), "ambiguous");
  assert.equal(cardAttemptOutcomeFromError(false), "declined");
});

test("scope limits slow distributed card testing before the IP ceiling", () => {
  assert.equal(cardAttemptLimitForScope("card"), 6);
  assert.equal(cardAttemptLimitForScope("order"), 8);
  assert.equal(cardAttemptLimitForScope("user"), 12);
  assert.equal(cardAttemptLimitForScope("ip"), 20);
  assert.equal(cardAttemptExceedsLimit("card", 6), false);
  assert.equal(cardAttemptExceedsLimit("card", 7), true);
});
