import assert from "node:assert/strict";
import test from "node:test";
import { formatCpf, normalizeCpf } from "@/lib/cpf";

test("normaliza CPF cru ou formatado para onze dígitos", () => {
  assert.equal(normalizeCpf("52998224725"), "52998224725");
  assert.equal(normalizeCpf("529.982.247-25"), "52998224725");
});

test("formata progressivamente um CPF digitado", () => {
  assert.equal(formatCpf("52998224725"), "529.982.247-25");
  assert.equal(formatCpf("529.98"), "529.98");
});
