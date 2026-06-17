import { createClient } from "@/lib/supabase/server";

export type RankedAthlete = {
  athlete_id: string;
  nome: string;
  instagram: string | null;
  genero: "masculino" | "feminino";
  total_pontos: number;
  total_torneios: number;
  melhor_colocacao: number;
};

export type TournamentAdmin = {
  id: string;
  nome_circuito: string;
  tier: string;
  data: string;
  ano: number;
  results: {
    id: string;
    colocacao: number;
    pontos: number;
    parceiro_nome: string | null;
    athlete_nome: string;
    athlete_instagram: string | null;
    athlete_genero: string;
  }[];
};

export async function getAvailableYears(): Promise<number[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("external_tournaments")
    .select("data")
    .order("data", { ascending: false });

  if (!data) return [];

  const years = [
    ...new Set(data.map((t) => new Date(t.data + "T12:00:00").getFullYear())),
  ];
  return years.sort((a, b) => b - a);
}

export async function getRanking(
  genero: "masculino" | "feminino",
  ano: number | "all"
): Promise<RankedAthlete[]> {
  const supabase = await createClient();

  let query = supabase
    .from("ranking_entries")
    .select("athlete_id, nome, instagram, genero, pontos, colocacao")
    .eq("genero", genero);

  if (ano !== "all") {
    query = query.eq("ano", ano);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const map = new Map<
    string,
    { nome: string; instagram: string | null; pontos: number; torneios: number; melhor: number }
  >();

  for (const row of data) {
    const existing = map.get(row.athlete_id);
    if (existing) {
      existing.pontos += row.pontos;
      existing.torneios += 1;
      if (row.colocacao < existing.melhor) existing.melhor = row.colocacao;
    } else {
      map.set(row.athlete_id, {
        nome: row.nome,
        instagram: row.instagram,
        pontos: row.pontos,
        torneios: 1,
        melhor: row.colocacao,
      });
    }
  }

  return Array.from(map.entries())
    .map(([athlete_id, v]) => ({
      athlete_id,
      nome: v.nome,
      instagram: v.instagram,
      genero,
      total_pontos: v.pontos,
      total_torneios: v.torneios,
      melhor_colocacao: v.melhor,
    }))
    .sort((a, b) => b.total_pontos - a.total_pontos);
}

export async function getTournamentsForAdmin(): Promise<TournamentAdmin[]> {
  const supabase = await createClient();

  const { data: tournaments } = await supabase
    .from("external_tournaments")
    .select("id, nome_circuito, tier, data")
    .order("data", { ascending: false });

  if (!tournaments) return [];

  const { data: results } = await supabase
    .from("external_results")
    .select(
      "id, tournament_id, colocacao, pontos, parceiro_nome, external_athletes(nome, instagram, genero)"
    )
    .order("colocacao", { ascending: true });

  const resultsMap = new Map<string, TournamentAdmin["results"]>();
  for (const r of results ?? []) {
    const a = Array.isArray(r.external_athletes)
      ? r.external_athletes[0]
      : r.external_athletes;
    if (!a) continue;
    const list = resultsMap.get(r.tournament_id) ?? [];
    list.push({
      id: r.id,
      colocacao: r.colocacao,
      pontos: r.pontos,
      parceiro_nome: r.parceiro_nome,
      athlete_nome: a.nome,
      athlete_instagram: a.instagram,
      athlete_genero: a.genero,
    });
    resultsMap.set(r.tournament_id, list);
  }

  return tournaments.map((t) => ({
    ...t,
    ano: new Date(t.data + "T12:00:00").getFullYear(),
    results: resultsMap.get(t.id) ?? [],
  }));
}
