import assert from "node:assert/strict";
import test from "node:test";
import {
  appendPreviousObservation,
  parseIso8601Duration,
  sanitizeFileName,
  selectBestThumbnail,
} from "./core";
import type { CompetitorRecord } from "./types";

test("converte duração ISO 8601 oficial do YouTube", () => {
  assert.equal(parseIso8601Duration("PT1H2M3S"), 3_723);
  assert.equal(parseIso8601Duration("PT12M5S"), 725);
});

test("rejeita duração inválida", () => {
  assert.throws(() => parseIso8601Duration("12:05"), /inválida/);
});

test("escolhe a thumbnail de maior área", () => {
  assert.equal(selectBestThumbnail([
    { url: "small", width: 120, height: 90 },
    { url: "large", width: 1280, height: 720 },
  ])?.url, "large");
});

test("sanitiza nomes sem remover acentos úteis", () => {
  assert.equal(sanitizeFileName('Teste: IA / arquivo? "pronto"'), "Teste IA arquivo pronto");
});

test("preserva e acrescenta a observação anterior apenas uma vez", () => {
  const existing = {
    observedAt: "2026-11-01T10:00:00.000Z",
    previousObservations: [],
    video: { views: 10, title: "Título", publishedAt: "2026-10-01T10:00:00.000Z" },
  } as unknown as CompetitorRecord;
  const first = appendPreviousObservation(existing, "2026-11-03T10:00:00.000Z");
  assert.equal(first.length, 1);
  const again = appendPreviousObservation(
    { ...existing, previousObservations: first },
    "2026-11-03T10:00:00.000Z",
  );
  assert.equal(again.length, 1);
});
