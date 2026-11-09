import test from "node:test";
import assert from "node:assert/strict";
import {
  podePublicarCampeonatoPago,
  getStatusVerificacaoBadge,
  MOTIVOS_REJEICAO_PREDEFINIDOS,
} from "./organizer-kyc";

test("organizer kyc - autorização de publicação de campeonatos pagos", () => {
  assert.equal(podePublicarCampeonatoPago("aprovado"), true);
  assert.equal(podePublicarCampeonatoPago("em_analise"), false);
  assert.equal(podePublicarCampeonatoPago("pendente_documentos"), false);
  assert.equal(podePublicarCampeonatoPago("rejeitado"), false);
  assert.equal(podePublicarCampeonatoPago(null), false);
  assert.equal(podePublicarCampeonatoPago(undefined), false);
});

test("organizer kyc - motivos de rejeição predefinidos", () => {
  assert.ok(MOTIVOS_REJEICAO_PREDEFINIDOS.length >= 5);
  assert.ok(MOTIVOS_REJEICAO_PREDEFINIDOS.some((m) => m.includes("Foto do documento")));
  assert.ok(MOTIVOS_REJEICAO_PREDEFINIDOS.some((m) => m.includes("Selfie")));
  assert.ok(MOTIVOS_REJEICAO_PREDEFINIDOS.some((m) => m.includes("Chave Pix")));
});

test("organizer kyc - badges semânticos", () => {
  assert.equal(getStatusVerificacaoBadge("aprovado").variant, "success");
  assert.equal(getStatusVerificacaoBadge("em_analise").variant, "warning");
  assert.equal(getStatusVerificacaoBadge("rejeitado").variant, "danger");
  assert.equal(getStatusVerificacaoBadge("pendente_documentos").variant, "neutral");
  assert.equal(getStatusVerificacaoBadge(null).variant, "neutral");
});
