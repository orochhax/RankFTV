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
    .select("id, round_index, match_index, participant_a_id, participant_b_id, sets_a, sets_b, set_details, winner_participant_id, category_id, is_third_place, court_label, bracket_section, section_round_index")
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
    .select("id, nome, bracket_format")
    .in("id", catIds);
  const catNomes: Record<string, string> = Object.fromEntries(
    (cats ?? []).map((c) => [c.id, c.nome]),
  );
  const catFormatos: Record<string, "single_elimination" | "double_elimination"> = Object.fromEntries(
    (cats ?? []).map((c) => [c.id, c.bracket_format === "double_elimination" ? "double_elimination" : "single_elimination"]),
  );

  // Agrupa por categoria → rodadas → confrontos
  const byCat = new Map<string, Map<number, BracketMatch[]>>();
  const losersByCat = new Map<string, Map<number, BracketMatch[]>>();
  const thirdPlaceByCat = new Map<string, BracketMatch>();
  const grandFinalByCat = new Map<string, BracketMatch>();
  const resetFinalByCat = new Map<string, BracketMatch>();
  const matchNumberByCat = new Map<string, number>();
  for (const m of matches) {
    const winnerId = m.winner_participant_id;
    const isWinA = winnerId && winnerId === m.participant_a_id;
    const isWinB = winnerId && winnerId === m.participant_b_id;
    const numero = (matchNumberByCat.get(m.category_id) ?? 0) + 1;
    matchNumberByCat.set(m.category_id, numero);

    const scoreStr =
      m.sets_a !== null && m.sets_b !== null
        ? `${m.sets_a} × ${m.sets_b}`
        : undefined;

    const match: BracketMatch = {
      id: m.id,
      numero,
      duplaA: { nomes: splitNomes(m.participant_a_id ? (participantNames[m.participant_a_id] ?? "A definir") : "A definir") },
      duplaB: { nomes: splitNomes(m.participant_b_id ? (participantNames[m.participant_b_id] ?? "A definir") : "A definir") },
      placar: scoreStr,
      sets: Array.isArray(m.set_details)
        ? m.set_details.filter(
            (set): set is { a: number; b: number } =>
              typeof set === "object" &&
              set !== null &&
              typeof (set as { a?: unknown }).a === "number" &&
              typeof (set as { b?: unknown }).b === "number",
          )
        : undefined,
      quadra: m.court_label ? `Quadra ${m.court_label}` : undefined,
      winner: isWinA ? "a" : isWinB ? "b" : null,
    };

    const section = m.bracket_section ?? (m.is_third_place ? "third_place" : "winners");
    if (section === "third_place") {
      thirdPlaceByCat.set(m.category_id, match);
      continue;
    }
    if (section === "grand_final") { grandFinalByCat.set(m.category_id, match); continue; }
    if (section === "reset_final") { resetFinalByCat.set(m.category_id, match); continue; }

    const target = section === "losers" ? losersByCat : byCat;
    if (!target.has(m.category_id)) target.set(m.category_id, new Map());
    const byRound = target.get(m.category_id)!;
    const sectionRound = m.section_round_index ?? m.round_index;
    if (!byRound.has(sectionRound)) byRound.set(sectionRound, []);
    byRound.get(sectionRound)!.push(match);
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
    const repescagem: BracketRound[] = Array.from(losersByCat.get(catId)?.entries() ?? [])
      .sort(([a], [b]) => a - b)
      .map(([ri, ms]) => ({ nome: `Repescagem ${ri + 1}`, matches: ms }));

    categories.push({
      id: catId,
      nome: catNomes[catId] ?? "Categoria",
      rounds,
      terceiroLugar: thirdPlaceByCat.get(catId),
      formato: catFormatos[catId] ?? "single_elimination",
      repescagem,
      grandeFinal: grandFinalByCat.get(catId),
      finalReset: resetFinalByCat.get(catId),
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
