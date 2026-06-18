import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { BracketClient } from "@/components/chaveamento/BracketClient";

/* ─── tipos ─── */

type RegRow = {
  category_id: string;
  teams: { id: string; atleta1_id: string; atleta2_id: string | null } | null;
  championship_categories: { id: string; nome: string; genero: string } | null;
};

type ProfileRow = { id: string; nome: string };

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

  /* ── inscrições pagas ── */
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

  /* ── perfis em batch ── */
  const athleteIds = [
    ...new Set(
      regs.flatMap((r) =>
        r.teams
          ? [r.teams.atleta1_id, ...(r.teams.atleta2_id ? [r.teams.atleta2_id] : [])]
          : []
      ),
    ),
  ];

  let profileMap: Record<string, ProfileRow> = {};
  if (athleteIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nome")
      .in("id", athleteIds);
    profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  }

  /* ── agrupa duplas por categoria ── */
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

  /* ── categoria ativa ── */
  const categorias  = Object.entries(catMeta).map(([id, m]) => ({ id, ...m }));
  const activeCatId = cat && categorias.some((c) => c.id === cat) ? cat : categorias[0]?.id ?? null;

  const totalDuplas = Object.values(teamsByCat).reduce((s, t) => s + t.length, 0);

  /* ── carrega bracket_matches do banco ── */
  let rounds: RoundDisplay[] = [];

  if (activeCatId) {
    const { data: dbMatches } = await supabase
      .from("bracket_matches")
      .select("id, round_index, match_index, team_a_id, team_b_id, sets_a, sets_b, winner_id, set_details")
      .eq("championship_id", id)
      .eq("category_id", activeCatId)
      .order("round_index")
      .order("match_index");

    if (dbMatches && dbMatches.length > 0) {
      // teamMap: team.id → nome display
      const teamMap: Record<string, string> = {};
      for (const teams of Object.values(teamsByCat)) {
        for (const t of teams) teamMap[t.id] = t.nome;
      }

      const roundsMap = new Map<number, MatchDisplay[]>();
      for (const m of dbMatches) {
        const ri = m.round_index;
        if (!roundsMap.has(ri)) roundsMap.set(ri, []);
        roundsMap.get(ri)!.push({
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
    <div className="min-h-screen">

      {/* ── cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <Link
            href={`/painel/campeonatos/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {camp.nome}
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

      {/* ── conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-4xl space-y-6">

          {totalDuplas === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
                <Trophy className="size-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-600">Nenhuma dupla confirmada</p>
              <p className="max-w-xs text-xs text-gray-400">
                O chaveamento é gerado automaticamente assim que as primeiras duplas confirmarem pagamento.
              </p>
              <Link
                href={`/painel/campeonatos/${id}/inscricoes`}
                className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Ver inscrições →
              </Link>
            </div>
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
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
