import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("CobrancaInput supports maxInstallmentCount", () => {
  const asaasSource = readFileSync(new URL("./asaas.ts", import.meta.url), "utf8");
  assert.match(asaasSource, /maxInstallmentCount\?: number;/);
  assert.match(asaasSource, /body\.maxInstallmentCount = Math\.min\(21, Math\.max\(1, Math\.floor\(input\.maxInstallmentCount\)\)\);/);
});

test("createIdempotentCharge forwards maxInstallmentCount to provider", () => {
  const flowsSource = readFileSync(new URL("./payment-flows.ts", import.meta.url), "utf8");
  assert.match(flowsSource, /maxInstallmentCount\?: number;/);
  assert.match(flowsSource, /maxInstallmentCount: input\.maxInstallmentCount/);
});

test("registration actions query and forward championship max installments", () => {
  const insSource = readFileSync(
    new URL("../app/campeonatos/[id]/inscrever/actions.ts", import.meta.url),
    "utf8",
  );
  assert.match(insSource, /max_parcelas_inscricao/);
  assert.match(insSource, /maxInstallmentCount: metodo === "credito" && maxParcelas > 1 \? maxParcelas : undefined/);

  const compSource = readFileSync(
    new URL("../app/campeonatos/[id]/comprar/actions.ts", import.meta.url),
    "utf8",
  );
  assert.match(compSource, /max_parcelas_ingresso/);
  assert.match(compSource, /maxInstallmentCount: method === "credito" && maxParcelas > 1 \? maxParcelas : undefined/);
});
