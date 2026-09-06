import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const championshipPage = readFileSync(
  "app/campeonatos/[id]/page.tsx",
  "utf8",
);
const athleteCheckoutPage = readFileSync(
  "app/campeonatos/[id]/comprar/page.tsx",
  "utf8",
);

test("championship details defer categories to the athlete checkout flow", () => {
  assert.doesNotMatch(championshipPage, /PublicCategoryOptions/);
  assert.match(championshipPage, />Sou atleta</);
  assert.match(
    championshipPage,
    /href=\{`\/campeonatos\/\$\{championship\.id\}\/comprar`\}/,
  );

  assert.match(athleteCheckoutPage, /\.from\("championship_categories"\)/);
  assert.match(athleteCheckoutPage, /<IngressoAtletaForm/);
});
