import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { resolveCategoryPriceComposition } from "./category-price-display";

test("compõe visualmente valor-base, taxa e total Pix sem alterar o cálculo padrão", () => {
  assert.deepEqual(resolveCategoryPriceComposition(100), {
    basePrice: 100,
    serviceFee: 8,
    pixTotal: 108,
  });
});

test("respeita taxa mínima, plano Elite e gratuidade", () => {
  assert.deepEqual(resolveCategoryPriceComposition(10), {
    basePrice: 10,
    serviceFee: 3.99,
    pixTotal: 13.99,
  });
  assert.deepEqual(resolveCategoryPriceComposition(100, true), {
    basePrice: 100,
    serviceFee: 7,
    pixTotal: 107,
  });
  assert.deepEqual(resolveCategoryPriceComposition(0), {
    basePrice: 0,
    serviceFee: 0,
    pixTotal: 0,
  });
});

test("a etapa de escolha da categoria separa valor-base e taxa de serviço", () => {
  const form = readFileSync(
    path.join(process.cwd(), "components/campeonatos/IngressoAtletaForm.tsx"),
    "utf8",
  );

  assert.match(form, /resolveCategoryPriceComposition\(v, isElite\)/);
  assert.match(form, /Valor da inscrição/);
  assert.match(form, /price\.basePrice/);
  assert.match(form, /price\.serviceFee/);
  assert.match(form, /Total no Pix/);
  assert.doesNotMatch(form, /com taxa ·/);
});
