import assert from "node:assert/strict";
import test from "node:test";
import { IDEA_APPROACH_KEYS, ideaApproachesSchema, selectBestIdeaApproach, selectBestIdeaApproachesByIdea } from "./idea-approaches";

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

test("selects the highest-scoring approach and uses position as the tie-breaker", () => {
  const approaches = [
    { key: "tutorial", score: 98, position: 2 },
    { key: "story", score: 100, position: 4 },
    { key: "transformation", score: 100, position: 3 },
  ];

  assert.deepEqual(selectBestIdeaApproach(approaches), approaches[2]);
  assert.equal(selectBestIdeaApproach([]), null);
});

test("selects the best approach independently for each idea", () => {
  const bestByIdea = selectBestIdeaApproachesByIdea([
    { idea_id: "a", approach_key: "tutorial_aplicacao", score: 98, position: 2 },
    { idea_id: "a", approach_key: "transformacao_beneficio", score: 100, position: 3 },
    { idea_id: "b", approach_key: "experimento_historia", score: 91, position: 4 },
  ]);

  assert.equal(bestByIdea.get("a")?.approach_key, "transformacao_beneficio");
  assert.equal(bestByIdea.get("b")?.score, 91);
});
