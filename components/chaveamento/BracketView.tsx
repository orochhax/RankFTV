import { Medal } from "lucide-react";
import type { BracketMatch, BracketRound, BracketCategory } from "@/lib/types";

// ── SVG das linhas conectoras entre rodadas ───────────────────────────────────
// Conecta cada jogo da próxima rodada (j) aos seus alimentadores na rodada atual
// (2j e 2j+1). Usa os centros REAIS dos cards — então funciona mesmo quando a
// rodada não tem o dobro de jogos da seguinte (1 semi → 1 final, byes, etc.),
// sem desenhar linha pra posição vazia.
function connectorPaths(numCurrent: number, numNext: number, totalH: number): string {
  const cellH = totalH / numCurrent;
  const nextCellH = totalH / numNext;
  let d = "";
  for (let j = 0; j < numNext; j++) {
    const feeders = [2 * j, 2 * j + 1].filter((idx) => idx < numCurrent);
    if (feeders.length === 0) continue;
    const junction = (j + 0.5) * nextCellH; // centro do jogo j na próxima rodada
    for (const idx of feeders) {
      const c = (idx + 0.5) * cellH; // centro do alimentador
      d += `M 0 ${c} H 16 V ${junction} `;
    }
    d += `M 16 ${junction} H 32 `; // entra na próxima rodada
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
      {rows.map(({ dupla, isWinner }, idx) => {
        const nameColor = isWinner ? "text-gray-900" : decided ? "text-gray-400" : "text-gray-700";
        return (
          <div
            key={idx}
            className={[
              "px-3 py-2.5 border-l-[3px]",
              idx === 1 ? "border-t border-gray-100" : "",
              isWinner ? "border-l-blue-500 bg-blue-50" : "border-l-transparent",
            ].filter(Boolean).join(" ")}
          >
            {isWinner && <span className="mb-0.5 block text-[10px] text-blue-500">✓ Vencedor</span>}
            <p className={`truncate font-medium leading-tight ${nameColor}`}>{dupla.nomes[0]}</p>
            {dupla.nomes[1] && (
              <p className={`truncate font-medium leading-tight ${nameColor}`}>{dupla.nomes[1]}</p>
            )}
          </div>
        );
      })}
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
                    d={connectorPaths(numMatches, rounds[roundIdx + 1].matches.length, totalH)}
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
