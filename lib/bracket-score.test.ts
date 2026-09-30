import assert from "node:assert/strict";
import test from "node:test";
import { validateBracketScore } from "./bracket-score";

test("aceita placar quando a contagem dos sets corresponde aos pontos", () => {
  assert.equal(validateBracketScore(2, 1, [
    { a: 7, b: 1 },
    { a: 4, b: 6 },
    { a: 6, b: 3 },
  ]), null);
});

test("recusa quando os pontos indicam outro vencedor por sets", () => {
  assert.equal(validateBracketScore(1, 2, [
    { a: 6, b: 3 },
    { a: 6, b: 4 },
    { a: 0, b: 2 },
  ]), "O placar por sets (1 × 2) não corresponde aos pontos informados (2 × 1 em sets vencidos).");
});

test("recusa set empatado ou sem todos os pontos", () => {
  assert.equal(
    validateBracketScore(2, 0, [{ a: 6, b: 3 }, { a: 0, b: 0 }]),
    "O set 2 não pode terminar empatado.",
  );
  assert.equal(
    validateBracketScore(2, 1, [{ a: 7, b: 1 }, { a: 4, b: 6 }]),
    "Informe os pontos dos 3 sets disputados.",
  );
});
