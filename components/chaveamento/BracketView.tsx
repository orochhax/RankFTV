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
  if (numCurrent === numNext) {
    for (let index = 0; index < numCurrent; index += 1) {
      const center = (index + 0.5) * cellH;
      d += `M 0 ${center} H 32 `;
    }
    return d.trim();
  }
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
export function MatchCard({
  match,
  onClick,
  disabled = false,
}: {
  match: BracketMatch;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const rows = [
    { dupla: match.duplaA, isWinner: match.winner === "a", side: "a" as const },
    { dupla: match.duplaB, isWinner: match.winner === "b", side: "b" as const },
  ];
  const decided = match.winner !== null;

  const content = (
    <>
      <div className="flex h-7 items-center justify-between border-b border-gray-100 bg-gray-50 px-3">
        <div className="flex items-center gap-1.5">
          <span className="font-bold tabular-nums text-gray-500">#{match.numero}</span>
          {match.quadra && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-700">
              {match.quadra}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {match.sets && match.sets.length > 0 && (
            <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">
              Pontos por set
            </span>
          )}
          {match.placar && (
            <span className="rounded-full bg-white px-2 py-0.5 font-bold tabular-nums text-gray-700 ring-1 ring-black/5">
              {match.placar}
            </span>
          )}
        </div>
      </div>

      {rows.map(({ dupla, isWinner, side }, idx) => {
        const nameColor = isWinner ? "text-white" : decided ? "text-gray-500" : "text-gray-700";
        return (
          <div
            key={idx}
            className={[
              "flex min-h-14 items-center gap-2 px-3 py-2",
              idx === 1 ? "border-t border-gray-100" : "",
              isWinner ? "bg-blue-600" : "bg-white",
            ].filter(Boolean).join(" ")}
          >
            <div className="min-w-0 flex-1">
              {isWinner && <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wide text-blue-100">Vencedores</span>}
              <p className={`truncate font-semibold leading-tight ${nameColor}`}>{dupla.nomes[0]}</p>
              {dupla.nomes[1] && (
                <p className={`truncate font-semibold leading-tight ${nameColor}`}>{dupla.nomes[1]}</p>
              )}
            </div>
            {match.sets && match.sets.length > 0 && (
              <div className="flex shrink-0 gap-1" aria-label={`Pontos da dupla ${side.toUpperCase()} por set`}>
                {match.sets.map((set, setIndex) => (
                  <span
                    key={setIndex}
                    className={`flex size-6 items-center justify-center rounded-md font-bold tabular-nums ${
                      isWinner ? "bg-white/15 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {set[side]}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );

  const className = [
    "w-64 overflow-hidden rounded-xl border border-gray-200 bg-white text-left text-xs shadow-sm",
    onClick && !disabled ? "cursor-pointer transition hover:border-blue-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-500" : "",
    disabled ? "cursor-default" : "",
  ].filter(Boolean).join(" ");

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={className}
        aria-label={`Editar jogo ${match.numero}`}
        title={disabled ? undefined : "Clique para editar este jogo"}
      >
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}

// ── Grade de rodadas ──────────────────────────────────────────────────────────
export function BracketGrid({
  rounds,
  onMatchClick,
  disabled = false,
}: {
  rounds: BracketRound[];
  onMatchClick?: (match: BracketMatch, round: BracketRound) => void;
  disabled?: boolean;
}) {
  const firstRoundCount = rounds[0].matches.length;
  const CELL_H = firstRoundCount <= 2 ? 180 : 152;
  const totalH = firstRoundCount * CELL_H;

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex">
        {rounds.map((round, i) => (
          <div key={round.nome} className="flex shrink-0">
            <div className="w-64 shrink-0 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">
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
              <div className="w-64 shrink-0">
                {round.matches.map((match) => (
                  <div key={match.id} className="flex items-center" style={{ height: cellH }}>
                    <MatchCard
                      match={match}
                      onClick={onMatchClick ? () => onMatchClick(match, round) : undefined}
                      disabled={disabled}
                    />
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
  const upperFinal = category.rounds[category.rounds.length - 1].matches[0];
  const finalMatch = upperFinal;
  const champion =
    finalMatch.winner === "a" ? finalMatch.duplaA :
    finalMatch.winner === "b" ? finalMatch.duplaB : null;
  const runnerUp =
    finalMatch.winner === "a" ? finalMatch.duplaB :
    finalMatch.winner === "b" ? finalMatch.duplaA : null;
  const third = category.terceiroLugar?.winner === "a"
    ? category.terceiroLugar.duplaA
    : category.terceiroLugar?.winner === "b"
      ? category.terceiroLugar.duplaB
      : null;
  const results = [
    { position: "1º", label: "Campeões", dupla: champion, style: "border-amber-300 bg-amber-50 text-amber-700" },
    { position: "2º", label: "Vice-campeões", dupla: runnerUp, style: "border-slate-300 bg-slate-50 text-slate-600" },
    { position: "3º", label: "Terceiro lugar", dupla: third, style: "border-orange-300 bg-orange-50 text-orange-700" },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Medal className="size-5 text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-gray-900">Resultado final</h2>
            <p className="text-[11px] text-gray-400">Pódio da categoria {category.nome}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {results.map((result) => (
            <div key={result.position} className={`rounded-xl border p-3 ${result.style}`}>
              <div className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/80 text-sm font-black shadow-sm">
                  {result.position}
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{result.label}</p>
                  {result.dupla ? (
                    <p className="truncate text-xs font-bold text-gray-900">
                      {result.dupla.nomes[0]} / {result.dupla.nomes[1]}
                    </p>
                  ) : (
                    <p className="text-xs font-medium opacity-60">A definir</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="overflow-hidden rounded-xl bg-gray-50 p-4 ring-1 ring-black/5">
        {category.formato === "double_elimination" && <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-700">Chave principal</p>}
        <BracketGrid rounds={category.rounds} />
      </div>

      {category.formato === "double_elimination" && category.repescagem && category.repescagem.length > 0 && (
        <div className="overflow-hidden rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Chave de repescagem</p>
            <p className="text-[11px] text-gray-500">A segunda derrota elimina a dupla.</p>
          </div>
          <BracketGrid rounds={category.repescagem} />
        </div>
      )}

      {category.terceiroLugar && (
        <div>
          <p className="mb-2 text-xs font-semibold text-gray-400">Disputa de 3° Lugar</p>
          <MatchCard match={category.terceiroLugar} />
        </div>
      )}
    </div>
  );
}
