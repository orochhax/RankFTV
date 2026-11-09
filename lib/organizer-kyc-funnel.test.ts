import test from "node:test";
import assert from "node:assert/strict";
import {
  podePublicarCampeonatoPago,
  getStatusVerificacaoBadge,
  MOTIVOS_REJEICAO_PREDEFINIDOS,
  type StatusVerificacaoOrganizador,
} from "./organizer-kyc";

test("organizer kyc funnel - regras de publicação de campeonato", () => {
  // Apenas organizadores aprovados pelo CEO podem publicar produtos pagos
  const statusAprovado: StatusVerificacaoOrganizador = "aprovado";
  assert.equal(podePublicarCampeonatoPago(statusAprovado), true);

  const statusEmAnalise: StatusVerificacaoOrganizador = "em_analise";
  assert.equal(podePublicarCampeonatoPago(statusEmAnalise), false);

  const statusRejeitado: StatusVerificacaoOrganizador = "rejeitado";
  assert.equal(podePublicarCampeonatoPago(statusRejeitado), false);

  const statusPendente: StatusVerificacaoOrganizador = "pendente_documentos";
  assert.equal(podePublicarCampeonatoPago(statusPendente), false);

  assert.equal(podePublicarCampeonatoPago(null), false);
  assert.equal(podePublicarCampeonatoPago(undefined), false);
});

test("organizer kyc funnel - opções predefinidas de rejeição solicitadas pelo CEO", () => {
  assert.equal(MOTIVOS_REJEICAO_PREDEFINIDOS.length, 6);
  assert.ok(MOTIVOS_REJEICAO_PREDEFINIDOS.includes("Foto do documento ilegível, cortada ou escura"));
  assert.ok(MOTIVOS_REJEICAO_PREDEFINIDOS.includes("Selfie não confere com o rosto no documento ou sem nitidez"));
  assert.ok(MOTIVOS_REJEICAO_PREDEFINIDOS.includes("Documento vencido, não aceito ou rasurado (aceito apenas RG ou CNH)"));
  assert.ok(MOTIVOS_REJEICAO_PREDEFINIDOS.includes("CPF ou Nome informado diverge do documento apresentado"));
  assert.ok(MOTIVOS_REJEICAO_PREDEFINIDOS.includes("Chave Pix informada pertence a outra pessoa (deve ser no mesmo CPF/CNPJ)"));
  assert.ok(MOTIVOS_REJEICAO_PREDEFINIDOS.includes("Outro motivo (especificar)"));
});

test("organizer kyc funnel - montagem de mensagem de rejeição com observação", () => {
  function montarMotivoFinal(motivoPredefinido: string, observacao?: string) {
    const motivoTrim = motivoPredefinido.trim();
    const obsTrim = observacao?.trim() ?? "";

    if (motivoTrim === "Outro motivo (especificar)") {
      if (!obsTrim) return { ok: false, error: "Especifique o motivo." };
      return { ok: true, motivo: obsTrim };
    }
    if (obsTrim) {
      return { ok: true, motivo: `${motivoTrim}. Observação: ${obsTrim}` };
    }
    return { ok: true, motivo: motivoTrim };
  }

  const simples = montarMotivoFinal("Foto do documento ilegível, cortada ou escura");
  assert.equal(simples.ok, true);
  assert.equal(simples.motivo, "Foto do documento ilegível, cortada ou escura");

  const comObs = montarMotivoFinal(
    "Foto do documento ilegível, cortada ou escura",
    "Parte superior do RG cortou a data de expedição"
  );
  assert.equal(comObs.ok, true);
  assert.equal(comObs.motivo, "Foto do documento ilegível, cortada ou escura. Observação: Parte superior do RG cortou a data de expedição");

  const outroSemObs = montarMotivoFinal("Outro motivo (especificar)", "");
  assert.equal(outroSemObs.ok, false);

  const outroComObs = montarMotivoFinal("Outro motivo (especificar)", "Documento não possui foto");
  assert.equal(outroComObs.ok, true);
  assert.equal(outroComObs.motivo, "Documento não possui foto");
});

test("organizer kyc funnel - badges visuais e textos explicativos", () => {
  const emAnalise = getStatusVerificacaoBadge("em_analise");
  assert.equal(emAnalise.label, "Em Análise");
  assert.equal(emAnalise.variant, "warning");

  const aprovado = getStatusVerificacaoBadge("aprovado");
  assert.equal(aprovado.label, "Verificado e Aprovado");
  assert.equal(aprovado.variant, "success");

  const rejeitado = getStatusVerificacaoBadge("rejeitado");
  assert.equal(rejeitado.label, "Documentos Recusados");
  assert.equal(rejeitado.variant, "danger");

  const pendente = getStatusVerificacaoBadge("pendente_documentos");
  assert.equal(pendente.label, "Pendente de Documentos");
  assert.equal(pendente.variant, "neutral");
});
