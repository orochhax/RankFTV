import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  nthBusinessDayOfMonth,
  computeEffectiveDateForMonth,
  splitAmountEqually,
  isBusinessDay,
} from "@/lib/personal-finance";

describe("nthBusinessDayOfMonth", () => {
  // 2026-06-01 é segunda-feira — mês inteiro alinhado, sem dia útil "perdido" na 1ª semana.
  test("mês começando na segunda-feira (junho/2026)", () => {
    assert.equal(nthBusinessDayOfMonth("2026-06", 1), "2026-06-01");
    assert.equal(nthBusinessDayOfMonth("2026-06", 5), "2026-06-05");
  });

  // 2026-08-01 é sábado — os 2 primeiros dias do mês não contam como dia útil.
  test("mês começando no sábado (agosto/2026)", () => {
    assert.equal(nthBusinessDayOfMonth("2026-08", 1), "2026-08-03");
    assert.equal(nthBusinessDayOfMonth("2026-08", 5), "2026-08-07");
  });

  // 2026-11-01 é domingo — o 1º dia do mês não conta como dia útil.
  test("mês começando no domingo (novembro/2026)", () => {
    assert.equal(nthBusinessDayOfMonth("2026-11", 1), "2026-11-02");
    assert.equal(nthBusinessDayOfMonth("2026-11", 5), "2026-11-06");
  });

  test("posição maior que a quantidade de dias úteis do mês cai no último dia útil", () => {
    // Fevereiro/2026 (28 dias, não bissexto) tem 20 dias úteis.
    const ultimo = nthBusinessDayOfMonth("2026-02", 20);
    assert.equal(nthBusinessDayOfMonth("2026-02", 23), ultimo);
    assert.ok(isBusinessDay(ultimo));
  });
});

describe("computeEffectiveDateForMonth", () => {
  test("calendar_day usa o dia escolhido quando o mês tem esse dia", () => {
    assert.equal(computeEffectiveDateForMonth("calendar_day", 15, "2026-01-15", "2026-03"), "2026-03-15");
  });

  test("calendar_day dia 31 clampa no último dia de fevereiro (não bissexto)", () => {
    assert.equal(computeEffectiveDateForMonth("calendar_day", 31, "2026-01-31", "2026-02"), "2026-02-28");
  });

  test("business_day varia conforme o calendário de cada mês (não é sempre o dia 5)", () => {
    const junho = computeEffectiveDateForMonth("business_day", 5, "2026-06-01", "2026-06");
    const agosto = computeEffectiveDateForMonth("business_day", 5, "2026-06-01", "2026-08");
    const novembro = computeEffectiveDateForMonth("business_day", 5, "2026-06-01", "2026-11");
    assert.equal(junho, "2026-06-05");
    assert.equal(agosto, "2026-08-07");
    assert.equal(novembro, "2026-11-06");
    assert.notEqual(junho.slice(8), agosto.slice(8));
  });

  test("sem regra de recorrência (fallback), preserva o dia original (comportamento legado)", () => {
    assert.equal(computeEffectiveDateForMonth(null, null, "2026-01-15", "2026-03"), "2026-03-15");
  });
});

describe("splitAmountEqually", () => {
  test("R$300 dividido igualmente resulta em R$150 para cada", () => {
    const { carlos, julia } = splitAmountEqually(300);
    assert.equal(carlos, 150);
    assert.equal(julia, 150);
  });

  test("R$301,01 nunca perde nem cria centavos — Carlos fica com a metade arredondada pra baixo", () => {
    const { carlos, julia } = splitAmountEqually(301.01);
    assert.equal(carlos, 150.5);
    assert.equal(julia, 150.51);
    assert.equal(Math.round((carlos + julia) * 100), 30101);
  });

  test("valor com centavo par divide exatamente sem sobra", () => {
    const { carlos, julia } = splitAmountEqually(100);
    assert.equal(carlos, 50);
    assert.equal(julia, 50);
  });
});
