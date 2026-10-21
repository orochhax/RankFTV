import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeAiJobResult } from "./ai-job";

describe("Central de Evolução — prévia segura da IA", () => {
  it("expõe somente o resumo necessário para a interface", () => {
    const preview = summarizeAiJobResult({
      review: { score: 72, verdict: "Você avançou, mas ainda não fechou a semana.", summary: "Faltam entregas objetivas.", actions: ["Estudar 2h", 123, "Publicar o vídeo"] },
      youtube: {
        summary: "Radar atualizado com fontes verificadas.",
        items: [{ secret: "não deve sair" }, {}],
        trends: [{}],
        ideas: [{ title: "Ideia válida para o Rocha Tech", score: 91, state: "em_alta", raw: "não deve sair" }],
      },
      internal: { token: "nunca serializar" },
    });

    assert.deepEqual(preview, {
      score: 72,
      verdict: "Você avançou, mas ainda não fechou a semana.",
      summary: "Faltam entregas objetivas.",
      actions: ["Estudar 2h", "Publicar o vídeo"],
      youtubeSummary: "Radar atualizado com fontes verificadas.",
      itemCount: 2,
      trendCount: 1,
      ideas: [{ title: "Ideia válida para o Rocha Tech", score: 91, state: "em_alta" }],
    });
    assert.equal(JSON.stringify(preview).includes("token"), false);
    assert.equal(JSON.stringify(preview).includes("raw"), false);
  });

  it("tolera resultado ausente ou malformado sem quebrar a página", () => {
    assert.deepEqual(summarizeAiJobResult(null), {
      score: null,
      verdict: null,
      summary: null,
      actions: [],
      youtubeSummary: null,
      itemCount: 0,
      trendCount: 0,
      ideas: [],
    });
  });
});
