import assert from "node:assert/strict";
import test from "node:test";
import { minutesSinceMidnightInBahia } from "@/lib/performance-life-os";

test("minutesSinceMidnightInBahia converte o instante para o relógio de Bahia", () => {
  assert.equal(minutesSinceMidnightInBahia("2026-08-07T16:30:45.000Z"), 13 * 60 + 30 + 45 / 60);
});

test("minutesSinceMidnightInBahia respeita a virada do dia em Bahia", () => {
  assert.equal(minutesSinceMidnightInBahia("2026-08-08T02:59:59.000Z"), 23 * 60 + 59 + 59 / 60);
  assert.equal(minutesSinceMidnightInBahia("2026-08-08T03:00:00.000Z"), 0);
});
