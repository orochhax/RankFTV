import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { gerarCodigoOtp, hashCodigoOtp, compararHashOtp } from "@/lib/otp";

describe("gerarCodigoOtp", () => {
  test("sempre 6 dígitos numéricos, com zero à esquerda quando preciso", () => {
    for (let i = 0; i < 50; i++) {
      const codigo = gerarCodigoOtp();
      assert.match(codigo, /^\d{6}$/);
    }
  });
});

describe("compararHashOtp (comparação em tempo constante do código de recuperação de ingresso)", () => {
  test("código certo confere com o hash salvo", () => {
    const codigo = "123456";
    const hash = hashCodigoOtp(codigo);
    assert.equal(compararHashOtp(codigo, hash), true);
  });

  test("código errado não confere", () => {
    const hash = hashCodigoOtp("123456");
    assert.equal(compararHashOtp("654321", hash), false);
  });

  test("código com tamanho diferente não confere (não lança)", () => {
    const hash = hashCodigoOtp("123456");
    assert.equal(compararHashOtp("1", hash), false);
  });

  test("hash nunca guarda o código em texto puro", () => {
    const hash = hashCodigoOtp("123456");
    assert.ok(!hash.includes("123456"));
  });
});
