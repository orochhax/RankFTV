import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsCardSource = readFileSync("components/painel/CampeonatoResultsCard.tsx", "utf8");
const actionsSource = readFileSync("components/painel/ChampionshipActions.tsx", "utf8");
const panelPageSource = readFileSync("app/painel/campeonatos/[id]/page.tsx", "utf8");
const shellSource = readFileSync("components/painel/ChampionshipShell.tsx", "utf8");
const gridSource = readFileSync("components/painel/MeusCampeonatosGrid.tsx", "utf8");
const plateiaListaSource = readFileSync("app/painel/campeonatos/[id]/plateia/lista/page.tsx", "utf8");
const plateiaFinSource = readFileSync("app/painel/campeonatos/[id]/plateia/financeiro/page.tsx", "utf8");

test("CampeonatoResultsCard renders PRO benefits including verified badge and featured tournament", () => {
  assert.match(resultsCardSource, /Selo de Verificado/);
  assert.match(resultsCardSource, /Torneio oficial verificado com selo de credibilidade/);
  assert.match(resultsCardSource, /Campeonato em Destaque/);
  assert.match(resultsCardSource, /Posição de destaque na Home/);
  assert.match(resultsCardSource, /Modo Telão ao Vivo/);
  assert.match(resultsCardSource, /Dossiê de Patrocínio/);
  assert.match(resultsCardSource, /Troca de Duplas Automática/);
  assert.match(resultsCardSource, /BadgeCheck/);
  assert.match(resultsCardSource, /Star/);
});

test("PainelCampeonatoPage redirects UUID to friendly slug and unifies team vacancies", () => {
  assert.match(panelPageSource, /isUuid\(id\) && publicSlug !== id/);
  assert.match(panelPageSource, /redirect\(`\/painel\/campeonatos\/\$\{publicSlug\}`\)/);
  assert.match(panelPageSource, /label="Duplas inscritas"/);
  assert.match(panelPageSource, /\$\{duplasPagas\} \/ \$\{vagasTotais\}/);
  assert.match(panelPageSource, /Ingressos de plateia/);
  assert.match(panelPageSource, /temPlateia \?/);
  assert.match(panelPageSource, /Indisponível/);
  assert.match(panelPageSource, /Nenhum lote criado/);
});

test("ChampionshipActions and Shell lock spectator subactions when no spectator tickets exist", () => {
  assert.match(actionsSource, /temPlateia = true/);
  assert.match(actionsSource, /group\.label === "Espectadores" && !temPlateia && item\.key !== "plateia"/);
  assert.match(actionsSource, /Indisponível/);
  assert.match(shellSource, /temPlateia\?: boolean/);
  assert.match(shellSource, /group\.label === "Espectadores" && !temPlateia && item\.key !== "plateia"/);
});

test("MeusCampeonatosGrid uses friendly championship slug for overview navigation", () => {
  assert.match(gridSource, /getChampionshipSlug/);
  assert.match(gridSource, /overviewHref = c\.status === "rascunho"/);
  assert.match(gridSource, /\/painel\/campeonatos\/\$\{slug\}/);
});

test("Spectator subpages safely guard against unconfigured championships and support slugs", () => {
  assert.match(plateiaListaSource, /getDbChampionshipById/);
  assert.match(plateiaListaSource, /spectator_ticket_types/);
  assert.match(plateiaListaSource, /redirect\(`\/painel\/campeonatos\/\$\{id\}\/plateia`\)/);
  assert.match(plateiaFinSource, /getDbChampionshipById/);
  assert.match(plateiaFinSource, /spectator_ticket_types/);
  assert.match(plateiaFinSource, /redirect\(`\/painel\/campeonatos\/\$\{id\}\/plateia`\)/);
});

test("Management subpages resolve slug and safely use UUID for database operations", () => {
  const finSource = readFileSync("app/painel/campeonatos/[id]/financeiro/page.tsx", "utf8");
  const finLoaderSource = readFileSync("lib/financial-data-loader.tsx", "utf8");
  const cuponsSource = readFileSync("app/painel/campeonatos/[id]/cupons/page.tsx", "utf8");
  const lotesSource = readFileSync("app/painel/campeonatos/[id]/lotes/page.tsx", "utf8");
  const chaveSource = readFileSync("app/painel/campeonatos/[id]/chaveamento/page.tsx", "utf8");
  const camisasSource = readFileSync("app/painel/campeonatos/[id]/camisas/page.tsx", "utf8");

  assert.match(finSource, /getDbChampionshipById/);
  assert.match(finLoaderSource, /const champId = camp\.id/);
  assert.match(finLoaderSource, /p_championship_id: champId/);
  assert.match(cuponsSource, /getDbChampionshipById/);
  assert.match(cuponsSource, /eq\("championship_id", champId\)/);
  assert.match(lotesSource, /getDbChampionshipById/);
  assert.match(lotesSource, /eq\("championship_id", champId\)/);
  assert.match(chaveSource, /eq\("championship_id", champId\)/);
  assert.match(camisasSource, /eq\("championship_id", champId\)/);
});
