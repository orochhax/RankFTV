import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { detectarTipoChavePix, pixKeyEmCooldown, PIX_COOLDOWN_HORAS, compararTitularidadePix } from "@/lib/pix";

describe("detectarTipoChavePix", () => {
  test("e-mail", () => {
    assert.equal(detectarTipoChavePix("dono@arena.com"), "EMAIL");
  });
  test("CPF (11 dígitos)", () => {
    assert.equal(detectarTipoChavePix("11122233344"), "CPF");
  });
  test("CNPJ (14 dígitos)", () => {
    assert.equal(detectarTipoChavePix("11222333000144"), "CNPJ");
  });
  test("telefone", () => {
    assert.equal(detectarTipoChavePix("+5511987654321"), "PHONE");
  });
  test("chave aleatória (UUID) cai em EVP", () => {
    assert.equal(detectarTipoChavePix("a1b2c3d4-e5f6-47a8-9b0c-1d2e3f4a5b6c"), "EVP");
  });
});

describe("pixKeyEmCooldown (retém repasse depois de trocar a chave — sem verificação de titularidade do Asaas)", () => {
  const agora = new Date("2026-07-20T12:00:00Z");

  test("nunca alterada explicitamente (chave_pix_atualizada_em nulo) — sem cooldown", () => {
    assert.equal(pixKeyEmCooldown(null, agora), false);
  });

  test("alterada há 1 hora — ainda em cooldown", () => {
    const umaHoraAtras = new Date(agora.getTime() - 1 * 60 * 60 * 1000).toISOString();
    assert.equal(pixKeyEmCooldown(umaHoraAtras, agora), true);
  });

  test(`alterada há ${PIX_COOLDOWN_HORAS - 1}h — ainda em cooldown`, () => {
    const quaseNoFim = new Date(agora.getTime() - (PIX_COOLDOWN_HORAS - 1) * 60 * 60 * 1000).toISOString();
    assert.equal(pixKeyEmCooldown(quaseNoFim, agora), true);
  });

  test(`alterada há mais de ${PIX_COOLDOWN_HORAS}h — cooldown liberado`, () => {
    const passouDoPrazo = new Date(agora.getTime() - (PIX_COOLDOWN_HORAS + 1) * 60 * 60 * 1000).toISOString();
    assert.equal(pixKeyEmCooldown(passouDoPrazo, agora), false);
  });
});

describe("compararTitularidadePix (só bloqueia com resposta inequívoca da Asaas)", () => {
  test("CPFs completos e iguais (com formatação diferente) — confere", () => {
    assert.equal(compararTitularidadePix("111.222.333-44", "11122233344"), "confere");
  });

  test("CPFs completos e diferentes — não confere", () => {
    assert.equal(compararTitularidadePix("11122233344", "99988877766"), "nao_confere");
  });

  test("CNPJs completos e iguais — confere", () => {
    assert.equal(compararTitularidadePix("11222333000144", "11.222.333/0001-44"), "confere");
  });

  test("resposta mascarada (sandbox) nunca bloqueia — não verificável", () => {
    assert.equal(compararTitularidadePix("****.202.745-**", "11122233344"), "nao_verificavel");
  });

  test("resposta nula (lookup falhou/rate limit) — não verificável", () => {
    assert.equal(compararTitularidadePix(null, "11122233344"), "nao_verificavel");
  });

  test("sem CPF/CNPJ conhecido do nosso lado — não verificável", () => {
    assert.equal(compararTitularidadePix("11122233344", null), "nao_verificavel");
    assert.equal(compararTitularidadePix("11122233344", ""), "nao_verificavel");
  });
});
