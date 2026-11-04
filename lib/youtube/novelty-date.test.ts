import test from "node:test";
import assert from "node:assert/strict";
import { getIdeaNovelty } from "./novelty-date";

const baseIdea = { title: "Como organizar sua semana", summary: "Um método prático", angle: "Aplicação", hook: "Você não precisa de mais uma ferramenta" };

test("marca pautas sem lançamento específico", () => {
  const result = getIdeaNovelty(baseIdea, [{ title: "Como trabalhar melhor", published_at: "2026-10-20T00:00:00Z" }]);
  assert.equal(result.isSpecificLaunch, false);
  assert.match(result.label, /não é relacionada/);
});

test("usa a data mais recente da fonte para uma novidade", () => {
  const result = getIdeaNovelty({ ...baseIdea, title: "Claude Duet explicado: novo agente" }, [
    { title: "Anúncio inicial", published_at: "2026-10-18T00:00:00Z" },
    { title: "Claude Duet estreia", published_at: "2026-10-23T00:00:00Z" },
  ]);
  assert.equal(result.isSpecificLaunch, true);
  assert.equal(result.date, "2026-10-23T00:00:00Z");
  assert.equal(result.sourceTitle, "Claude Duet estreia");
});
