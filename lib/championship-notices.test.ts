import assert from "node:assert/strict";
import test from "node:test";
import { buildChampionshipChangeNotice } from "./championship-notices-core";

test("championship notice explains date and location changes", () => {
  const notice = buildChampionshipChangeNotice(
    { dataInicio: "2026-09-10", dataFim: "2026-09-11", cidade: "Salvador", estado: "BA", local: "Arena A" },
    { dataInicio: "2026-09-12", dataFim: "2026-09-13", cidade: "Lauro", estado: "BA", local: "Arena B" },
  );
  assert.equal(notice?.kind, "schedule");
  assert.match(notice?.message ?? "", /Nova data/);
  assert.match(notice?.message ?? "", /Novo local/);
});
