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
  assert.deepEqual(publicAsaasError({
    status: 400,
    code: "http_400",
    ambiguous: false,
    operationType: "transfer",
    rawMessage: "Saldo insuficiente para realizar a transferência",
  }), {
    message: "Saldo insuficiente na conta de pagamentos para concluir a transferência Pix.",
    code: "http_400",
    ambiguous: false,
  });
  assert.deepEqual(publicAsaasError({
    status: 400,
    code: "http_400",
    ambiguous: false,
    operationType: "transfer",
    rawMessage: "Chave Pix não encontrada",
  }), {
    message: "A chave Pix foi recusada pelo processador de pagamentos. Verifique sua chave cadastrada.",
    code: "http_400",
    ambiguous: false,
  });
  assert.deepEqual(publicAsaasError({
    status: 400,
    code: "http_400",
    ambiguous: false,
    operationType: "transfer",
  }), {
    message: "Não foi possível concluir o saque via Pix. Revise seus dados ou tente novamente em instantes.",
    code: "http_400",
    ambiguous: false,
  });
});
