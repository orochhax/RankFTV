import assert from "node:assert/strict";
import test from "node:test";
import {
  expandEventOccurrences,
  quickRecurrenceRule,
  recurrencePresetOptions,
  recurrenceSummary,
  type RecurringEvent,
} from "./event-recurrence";

const event = (overrides: Partial<RecurringEvent> = {}): RecurringEvent => ({
  id: "event-1",
  title: "Compromisso",
  description: null,
  startAt: "2026-08-10T12:00:00.000Z",
  endAt: "2026-08-10T13:00:00.000Z",
  allDay: false,
  status: "planned",
  location: null,
  ...overrides,
});

test("oferece os presets contextuais da imagem", () => {
  const options = recurrencePresetOptions("2026-08-10");
  assert.deepEqual(options.map((option) => option.value), ["none", "daily", "weekly", "monthly_nth_weekday", "yearly", "weekdays", "custom"]);
  assert.match(options[2].label, /segunda-feira/);
  assert.match(options[3].label, /segundo\(a\).*segunda-feira/);
  assert.match(options[4].label, /10 de agosto/);
});

test("expande diariamente apenas dentro da janela", () => {
  const recurrenceRule = quickRecurrenceRule("daily", "2026-08-10");
  const occurrences = expandEventOccurrences([event({ recurrenceRule })], { from: "2026-08-12", to: "2026-08-14" });
  assert.deepEqual(occurrences.map((item) => item.occurrenceDate), ["2026-08-12", "2026-08-13", "2026-08-14"]);
  assert.equal(new Set(occurrences.map((item) => item.occurrenceId)).size, 3);
});

test("recorrência semanal personalizada respeita dias e contagem inclusiva", () => {
  const recurrenceRule = {
    version: 1 as const,
    frequency: "weekly" as const,
    interval: 1,
    byWeekdays: [2, 4],
    end: { type: "count" as const, count: 4 },
    timezone: "America/Bahia" as const,
  };
  const occurrences = expandEventOccurrences([event({ recurrenceRule })], { from: "2026-08-01", to: "2026-08-31" });
  assert.deepEqual(occurrences.map((item) => item.occurrenceDate), ["2026-08-11", "2026-08-13", "2026-08-18", "2026-08-20"]);
  assert.match(recurrenceSummary(recurrenceRule, "2026-08-10"), /4 ocorrências/);
});

test("recorrência mensal por dia pula meses sem dia 31", () => {
  const recurrenceRule = {
    version: 1 as const,
    frequency: "monthly" as const,
    interval: 1,
    monthlyMode: "day_of_month" as const,
    monthDay: 31,
    end: { type: "never" as const },
    timezone: "America/Bahia" as const,
  };
  const base = event({ startAt: "2026-01-31T12:00:00.000Z", endAt: "2026-01-31T13:00:00.000Z", recurrenceRule });
  const occurrences = expandEventOccurrences([base], { from: "2026-01-01", to: "2026-04-30" });
  assert.deepEqual(occurrences.map((item) => item.occurrenceDate), ["2026-01-31", "2026-03-31"]);
});

test("recorrência mensal ordinal suporta último dia da semana", () => {
  const recurrenceRule = {
    version: 1 as const,
    frequency: "monthly" as const,
    interval: 1,
    monthlyMode: "nth_weekday" as const,
    byWeekdays: [1],
    weekdayOrdinal: -1 as const,
    end: { type: "until" as const, date: "2026-10-31" },
    timezone: "America/Bahia" as const,
  };
  const occurrences = expandEventOccurrences([event({ recurrenceRule })], { from: "2026-08-01", to: "2026-10-31" });
  assert.deepEqual(occurrences.map((item) => item.occurrenceDate), ["2026-08-31", "2026-09-28", "2026-10-26"]);
});

test("recorrência anual em 29 de fevereiro só ocorre em ano bissexto", () => {
  const recurrenceRule = quickRecurrenceRule("yearly", "2024-02-29");
  const base = event({ startAt: "2024-02-29T12:00:00.000Z", endAt: "2024-02-29T13:00:00.000Z", recurrenceRule });
  const occurrences = expandEventOccurrences([base], { from: "2024-01-01", to: "2030-12-31" });
  assert.deepEqual(occurrences.map((item) => item.occurrenceDate), ["2024-02-29", "2028-02-29"]);
});

test("evento de dia inteiro e vários dias cruza a janela", () => {
  const occurrences = expandEventOccurrences([event({
    startAt: "2026-08-09T03:00:00.000Z",
    endAt: "2026-08-12T03:00:00.000Z",
    allDay: true,
  })], { from: "2026-08-10", to: "2026-08-10" });
  assert.equal(occurrences.length, 1);
});
