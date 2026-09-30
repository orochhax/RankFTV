import assert from "node:assert/strict";
import test from "node:test";
import {
  formatReservationCountdown,
  reservationRemainingMs,
  reservationUrgency,
} from "./checkout-reservation-core";

test("calcula a contagem usando o relogio inicial do servidor", () => {
  const remaining = reservationRemainingMs(
    "2026-09-09T12:15:00.000Z",
    "2026-09-09T12:00:00.000Z",
    130_000,
    10_000,
  );
  assert.equal(remaining, 13 * 60_000);
});

test("nunca apresenta tempo negativo", () => {
  assert.equal(reservationRemainingMs(
    "2026-09-09T12:01:00.000Z",
    "2026-09-09T12:00:00.000Z",
    120_000,
    0,
  ), 0);
});

test("formata e classifica os avisos de cinco e um minuto", () => {
  assert.equal(formatReservationCountdown(61_001), "01:02");
  assert.equal(reservationUrgency(6 * 60_000), "normal");
  assert.equal(reservationUrgency(5 * 60_000), "warning");
  assert.equal(reservationUrgency(60_000), "critical");
  assert.equal(reservationUrgency(0), "expired");
});
