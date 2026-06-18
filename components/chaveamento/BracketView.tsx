import { Medal } from "lucide-react";
import type { BracketMatch, BracketRound, BracketCategory } from "@/lib/mock/brackets";

// ── SVG das linhas conectoras entre rodadas ───────────────────────────────────
function connectorPaths(numMatchesInRound: number, cellH: number): string {
  const numPairs = numMatchesInRound / 2;
  let d = "";
  for (let i = 0; i < numPairs; i++) {
    const m1c = 2 * i * cellH + cellH / 2;
    const m2c = (2 * i + 1) * cellH + cellH / 2;
    const junction = (m1c + m2c) / 2;
    d += `M 0 ${m1c} H 16 V ${junction} H 32 `;
    d += `M 0 ${m2c} H 16 V ${junction} `;
  }
  return d.trim();
}

// ── Card de uma partida ───────────────────────────────────────────────────────
export function MatchCard({ match }: { match: BracketMatch }) {
  const rows = [
    { dupla: match.duplaA, isWinner: match.winner === "a" },
    { dupla: match.duplaB, isWinner: match.winner === "b" },
  ];
  const decided = match.winner !== null;

  return (
    <div className="w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm text-xs">
      {rows.map(({ dupla, isWinner }, idx) => (
        <div
          key={idx}
          className={[
            "px-3 py-2.5 border-l-[3px]",
            idx === 1 ? "border-t border-gray-100" : "",
            isWinner ? "border-l-blue-500 bg-blue-50" : "border-l-transparent",
          ].filter(Boolean).join(" ")}
        >
          <p className={["truncate font-medium leading-tight", isWinner ? "text-gray-900" : decided ? "text-gray-400" : "text-gray-700"].join(" ")}>
            {isWinner && <span className="mr-1 text-blue-500">✓</span>}
            {dupla.nomes[0]}
          </p>
          <p className="truncate leading-tight text-gray-400">{dupla.nomes[1]}</p>
        </div>
      ))}
      {match.placar && decided && (
        <div className="border-t border-gray-100 px-3 py-1.5 text-[10px] text-gray-400">
          {match.placar}
        </div>
      )}
    </div>
  );
}

// ── Grade de rodadas ──────────────────────────────────────────────────────────
export function BracketGrid({ rounds }: { rounds: BracketRound[] }) {
  const firstRoundCount = rounds[0].matches.length;
  const CELL_H = firstRoundCount <= 2 ? 160 : 128;
  const totalH = firstRoundCount * CELL_H;

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex">
        {rounds.map((round, i) => (
          <div key={round.nome} className="flex shrink-0">
            <div className="w-56 shrink-0 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {round.nome}
            </div>
            {i < rounds.length - 1 && <div className="w-8 shrink-0" />}
          </div>
        ))}
      </div>

      <div className="flex" style={{ height: totalH }}>
        {rounds.map((round, roundIdx) => {
          const numMatches = round.matches.length;
          const cellH = totalH / numMatches;
          return (
            <div key={round.nome} className="flex shrink-0">
              <div className="w-56 shrink-0">
                {round.matches.map((match) => (
                  <div key={match.id} className="flex items-center" style={{ height: cellH }}>
                    <MatchCard match={match} />
                  </div>
                ))}
              </div>
              {roundIdx < rounds.length - 1 && (
                <svg width={32} height={totalH} className="shrink-0" aria-hidden>
                  <path
                    d={connectorPaths(numMatches, cellH)}
                    fill="none"
                    stroke="#D1D5DB"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Vista completa de uma categoria (badge de campeão + grid) ─────────────────
export function BracketCategoryView({ category }: { category: BracketCategory }) {
  const finalMatch = category.rounds[category.rounds.length - 1].matches[0];
  const champion =
    finalMatch.winner === "a" ? finalMatch.duplaA :
    finalMatch.winner === "b" ? finalMatch.duplaB : null;

  return (
    <div className="space-y-4">
      {champion && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
          <Medal className="size-6 shrink-0 text-yellow-500" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-yellow-600">
              Campeões — {category.nome}
            </p>
            <p className="text-sm font-bold text-gray-900">
              {champion.nomes[0]} / {champion.nomes[1]}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-gray-50 p-4 ring-1 ring-black/5">
        <BracketGrid rounds={category.rounds} />
      </div>

      {category.terceiroLugar && (
        <div>
          <p className="mb-2 text-xs font-semibold text-gray-400">Disputa de 3° Lugar</p>
          <MatchCard match={category.terceiroLugar} />
        </div>
      )}
    </div>
  );
}
