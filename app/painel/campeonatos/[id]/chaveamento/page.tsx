import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Trophy, Layers, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { BracketClient } from "@/components/chaveamento/BracketClient";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/shell/StatCard";
import { EmptyState } from "@/components/shell/EmptyState";

/* ─── tipos ─── */

type ParticipantRow = {
  id: string;
  category_id: string;
  display_name_snapshot: string;
  championship_categories: { id: string; nome: string; genero: string } | null;
};

export type TeamDisplay  = { id: string; nome: string };
export type SetDetail   = { a: number; b: number };
export type MatchDisplay = {
  dbId:       string;
  roundIndex: number;
  matchIndex: number;
  teamA:      TeamDisplay | null;
  teamB:      TeamDisplay | null;
  setsA:      number | null;
  setsB:      number | null;
  winnerId:   string | null;
  setDetails: SetDetail[] | null;
};
export type RoundDisplay = {
  nome:       string;
  roundIndex: number;
  matches:    MatchDisplay[];
};

/* ─── helpers de bracket ─── */

function getRoundName(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - roundIndex;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinais";
  if (fromEnd === 2) return "Quartas de Final";
  if (fromEnd === 3) return "Oitavas de Final";
  return `Fase ${roundIndex + 1}`;
}

/* ─── page ─── */

export default async function ChaveamentoPage({
  params,
  searchParams,
}: {
  params:       Promise<{ id: string }>;
  searchParams: Promise<{ cat?: string }>;
}) {
  const { id }  = await params;
  const { cat } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const camp = await getDbChampionshipById(id);
  if (!camp) notFound();
  if (camp.organizadorId !== user.id) notFound();

  /* ── participantes pagos dos dois checkouts ── */
  const { data: rawParticipants } = await supabase
    .from("bracket_participants")
    .select(`
      id, category_id, display_name_snapshot,
      championship_categories(id, nome, genero)
    `)
    .eq("championship_id", id)
    .eq("active", true);

  const participants = (rawParticipants ?? []) as unknown as ParticipantRow[];

  /* ── agrupa duplas por categoria ── */
  const teamsByCat: Record<string, TeamDisplay[]>                    = {};
  const catMeta:    Record<string, { nome: string; genero: string }> = {};

  for (const participant of participants) {
    const catData = participant.championship_categories;
    if (!catData) continue;
    if (!teamsByCat[catData.id]) teamsByCat[catData.id] = [];
    teamsByCat[catData.id].push({ id: participant.id, nome: participant.display_name_snapshot });
    catMeta[catData.id] = { nome: catData.nome, genero: catData.genero };
  }

  /* ── bracket_confirmed_at por categoria ── */
  const catIds = Object.keys(catMeta);
  let confirmedAtMap: Record<string, string | null> = {};
  if (catIds.length > 0) {
    const { data: catRows } = await supabase
      .from("championship_categories")
      .select("id, bracket_confirmed_at")
      .in("id", catIds);
    confirmedAtMap = Object.fromEntries(
      (catRows ?? []).map((c) => [c.id, (c as { id: string; bracket_confirmed_at: string | null }).bracket_confirmed_at ?? null]),
    );
  }

  /* ── categoria ativa ── */
  const categorias  = Object.entries(catMeta).map(([id, m]) => ({ id, ...m }));
  const activeCatId = cat && categorias.some((c) => c.id === cat) ? cat : categorias[0]?.id ?? null;
  const confirmedAt = activeCatId ? (confirmedAtMap[activeCatId] ?? null) : null;

  const totalDuplas = Object.values(teamsByCat).reduce((s, t) => s + t.length, 0);

  /* ── carrega bracket_matches do banco ── */
  let rounds: RoundDisplay[] = [];
  let thirdPlaceMatch: MatchDisplay | null = null;

  if (activeCatId) {
    const { data: dbMatches } = await supabase
      .from("bracket_matches")
      .select("id, round_index, match_index, participant_a_id, participant_b_id, sets_a, sets_b, winner_participant_id, set_details, is_third_place")
      .eq("championship_id", id)
      .eq("category_id", activeCatId)
      .order("round_index")
      .order("match_index");

    if (dbMatches && dbMatches.length > 0) {
      const teamMap: Record<string, string> = {};
      for (const teams of Object.values(teamsByCat)) {
        for (const t of teams) teamMap[t.id] = t.nome;
      }

      const toDisplay = (m: typeof dbMatches[0]): MatchDisplay => ({
        dbId:       m.id,
        roundIndex: m.round_index,
        matchIndex: m.match_index,
        teamA:      m.participant_a_id ? { id: m.participant_a_id, nome: teamMap[m.participant_a_id] ?? "Dupla" } : null,
        teamB:      m.participant_b_id ? { id: m.participant_b_id, nome: teamMap[m.participant_b_id] ?? "Dupla" } : null,
        setsA:      m.sets_a,
        setsB:      m.sets_b,
        winnerId:   m.winner_participant_id,
        setDetails: (m.set_details as SetDetail[] | null) ?? null,
      });

      const regularMatches = dbMatches.filter((m) => !(m as { is_third_place?: boolean }).is_third_place);
      const thirdRow       = dbMatches.find((m)  =>  (m as { is_third_place?: boolean }).is_third_place);

      if (thirdRow) thirdPlaceMatch = toDisplay(thirdRow);

      const roundsMap = new Map<number, MatchDisplay[]>();
      for (const m of regularMatches) {
        const ri = m.round_index;
        if (!roundsMap.has(ri)) roundsMap.set(ri, []);
        roundsMap.get(ri)!.push(toDisplay(m));
      }

      const totalRounds = roundsMap.size;
      rounds = Array.from(roundsMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([roundIndex, matches]) => ({
          nome: getRoundName(roundIndex, totalRounds),
          roundIndex,
          matches,
        }));
    }
  }

  const availableTeams = activeCatId ? (teamsByCat[activeCatId] ?? []).sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  ) : [];

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader title="Chaveamento" description="Grade e confrontos automáticos por categoria." />

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <StatCard label="Duplas no bracket" value={totalDuplas} icon={Users} />
        <StatCard label="Categorias" value={categorias.length || "—"} icon={Layers} />
      </div>

      {totalDuplas === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Nenhuma dupla confirmada"
          description="O chaveamento é gerado automaticamente assim que as primeiras duplas confirmarem pagamento."
          actionLabel="Ver inscrições"
          actionHref={`/painel/campeonatos/${id}/inscricoes`}
        />
      ) : (
        <>
          {/* filtro por categoria */}
          {categorias.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categorias.map((c) => (
                <Link
                  key={c.id}
                  href={`/painel/campeonatos/${id}/chaveamento?cat=${c.id}`}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeCatId === c.id
                      ? "bg-blue-600 text-white"
                      : "bg-surface-2 text-ink-muted hover:bg-border/60"
                  }`}
                >
                  {c.nome}
                </Link>
              ))}
            </div>
          )}

          <BracketClient
            key={activeCatId ?? ""}
            champId={id}
            catId={activeCatId ?? ""}
            rounds={rounds}
            availableTeams={availableTeams}
            confirmedAt={confirmedAt}
            thirdPlaceMatch={thirdPlaceMatch}
          />
        </>
      )}
    </PageContainer>
  );
}
