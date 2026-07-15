import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BracketClient } from "@/components/chaveamento/BracketClient";
import type {
  TeamDisplay,
  MatchDisplay,
  RoundDisplay,
  SetDetail,
} from "@/app/painel/campeonatos/[id]/chaveamento/page";

type RegRow = {
  category_id: string;
  teams: { id: string; atleta1_id: string; atleta2_id: string | null } | null;
  championship_categories: { id: string; nome: string; genero: string } | null;
};

function getRoundName(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - roundIndex;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinais";
  if (fromEnd === 2) return "Quartas de Final";
  if (fromEnd === 3) return "Oitavas de Final";
  return `Fase ${roundIndex + 1}`;
}

export default async function StaffChaveamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cat?: string }>;
}) {
  const { id }  = await params;
  const { cat } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verifica permissão de staff
  const { data: staffRow } = await supabase
    .from("championship_staff")
    .select("can_chaveamento")
    .eq("championship_id", id)
    .eq("user_id", user.id)
    .eq("status", "aceito")
    .maybeSingle();

  if (!staffRow?.can_chaveamento) notFound();

  const { data: campData } = await supabase
    .from("championships")
    .select("nome")
    .eq("id", id)
    .single();

  if (!campData) notFound();

  // Inscrições pagas
  const { data: rawRegs } = await supabase
    .from("registrations")
    .select(`
      category_id, status_pagamento,
      teams(id, atleta1_id, atleta2_id),
      championship_categories(id, nome, genero)
    `)
    .eq("championship_id", id)
    .eq("status_pagamento", "pago");

  const regs: RegRow[] = (rawRegs ?? []) as unknown as RegRow[];

  // Perfis em batch
  const athleteIds = [
    ...new Set(
      regs.flatMap((r) =>
        r.teams
          ? [r.teams.atleta1_id, ...(r.teams.atleta2_id ? [r.teams.atleta2_id] : [])]
          : []
      ),
    ),
  ];
  let profileMap: Record<string, { id: string; nome: string }> = {};
  if (athleteIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nome")
      .in("id", athleteIds);
    profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  }

  const teamsByCat: Record<string, TeamDisplay[]>                    = {};
  const catMeta:    Record<string, { nome: string; genero: string }> = {};
  const seenTeams = new Set<string>();

  for (const reg of regs) {
    const team    = reg.teams;
    const catData = reg.championship_categories;
    if (!team || !catData) continue;
    if (seenTeams.has(team.id)) continue;
    seenTeams.add(team.id);

    const a1   = profileMap[team.atleta1_id];
    const a2   = team.atleta2_id ? profileMap[team.atleta2_id] : null;
    const nome = a2 ? `${a1?.nome ?? "Atleta"} & ${a2.nome}` : (a1?.nome ?? "Atleta");

    if (!teamsByCat[catData.id]) teamsByCat[catData.id] = [];
    teamsByCat[catData.id].push({ id: team.id, nome });
    catMeta[catData.id] = { nome: catData.nome, genero: catData.genero };
  }

  // bracket_confirmed_at
  const catIds = Object.keys(catMeta);
  let confirmedAtMap: Record<string, string | null> = {};
  if (catIds.length > 0) {
    const { data: catRows } = await supabase
      .from("championship_categories")
      .select("id, bracket_confirmed_at")
      .in("id", catIds);
    confirmedAtMap = Object.fromEntries(
      (catRows ?? []).map((c) => [
        c.id,
        (c as { id: string; bracket_confirmed_at: string | null }).bracket_confirmed_at ?? null,
      ]),
    );
  }

  const categorias  = Object.entries(catMeta).map(([cid, m]) => ({ id: cid, ...m }));
  const activeCatId = cat && categorias.some((c) => c.id === cat) ? cat : categorias[0]?.id ?? null;
  const confirmedAt = activeCatId ? (confirmedAtMap[activeCatId] ?? null) : null;

  const totalDuplas = Object.values(teamsByCat).reduce((s, t) => s + t.length, 0);

  let rounds: RoundDisplay[]          = [];
  let thirdPlaceMatch: MatchDisplay | null = null;

  if (activeCatId) {
    const { data: dbMatches } = await supabase
      .from("bracket_matches")
      .select("id, round_index, match_index, team_a_id, team_b_id, sets_a, sets_b, winner_id, set_details, is_third_place")
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
        teamA:      m.team_a_id ? { id: m.team_a_id, nome: teamMap[m.team_a_id] ?? "Dupla" } : null,
        teamB:      m.team_b_id ? { id: m.team_b_id, nome: teamMap[m.team_b_id] ?? "Dupla" } : null,
        setsA:      m.sets_a,
        setsB:      m.sets_b,
        winnerId:   m.winner_id,
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

  const availableTeams = activeCatId
    ? (teamsByCat[activeCatId] ?? []).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    : [];

  return (
    <div className="min-h-screen">
      <div className="bg-black px-6 pb-16 pt-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <Link
            href={`/staff/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {campData.nome}
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-white">Chaveamento</h1>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs text-white/50">Duplas no bracket</p>
              <p className="mt-1 text-2xl font-bold text-white">{totalDuplas}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs text-white/50">Categorias</p>
              <p className="mt-1 text-2xl font-bold text-white">{categorias.length || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-4xl space-y-6">

          {totalDuplas === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
                <Trophy className="size-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-600">Nenhuma dupla confirmada</p>
            </div>
          ) : (
            <>
              {categorias.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {categorias.map((c) => (
                    <Link
                      key={c.id}
                      href={`/staff/${id}/chaveamento?cat=${c.id}`}
                      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        activeCatId === c.id
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
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
                canConfirm={false}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
