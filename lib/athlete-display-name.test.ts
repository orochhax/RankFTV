import assert from "node:assert/strict";
import test from "node:test";
import { athleteDisplayName, isValidAthleteName } from "@/lib/athlete-display-name";

test("mantém o nome público do atleta", () => {
  assert.equal(athleteDisplayName("  Ana Souza  "), "Ana Souza");
  assert.equal(isValidAthleteName("Ana Souza"), true);
});

test("nunca usa e-mail ou valor vazio como nome público", () => {
  assert.equal(athleteDisplayName("ana@example.com"), "Atleta não informado");
  assert.equal(athleteDisplayName(null), "Atleta não informado");
  assert.equal(isValidAthleteName("ana@example.com"), false);
});
