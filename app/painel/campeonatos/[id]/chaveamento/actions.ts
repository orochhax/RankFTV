"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
) {
  const supabase  = await createClient();
  const winnerId  =
    setsA > setsB ? teamAId
    : setsB > setsA ? teamBId
    : null;

  await supabase
    .from("bracket_matches")
    .update({
      sets_a: setsA,
      sets_b: setsB,
      winner_id: winnerId,
      updated_at: new Date().toISOString(),
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

  revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
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
