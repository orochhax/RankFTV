import assert from "node:assert/strict";
import test from "node:test";
import { publicAsaasError } from "./financial-error-messages";

test("não devolve mensagens internas do provedor ao navegador", () => {
  assert.deepEqual(publicAsaasError({ status: 422, code: "http_422", ambiguous: false }), {
    message: "O pagamento foi recusado. Revise os dados e tente novamente.",
    code: "http_422",
    ambiguous: false,
  });
  assert.deepEqual(publicAsaasError({ status: 503, code: "http_503", ambiguous: true }), {
    message: "Não foi possível confirmar a resposta do pagamento.",
    code: "http_503",
    ambiguous: true,
  });
  assert.deepEqual(publicAsaasError({
    status: 400,
    code: "http_400",
    ambiguous: false,
    billingType: "PIX",
  }), {
    message: "Não foi possível gerar a cobrança Pix. Tente novamente em instantes.",
    code: "http_400",
    ambiguous: false,
  });
});
