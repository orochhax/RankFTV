import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidCardHolderPhone,
  normalizeAddressComplement,
  normalizeCardHolderPhone,
} from "./card-holder";

test("normaliza telefone brasileiro do titular", () => {
  assert.equal(normalizeCardHolderPhone("(73) 99902-4324"), "73999024324");
  assert.equal(normalizeCardHolderPhone("73 3300-1234"), "7333001234");
});

test("aceita telefone com DDD e rejeita número incompleto", () => {
  assert.equal(isValidCardHolderPhone("(73) 99902-4324"), true);
  assert.equal(isValidCardHolderPhone("(73) 3300-1234"), true);
  assert.equal(isValidCardHolderPhone("7399024324"), true);
  assert.equal(isValidCardHolderPhone("99902-4324"), false);
});

test("limita e limpa o complemento do endereço", () => {
  assert.equal(normalizeAddressComplement("  Apto 12  "), "Apto 12");
  assert.equal(normalizeAddressComplement("x".repeat(80)).length, 60);
});
