"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { calcElo, DEFAULT_RATING } from "@/lib/rating";

/* ─── helpers ─── */

function nextPow2(n: number): number {
  if (n <= 1) return 2;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── gerar bracket por sorteio ─── */

export async function generateBracket(
  champId: string,
  catId:   string,
  teamIds: string[],
) {
  const supabase = await createClient();

  await supabase
    .from("bracket_matches")
    .delete()
    .eq("championship_id", champId)
    .eq("category_id", catId);

  const shuffled = shuffle(teamIds);
  const n            = nextPow2(shuffled.length);
  const totalRounds  = Math.log2(n);
  const slots: (string | null)[] = [
    ...shuffled,
    ...Array(n - shuffled.length).fill(null),
  ];

  const rows = [];
  for (let r = 0; r < totalRounds; r++) {
    const matchCount = n / Math.pow(2, r + 1);
    for (let m = 0; m < matchCount; m++) {
      rows.push({
        championship_id: champId,
        category_id:     catId,
        round_index:     r,
        match_index:     m,
        team_a_id: r === 0 ? (slots[m * 2]     ?? null) : null,
        team_b_id: r === 0 ? (slots[m * 2 + 1] ?? null) : null,
      });
    }
  }

  if (rows.length > 0) {
    await supabase.from("bracket_matches").insert(rows);
  }

  revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
}

export async function assignTeam(
  matchId: string,
  slot: "a" | "b",
  teamId: string | null,
  champId: string,
) {
  const supabase = await createClient();
  const field = slot === "a" ? "team_a_id" : "team_b_id";
  await supabase
    .from("bracket_matches")
    .update({ [field]: teamId, updated_at: new Date().toISOString() })
    .eq("id", matchId);
  revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
}

export async function saveScore(
  matchId:    string,
  setsA:      number,
  setsB:      number,
  teamAId:    string | null,
  teamBId:    string | null,
  champId:    string,
  catId:      string,
  roundIndex: number,
  matchIndex: number,
  setDetails: Array<{ a: number; b: number }> | null,
) {
  const supabase = await createClient();
  const winnerId =
    setsA > setsB ? teamAId
    : setsB > setsA ? teamBId
    : null;

  // Guarda o winner anterior para saber se é uma nova vitória
  const { data: prevMatch } = await supabase
    .from("bracket_matches")
    .select("winner_id")
    .eq("id", matchId)
    .single();
  const prevWinnerId = prevMatch?.winner_id ?? null;

  await supabase
    .from("bracket_matches")
    .update({
      sets_a:      setsA,
      sets_b:      setsB,
      winner_id:   winnerId,
      set_details: setDetails ?? null,
      updated_at:  new Date().toISOString(),
    })
    .eq("id", matchId);

  // Avança o vencedor para a próxima rodada
  if (winnerId) {
    const nextRound = roundIndex + 1;
    const nextMatch = Math.floor(matchIndex / 2);
    const nextSlot  = matchIndex % 2 === 0 ? "team_a_id" : "team_b_id";

    const { data: nextRow } = await supabase
      .from("bracket_matches")
      .select("id")
      .eq("championship_id", champId)
      .eq("category_id", catId)
      .eq("round_index", nextRound)
      .eq("match_index", nextMatch)
      .maybeSingle();

    if (nextRow) {
      await supabase
        .from("bracket_matches")
        .update({ [nextSlot]: winnerId, updated_at: new Date().toISOString() })
        .eq("id", nextRow.id);
    }
  }

  // Atualiza rating somente quando há vencedor novo (evita dupla contagem)
  const isNewResult = winnerId && winnerId !== prevWinnerId;
  if (isNewResult && teamAId && teamBId) {
    await applyRatingUpdate(matchId, champId, teamAId, teamBId, winnerId);
  }

  revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
  revalidatePath(`/rank`);
}

async function applyRatingUpdate(
  matchId:  string,
  champId:  string,
  teamAId:  string,
  teamBId:  string,
  winnerId: string,
) {
  const supabase = await createClient();

  // Busca atletas de cada dupla
  const { data: teams } = await supabase
    .from("teams")
    .select("id, atleta1_id, atleta2_id")
    .in("id", [teamAId, teamBId]);

  if (!teams || teams.length < 2) return;

  const teamA = teams.find((t) => t.id === teamAId);
  const teamB = teams.find((t) => t.id === teamBId);
  if (!teamA || !teamB) return;

  const athleteIds = [
    teamA.atleta1_id,
    ...(teamA.atleta2_id ? [teamA.atleta2_id] : []),
    teamB.atleta1_id,
    ...(teamB.atleta2_id ? [teamB.atleta2_id] : []),
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, rating")
    .in("id", athleteIds);

  const ratingOf = (id: string) => {
    const p = profiles?.find((p) => p.id === id);
    return p?.rating || DEFAULT_RATING;
  };

  const winnerTeam = winnerId === teamAId ? teamA : teamB;
  const loserTeam  = winnerId === teamAId ? teamB : teamA;

  const deltas = calcElo(
    ratingOf(winnerTeam.atleta1_id),
    winnerTeam.atleta2_id ? ratingOf(winnerTeam.atleta2_id) : 0,
    ratingOf(loserTeam.atleta1_id),
    loserTeam.atleta2_id  ? ratingOf(loserTeam.atleta2_id)  : 0,
  );

  const updates: Array<{ id: string; antes: number; depois: number; resultado: "vitoria" | "derrota" }> = [];

  const addUpdate = (
    id: string,
    delta: number,
    resultado: "vitoria" | "derrota",
  ) => {
    const antes  = ratingOf(id);
    const depois = Math.max(0, antes + delta);
    updates.push({ id, antes, depois, resultado });
  };

  addUpdate(winnerTeam.atleta1_id, deltas.atleta1Winner, "vitoria");
  if (winnerTeam.atleta2_id) addUpdate(winnerTeam.atleta2_id, deltas.atleta2Winner, "vitoria");
  addUpdate(loserTeam.atleta1_id,  deltas.atleta1Loser,  "derrota");
  if (loserTeam.atleta2_id)  addUpdate(loserTeam.atleta2_id,  deltas.atleta2Loser,  "derrota");

  // Atualiza ratings em paralelo
  await Promise.all(
    updates.map(({ id, depois }) =>
      supabase.from("profiles").update({ rating: depois }).eq("id", id),
    ),
  );

  // Insere histórico
  await supabase.from("rating_history").insert(
    updates.map(({ id, antes, depois, resultado }) => ({
      atleta_id:       id,
      championship_id: champId,
      match_id:        matchId,
      rating_antes:    antes,
      rating_depois:   depois,
      resultado,
    })),
  );
}

export async function clearScore(matchId: string, champId: string) {
  const supabase = await createClient();
  await supabase
    .from("bracket_matches")
    .update({
      sets_a: null,
      sets_b: null,
      winner_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);
  revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
}

export async function resetBracket(champId: string, catId: string) {
  const supabase = await createClient();
  await supabase
    .from("bracket_matches")
    .delete()
    .eq("championship_id", champId)
    .eq("category_id", catId);
  revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
}
