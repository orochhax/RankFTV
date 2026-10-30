import assert from "node:assert/strict";
import test from "node:test";
import { IDEA_APPROACH_KEYS, ideaApproachesSchema } from "./idea-approaches";

const validApproaches = IDEA_APPROACH_KEYS.map((approachKey, index) => ({
  approachKey,
  title: `Título editorial suficientemente completo ${index + 1}`,
  explanation: "Explicação clara da lógica desta forma de executar o vídeo.",
  promise: "Promessa concreta e verificável que o espectador receberá.",
  demonstration: "Demonstração visual ou prática que Carlos poderá mostrar.",
  whyItWorks: "Motivo editorial sustentado por utilidade e padrão observado.",
  timeliness: "Oportunidade atual bem explicada.",
  longevity: "Vida útil estimada além do lançamento.",
  requirementsSummary: "Ferramentas gratuitas são suficientes.",
  score: 80 + index,
}));

test("requires exactly the four editorial approaches", () => {
  assert.equal(ideaApproachesSchema.parse(validApproaches).length, 4);
  assert.throws(() => ideaApproachesSchema.parse(validApproaches.slice(0, 3)));
  assert.throws(() => ideaApproachesSchema.parse([...validApproaches.slice(0, 3), validApproaches[0]]));
});
