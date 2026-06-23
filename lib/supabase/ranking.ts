import { createClient } from "@/lib/supabase/server";

export type Genero = "masculino" | "feminino";

// ── Ranking da Liga Brasileira de Futevôlei ───────────────────────────────
// São totais de temporada já fechados (não calculamos pontos aqui — só
// exibimos). Vêm de duas tabelas independentes: uma por atleta, outra por
// dupla. Ver supabase/seed_liga_ranking.sql.

export type RankedIndividual = {
  id: string;
  nome: string;
  instagram: string | null;
  genero: Genero;
  pontos: number;
  username: string | null;
  fotoUrl: string | null;
  posicao: number | null;
  posicaoAnterior: number | null;
};

export type RankedDupla = {
  id: string;
  atleta1: string;
  atleta2: string;
  genero: Genero;
  pontos: number;
  atleta1Username: string | null;
  atleta1Foto:     string | null;
  atleta2Username: string | null;
  atleta2Foto:     string | null;
  posicao: number | null;
  posicaoAnterior: number | null;
};

export async function getRankingIndividual(
  genero: Genero
): Promise<RankedIndividual[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ranking_individual")
    .select("id, nome, instagram, genero, pontos, username, foto_url, posicao, posicao_anterior")
    .eq("genero", genero)
    // Onde há posição oficial (masculino), ordena por ela; senão (feminino),
    // cai pra pontos desc + nome asc como antes.
    .order("posicao", { ascending: true, nullsFirst: false })
    .order("pontos", { ascending: false })
    .order("nome", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    ...r,
    fotoUrl: r.foto_url ?? null,
    posicao: r.posicao ?? null,
    posicaoAnterior: r.posicao_anterior ?? null,
  })) as RankedIndividual[];
}

export async function getRankingDupla(genero: Genero): Promise<RankedDupla[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ranking_dupla")
    .select("id, atleta1, atleta2, genero, pontos, atleta1_username, atleta1_foto, atleta2_username, atleta2_foto, posicao, posicao_anterior")
    .eq("genero", genero)
    .order("posicao", { ascending: true, nullsFirst: false })
    .order("pontos", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({
    ...r,
    atleta1Username: r.atleta1_username ?? null,
    atleta1Foto:     r.atleta1_foto     ?? null,
    atleta2Username: r.atleta2_username ?? null,
    atleta2Foto:     r.atleta2_foto     ?? null,
    posicao:         r.posicao          ?? null,
    posicaoAnterior: r.posicao_anterior ?? null,
  })) as RankedDupla[];
}

// ── Admin: torneios próprios (modelo external_*) ──────────────────────────
// Continua valendo pro Painel admin e pro histórico do usuário na Home/Perfil
// (essas telas consultam a view ranking_entries direto). Não mexer.

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
