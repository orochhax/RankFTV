import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("CobrancaInput supports maxInstallmentCount via /paymentLinks INSTALLMENT", () => {
  const asaasSource = readFileSync(new URL("./asaas.ts", import.meta.url), "utf8");
  assert.match(asaasSource, /maxInstallmentCount\?: number;/);
  assert.match(asaasSource, /request<\{ id: string; url: string \}>\("\/paymentLinks"/);
  assert.match(asaasSource, /chargeType:\s+"INSTALLMENT"/);
  assert.match(asaasSource, /billingType:\s+"CREDIT_CARD"/);
  assert.match(asaasSource, /name:\s+input\.descricao\.slice\(0, 100\)/);
  assert.match(asaasSource, /maxInstallmentCount:\s+maxParcelas/);
  assert.match(asaasSource, /notificationEnabled:\s+true/);
  assert.match(asaasSource, /return \{ id: link\.id, invoiceUrl: link\.url, status: "ACTIVE", billingType: "CREDIT_CARD" \};/);
  assert.doesNotMatch(asaasSource, /body\.maxInstallmentCount/);
});

test("webhook reconciles payment link ids and relinks to payment id", () => {
  const core = readFileSync(new URL("./asaas-webhook-core.ts", import.meta.url), "utf8");
  assert.match(core, /paymentLink\?: string;/);
  const route = readFileSync(new URL("../app/api/webhooks/asaas/route.ts", import.meta.url), "utf8");
  assert.match(route, /data\?\.asaas_payment_id === payment\.paymentLink/);
  assert.match(route, /\.update\(\{ asaas_payment_id: payment\.id \}\)/);
  assert.match(route, /operation\.provider_id === body\.payment\.paymentLink/);
  assert.match(route, /\.from\("financial_operations"\)\s*\.update\(\{ provider_id: body\.payment\.id \}\)/);
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
