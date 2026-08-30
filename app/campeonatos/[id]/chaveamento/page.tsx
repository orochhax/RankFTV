import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, ChevronLeft } from "lucide-react";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { BracketCategoryView } from "@/components/chaveamento/BracketView";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BracketCategory, BracketMatch, BracketRound } from "@/lib/types";

function splitNomes(nome: string): [string, string] {
  const parts = nome.split(" & ");
  return [parts[0] ?? nome, parts[1] ?? ""];
}

async function getDbBracketCategories(
  champId: string,
): Promise<BracketCategory[] | null> {
  // The participant projection is private to organizers/staff. This Server
  // Component reads only names already assigned to public bracket matches.
  const supabase = createAdminClient();

  const { data: matches } = await supabase
    .from("bracket_matches")
    .select("id, round_index, match_index, participant_a_id, participant_b_id, sets_a, sets_b, winner_participant_id, category_id")
    .eq("championship_id", champId)
    .order("round_index")
    .order("match_index");

  if (!matches || matches.length === 0) return null;

  // Coleta os participantes canônicos, incluindo checkout rápido sem conta.
  const participantIds = [
    ...new Set(
      matches.flatMap((m) => [m.participant_a_id, m.participant_b_id].filter(Boolean) as string[]),
    ),
  ];

  const participantNames: Record<string, string> = {};
  if (participantIds.length > 0) {
    const { data: participants } = await supabase
      .from("bracket_participants")
      .select("id, display_name_snapshot")
      .in("id", participantIds);
    for (const participant of participants ?? []) {
      participantNames[participant.id] = participant.display_name_snapshot;
    }
  }

  // Busca categorias para nomes
  const catIds = [...new Set(matches.map((m) => m.category_id))];
  const { data: cats } = await supabase
    .from("championship_categories")
    .select("id, nome")
    .in("id", catIds);
  const catNomes: Record<string, string> = Object.fromEntries(
    (cats ?? []).map((c) => [c.id, c.nome]),
  );

  // Agrupa por categoria → rodadas → confrontos
  const byCat = new Map<string, Map<number, BracketMatch[]>>();
  for (const m of matches) {
    if (!byCat.has(m.category_id)) byCat.set(m.category_id, new Map());
    const byRound = byCat.get(m.category_id)!;
    if (!byRound.has(m.round_index)) byRound.set(m.round_index, []);

    const winnerId = m.winner_participant_id;
    const isWinA = winnerId && winnerId === m.participant_a_id;
    const isWinB = winnerId && winnerId === m.participant_b_id;

    const scoreStr =
      m.sets_a !== null && m.sets_b !== null
        ? `${m.sets_a} × ${m.sets_b}`
        : undefined;

    byRound.get(m.round_index)!.push({
      id: m.id,
      duplaA: { nomes: splitNomes(m.participant_a_id ? (participantNames[m.participant_a_id] ?? "A definir") : "A definir") },
      duplaB: { nomes: splitNomes(m.participant_b_id ? (participantNames[m.participant_b_id] ?? "A definir") : "A definir") },
      placar: scoreStr,
      winner: isWinA ? "a" : isWinB ? "b" : null,
    });
  }

  function getRoundName(ri: number, total: number): string {
    const fromEnd = total - 1 - ri;
    if (fromEnd === 0) return "Final";
    if (fromEnd === 1) return "Semifinais";
    if (fromEnd === 2) return "Quartas de Final";
    if (fromEnd === 3) return "Oitavas de Final";
    return `Fase ${ri + 1}`;
  }

  const categories: BracketCategory[] = [];
  for (const [catId, roundsMap] of byCat.entries()) {
    const totalRounds = roundsMap.size;
    const rounds: BracketRound[] = Array.from(roundsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([ri, ms]) => ({
        nome: getRoundName(ri, totalRounds),
        matches: ms,
      }));

    categories.push({
      id: catId,
      nome: catNomes[catId] ?? "Categoria",
      rounds,
    });
  }

  return categories.length > 0 ? categories : null;
}

export default async function ChaveamentoPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cat?: string }>;
}) {
  const { id } = await params;
  const { cat } = await searchParams;

  const dbChamp = await getDbChampionshipById(id);
  if (!dbChamp) notFound();

  const categories = await getDbBracketCategories(id);
  if (!categories || categories.length === 0) notFound();

  const activeCat =
    categories.find((c) => c.id === cat) ?? categories[0];

  return (
    <div className="w-full space-y-8 px-6 py-8 pb-24">
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
          Chaveamento — {dbChamp.nome}
        </h1>
      </div>

      {/* Abas de categoria */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
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
      )}

      <BracketCategoryView category={activeCat} />
    </div>
  );
}
