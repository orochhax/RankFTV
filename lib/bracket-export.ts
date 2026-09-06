import type { RoundDisplay, MatchDisplay } from "@/app/painel/campeonatos/[id]/chaveamento/page";

export type ExportShape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill: string; radius: number; stroke?: string }
  | { kind: "text"; x: number; y: number; value: string; size: number; fill: string; bold: boolean }
  | { kind: "line"; x: number; y: number; x2: number; y2: number; fill: string };
export type ExportScene = { width: number; height: number; shapes: ExportShape[]; matchIds: string[] };
export type ExportOptions = { loserRounds?: RoundDisplay[]; title?: string };

// Same card hierarchy as BracketView: header, two athlete rows, blue winner,
// score badges. Wider cards preserve complete athlete names in downloaded files.
export function createBracketExportScene(
  rounds: RoundDisplay[], third?: MatchDisplay | null, options: ExportOptions = {},
): ExportScene {
  const sections = [
    { title: "Chave principal", rounds, fill: "#f9fafb", border: "#e5e7eb" },
    ...(options.loserRounds?.length ? [{ title: "Chave de repescagem", rounds: options.loserRounds, fill: "#fffbeb", border: "#fde68a" }] : []),
    ...(third ? [{ title: "Disputa de 3º lugar", rounds: [{ nome: "Terceiro lugar", roundIndex: 0, matches: [third] }], fill: "#f9fafb", border: "#e5e7eb" }] : []),
  ].filter((section) => section.rounds.length);
  const all = sections.flatMap((section) => section.rounds.flatMap((round) => round.matches));
  const longestName = Math.max(20, ...all.flatMap((m) => [m.teamA, m.teamB].flatMap((t) => (t?.nome ?? "A definir").split(" & ").map((name) => [...name].length))));
  const setCount = Math.max(0, ...all.map((m) => m.setDetails?.length ?? 0));
  const cw = Math.max(320, longestName * 7.5 + 32 + setCount * 28);
  const ch = 144, slot = 160, gap = 32, pad = 24;
  const width = Math.max(1000, ...sections.map((s) => s.rounds.length * (cw + gap) - gap + pad * 4));
  const shapes: ExportShape[] = [];
  const scene: ExportScene = { width, height: 0, shapes, matchIds: [] };
  const rect = (x: number, y: number, w: number, h: number, fill: string, radius = 0, stroke?: string) => shapes.push({ kind: "rect", x, y, w, h, fill, radius, stroke });
  const text = (x: number, y: number, value: string, size = 12, fill = "#374151", bold = false) => shapes.push({ kind: "text", x, y, value, size, fill, bold });
  const line = (x: number, y: number, x2: number, y2: number) => shapes.push({ kind: "line", x, y, x2, y2, fill: "#d1d5db" });

  function card(match: MatchDisplay, x: number, y: number) {
    scene.matchIds.push(match.dbId);
    rect(x, y, cw, ch, "#ffffff", 12, "#e5e7eb");
    rect(x + 1, y + 1, cw - 2, 27, "#f9fafb", 10);
    text(x + 12, y + 18, `#${match.numero}`, 10, "#6b7280", true);
    const court = match.courtLabel ? `QUADRA ${match.courtLabel}` : "QUADRA A DEFINIR";
    rect(x + 50, y + 6, court.length * 5.6 + 12, 16, "#d6d6ff", 8);
    text(x + 56, y + 17, court, 9, "#0000cc", true);
    if (match.setsA !== null && match.setsB !== null) {
      text(x + cw - 58, y + 18, `${match.setsA} × ${match.setsB}`, 12, "#374151", true);
      if (match.setDetails?.length) text(x + cw - 156, y + 17, "PONTOS POR SET", 9, "#9ca3af");
    }
    [match.teamA, match.teamB].forEach((team, i) => {
      const rowY = y + 28 + i * 58;
      const winner = !!team && team.id === match.winnerId;
      if (winner) rect(x + 1, rowY, cw - 2, 57, "#0000ff", i === 1 ? 10 : 0);
      const color = winner ? "#ffffff" : match.winnerId ? "#6b7280" : "#374151";
      if (winner) text(x + 12, rowY + 12, "VENCEDORES", 9, "#d6d6ff", true);
      const names = (team?.nome ?? "A definir").split(" & ");
      text(x + 12, rowY + (winner ? 28 : 23), names[0], 12, color, true);
      if (names[1]) text(x + 12, rowY + (winner ? 43 : 38), names[1], 12, color, true);
      const scores = match.setDetails ?? [];
      scores.forEach((set, index) => {
        const sx = x + cw - 12 - (scores.length - index) * 28;
        rect(sx, rowY + 18, 24, 24, winner ? "#3333ff" : "#f3f4f6", 6);
        text(sx + 5, rowY + 34, String(i === 0 ? set.a : set.b), 12, color, true);
      });
    });
    line(x + 1, y + 86, x + cw - 1, y + 86);
  }

  text(pad, 32, options.title ?? "RankFTV · Chaveamento", 20, "#10152b", true);
  rect(pad, 52, width - pad * 2, 108, "#ffffff", 16, "#e5e7eb");
  text(pad + 16, 76, "Resultado final", 14, "#10152b", true);
  const final = rounds.at(-1)?.matches[0];
  const winnerOf = (m?: MatchDisplay | null) => m?.winnerId ? [m.teamA, m.teamB].find((t) => t?.id === m.winnerId) : null;
  const runner = final?.winnerId ? [final.teamA, final.teamB].find((t) => t && t.id !== final.winnerId) : null;
  [winnerOf(final), runner, winnerOf(third)].forEach((team, i) => {
    const pw = (width - pad * 2 - 48) / 3;
    const x = pad + 16 + i * (pw + 8);
    rect(x, 88, pw, 56, ["#fffbeb", "#f8fafc", "#fff7ed"][i], 12, ["#fcd34d", "#cbd5e1", "#fdba74"][i]);
    text(x + 12, 107, ["1º CAMPEÕES", "2º VICE-CAMPEÕES", "3º TERCEIRO LUGAR"][i], 10, "#6b7280", true);
    const name = team?.nome ?? "A definir";
    text(x + 12, 128, name, Math.min(12, (pw - 24) / Math.max(1, name.length) * 1.6), "#10152b", true);
  });
  let y = 184;
  for (const section of sections) {
    const count = Math.max(1, ...section.rounds.map((r) => r.matches.length));
    const gridH = count * slot;
    rect(pad, y, width - pad * 2, gridH + 84, section.fill, 12, section.border);
    text(pad * 2, y + 24, section.title.toUpperCase(), 12, section.title.includes("repescagem") ? "#b45309" : "#0000cc", true);
    const top = y + 64;
    section.rounds.forEach((round, ri) => {
      const x = pad * 2 + ri * (cw + gap);
      text(x + 12, y + 50, round.nome.toUpperCase(), 11, "#9ca3af", true);
      const cellH = gridH / Math.max(1, round.matches.length);
      const next = section.rounds[ri + 1];
      round.matches.forEach((match, mi) => {
        const cy = top + (mi + 0.5) * cellH;
        card(match, x, cy - ch / 2);
        if (next?.matches.length) {
          const ni = next.matches.length === round.matches.length ? mi : Math.floor(mi / 2);
          if (ni < next.matches.length) {
            const ny = top + (ni + 0.5) * gridH / next.matches.length;
            line(x + cw, cy, x + cw + gap / 2, cy);
            line(x + cw + gap / 2, cy, x + cw + gap / 2, ny);
            line(x + cw + gap / 2, ny, x + cw + gap, ny);
          }
        }
      });
    });
    y += gridH + 108;
  }
  scene.height = y + pad;
  return scene;
}

export function bracketRasterScale(scene: ExportScene): number {
  return Math.min(2, 16000 / scene.width, 16000 / scene.height, Math.sqrt(16000000 / (scene.width * scene.height)));
}
