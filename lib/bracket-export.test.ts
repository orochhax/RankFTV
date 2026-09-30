import assert from "node:assert/strict";
import test from "node:test";
import { createBracketExportScene, bracketRasterScale } from "./bracket-export";
import { createDoubleEliminationPlan } from "./double-elimination";
import type { MatchDisplay, RoundDisplay } from "@/app/painel/campeonatos/[id]/chaveamento/page";

export function exportFixture(count: number) {
  const plan = createDoubleEliminationPlan(Array.from({ length: count }, (_, i) => `p${i}`));
  const upper = new Map<number, RoundDisplay>(), lower = new Map<number, RoundDisplay>();
  let third: MatchDisplay | undefined;
  plan.forEach((m, i) => {
    const row: MatchDisplay = {
      dbId: m.key, numero: i + 1, roundIndex: m.roundIndex, matchIndex: m.matchIndex,
      teamA: { id: `a${i}`, nome: "João Teste & André Teste" },
      teamB: { id: `b${i}`, nome: "Maria Teste & Júlia Teste" },
      winnerId: `a${i}`, setsA: 2, setsB: 0, setDetails: [{ a: 18, b: 12 }, { a: 18, b: 15 }],
      courtLabel: "1", section: m.section,
    };
    if (m.section === "third_place") { third = row; return; }
    const map = m.section === "losers" ? lower : upper;
    if (!map.has(m.sectionRoundIndex)) map.set(m.sectionRoundIndex, { nome: `${m.section === "losers" ? "Repescagem" : "Fase"} ${m.sectionRoundIndex + 1}`, roundIndex: m.sectionRoundIndex, matches: [] });
    map.get(m.sectionRoundIndex)!.matches.push(row);
  });
  return { rounds: [...upper.values()], loserRounds: [...lower.values()], third, plan };
}

for (const count of [8, 16, 32, 64, 128, 256]) {
  test(`exportação de ${count} duplas inclui cada jogo uma vez e mantém todo o desenho dentro da página`, () => {
    const f = exportFixture(count);
    const scene = createBracketExportScene(f.rounds, f.third, { loserRounds: f.loserRounds });
    assert.deepEqual([...scene.matchIds].sort(), f.plan.map((m) => m.key).sort());
    for (const s of scene.shapes) {
      assert.ok(s.x >= 0 && s.y >= 0 && s.x <= scene.width && s.y <= scene.height);
      if (s.kind === "rect") assert.ok(s.x + s.w <= scene.width && s.y + s.h <= scene.height);
      if (s.kind === "line") assert.ok(s.x2 <= scene.width && s.y2 <= scene.height);
    }
    const scale = bracketRasterScale(scene);
    assert.ok(scene.width * scale <= 16000.001 && scene.height * scale <= 16000.001);
    assert.ok(scene.width * scene.height * scale ** 2 <= 16000001);
    const text = scene.shapes.filter((s) => s.kind === "text").map((s) => s.value).join("\n");
    assert.match(text, /CHAVE DE REPESCAGEM/);
    assert.match(text, /DISPUTA DE 3º LUGAR/);
    assert.match(text, /QUADRA 1/);
    assert.match(text, /PONTOS POR SET/);
    assert.match(text, /João Teste/);
  });
}
