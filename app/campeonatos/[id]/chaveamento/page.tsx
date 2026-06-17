import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, ChevronLeft, Medal } from "lucide-react";
import {
  BRACKETS,
  getBracket,
  type BracketMatch,
  type BracketRound,
} from "@/lib/mock/brackets";
import { getChampionshipById } from "@/lib/mock/championships";

export async function generateStaticParams() {
  return BRACKETS.map((b) => ({ id: b.championshipId }));
}

// Calcula os paths SVG das linhas conectoras entre rodadas do bracket.
// Cada par de partidas na rodada N converge para uma partida na rodada N+1.
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

function MatchCard({ match, showScore = true }: { match: BracketMatch; showScore?: boolean }) {
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
            isWinner
              ? "border-l-blue-500 bg-blue-50"
              : decided
              ? "border-l-transparent"
              : "border-l-transparent",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <p
            className={[
              "truncate font-medium leading-tight",
              isWinner ? "text-gray-900" : decided ? "text-gray-400" : "text-gray-700",
            ].join(" ")}
          >
            {isWinner && <span className="mr-1 text-blue-500">✓</span>}
            {dupla.nomes[0]}
          </p>
          <p className="truncate leading-tight text-gray-400">{dupla.nomes[1]}</p>
        </div>
      ))}
      {showScore && match.placar && decided && (
        <div className="border-t border-gray-100 px-3 py-1.5 text-[10px] text-gray-400">
          {match.placar}
        </div>
      )}
    </div>
  );
}

function BracketGrid({ rounds }: { rounds: BracketRound[] }) {
  const firstRoundCount = rounds[0].matches.length;
  const CELL_H = firstRoundCount <= 2 ? 160 : 128;
  const totalH = firstRoundCount * CELL_H;

  return (
    <div className="overflow-x-auto">
      {/* Cabeçalhos das rodadas */}
      <div className="mb-3 flex">
        {rounds.map((round, i) => (
          <div key={round.nome} className="flex shrink-0">
            <div
              className="w-56 shrink-0 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400"
            >
              {round.nome}
            </div>
            {i < rounds.length - 1 && <div className="w-8 shrink-0" />}
          </div>
        ))}
      </div>

      {/* Grade do bracket */}
      <div className="flex" style={{ height: totalH }}>
        {rounds.map((round, roundIdx) => {
          const numMatches = round.matches.length;
          const cellH = totalH / numMatches;
          return (
            <div key={round.nome} className="flex shrink-0">
              {/* Coluna de partidas */}
              <div className="w-56 shrink-0">
                {round.matches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center"
                    style={{ height: cellH }}
                  >
                    <MatchCard match={match} />
                  </div>
                ))}
              </div>

              {/* SVG conector para a próxima rodada */}
              {roundIdx < rounds.length - 1 && (
                <svg
                  width={32}
                  height={totalH}
                  className="shrink-0"
                  aria-hidden
                >
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

export default async function ChaveamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cat?: string }>;
}) {
  const { id } = await params;
  const { cat } = await searchParams;

  const championship = getChampionshipById(id);
  if (!championship) notFound();

  const bracket = getBracket(id);
  if (!bracket) notFound();

  const activeCat =
    bracket.categories.find((c) => c.id === cat) ?? bracket.categories[0];

  const finalMatch = activeCat.rounds[activeCat.rounds.length - 1].matches[0];
  const champion =
    finalMatch.winner === "a"
      ? finalMatch.duplaA
      : finalMatch.winner === "b"
      ? finalMatch.duplaB
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      {/* Cabeçalho */}
      <div>
        <Link
          href={`/campeonatos/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="size-4" />
          Voltar para o campeonato
        </Link>
        <h1 className="mt-3 flex items-center gap-2 text-xl font-semibold text-gray-900">
          <Trophy className="size-5 text-blue-500" />
          Chaveamento — {championship.nome}
        </h1>
      </div>

      {/* Campeão (se já definido) */}
      {champion && (
        <div className="flex items-center gap-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-6 py-4">
          <Medal className="size-8 shrink-0 text-yellow-500" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow-600">
              Campeões — Categoria {activeCat.nome}
            </p>
            <p className="mt-0.5 text-sm font-bold text-gray-900">
              {champion.nomes[0]} / {champion.nomes[1]}
            </p>
          </div>
        </div>
      )}

      {/* Abas de categoria */}
      <div className="flex flex-wrap gap-2">
        {bracket.categories.map((c) => (
          <Link
            key={c.id}
            href={`/campeonatos/${id}/chaveamento?cat=${c.id}`}
            className={[
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              c.id === activeCat.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            ].join(" ")}
          >
            {c.nome}
          </Link>
        ))}
      </div>

      {/* Bracket principal */}
      <div className="rounded-2xl bg-gray-50 p-6 ring-1 ring-black/5">
        <BracketGrid rounds={activeCat.rounds} />
      </div>

      {/* Disputa de 3° lugar */}
      {activeCat.terceiroLugar && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-500">
            Disputa de 3° Lugar
          </h2>
          <MatchCard match={activeCat.terceiroLugar} />
        </div>
      )}
    </div>
  );
}
