"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/* ─── helpers ─── */

// Confirma que o usuário logado é o organizador dono do campeonato.
// Defesa em profundidade: o RLS já barra a escrita, mas a checagem
// explícita evita operar com dados de campeonato alheio.
async function canManageBracket(supabase: SupabaseClient, champId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: champ } = await supabase
    .from("championships")
    .select("organizador_id")
    .eq("id", champId)
    .single();
  if (!champ) return false;
  if (champ.organizador_id === user.id) return true;

  const { data: staff } = await supabase
    .from("championship_staff")
    .select("id")
    .eq("championship_id", champId)
    .eq("user_id", user.id)
    .eq("status", "aceito")
    .eq("can_chaveamento", true)
    .maybeSingle();
  return !!staff;
}

async function categoryBelongsToChampionship(
  supabase: SupabaseClient,
  champId: string,
  catId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("championship_categories")
    .select("id")
    .eq("id", catId)
    .eq("championship_id", champId)
    .maybeSingle();
  return !!data;
}

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
  if (!(await canManageBracket(supabase, champId))) return;
  if (!(await categoryBelongsToChampionship(supabase, champId, catId))) return;

  const uniqueParticipantIds = [...new Set(teamIds)].slice(0, 256);
  if (uniqueParticipantIds.length !== teamIds.length) return;
  let participantTeamIds = new Map<string, string | null>();
  if (uniqueParticipantIds.length > 0) {
    const { data: validParticipants } = await supabase
      .from("bracket_participants")
      .select("id, team_id")
      .in("id", uniqueParticipantIds)
      .eq("championship_id", champId)
      .eq("category_id", catId)
      .eq("active", true);
    if ((validParticipants ?? []).length !== uniqueParticipantIds.length) return;
    participantTeamIds = new Map(
      (validParticipants ?? []).map((participant) => [participant.id, participant.team_id]),
    );
  }

  // Reverte o rating de partidas já resultadas antes de apagar o bracket
  // anterior — senão o histórico vira órfão e o rating aplicado fica preso
  // pra sempre nos atletas (mesma razão de resetBracket, ver o RPC).
  await createAdminClient().rpc("reverse_bracket_category_ratings", {
    p_championship_id: champId,
    p_category_id: catId,
  });
  await supabase
    .from("bracket_matches")
    .delete()
    .eq("championship_id", champId)
    .eq("category_id", catId);

  const shuffled = shuffle(uniqueParticipantIds);
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
        participant_a_id: r === 0 ? (slots[m * 2]     ?? null) : null,
        participant_b_id: r === 0 ? (slots[m * 2 + 1] ?? null) : null,
        team_a_id: r === 0 && slots[m * 2]
          ? (participantTeamIds.get(slots[m * 2]!) ?? null)
          : null,
        team_b_id: r === 0 && slots[m * 2 + 1]
          ? (participantTeamIds.get(slots[m * 2 + 1]!) ?? null)
          : null,
      });
    }
  }

  if (rows.length > 0) {
    await supabase.from("bracket_matches").insert(rows);
  }

  // Partida pelo 3º lugar: existe quando há pelo menos 2 rodadas (ou seja, semifinais)
  if (totalRounds >= 2) {
    await supabase.from("bracket_matches").insert({
      championship_id: champId,
      category_id:     catId,
      round_index:     totalRounds, // após a final, só para ordenação
      match_index:     0,
      team_a_id:       null,
      team_b_id:       null,
      is_third_place:  true,
    });
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
  if (!(await canManageBracket(supabase, champId))) return;

  const { data: match } = await supabase
    .from("bracket_matches")
    .select("category_id, winner_participant_id")
    .eq("id", matchId)
    .eq("championship_id", champId)
    .maybeSingle();
  if (!match) return;

  if (match.winner_participant_id) return;

  let legacyTeamId: string | null = null;
  if (teamId) {
    const { data: participant } = await supabase
      .from("bracket_participants")
      .select("id, team_id")
      .eq("id", teamId)
      .eq("championship_id", champId)
      .eq("category_id", match.category_id)
      .eq("active", true)
      .maybeSingle();
    if (!participant) return;
    legacyTeamId = participant.team_id;
  }
  const participantField = slot === "a" ? "participant_a_id" : "participant_b_id";
  const teamField = slot === "a" ? "team_a_id" : "team_b_id";
  await supabase
    .from("bracket_matches")
    .update({
      [participantField]: teamId,
      [teamField]: legacyTeamId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .eq("championship_id", champId);
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
  if (!(await canManageBracket(supabase, champId))) return;
  if (!Number.isInteger(setsA) || !Number.isInteger(setsB) || setsA < 0 || setsB < 0 || setsA > 9 || setsB > 9)
    return;
  if (setsA === setsB) return;
  if (
    setDetails?.some(
      (set) =>
        !Number.isInteger(set.a) || !Number.isInteger(set.b) ||
        set.a < 0 || set.b < 0 || set.a > 99 || set.b > 99,
    )
  ) return;

  const { data: securedMatch } = await supabase
    .from("bracket_matches")
    .select("winner_participant_id, participant_a_id, participant_b_id, team_a_id, team_b_id, round_index, match_index, category_id")
    .eq("id", matchId)
    .eq("championship_id", champId)
    .eq("category_id", catId)
    .maybeSingle();
  if (!securedMatch) return;
  if (securedMatch.participant_a_id !== teamAId || securedMatch.participant_b_id !== teamBId) return;
  if (securedMatch.round_index !== roundIndex || securedMatch.match_index !== matchIndex) return;

  const winnerParticipantId =
    setsA > setsB ? teamAId
    : setsB > setsA ? teamBId
    : null;
  const winnerTeamId = setsA > setsB
    ? securedMatch.team_a_id
    : securedMatch.team_b_id;

  await supabase
    .from("bracket_matches")
    .update({
      sets_a:      setsA,
      sets_b:      setsB,
      winner_participant_id: winnerParticipantId,
      winner_id:   winnerTeamId,
      set_details: setDetails ?? null,
      updated_at:  new Date().toISOString(),
    })
    .eq("id", matchId)
    .eq("championship_id", champId)
    .eq("category_id", catId);

  // Avança o vencedor para a próxima rodada
  if (winnerParticipantId) {
    const nextRound = roundIndex + 1;
    const nextMatch = Math.floor(matchIndex / 2);
    const nextParticipantSlot = matchIndex % 2 === 0 ? "participant_a_id" : "participant_b_id";
    const nextTeamSlot = matchIndex % 2 === 0 ? "team_a_id" : "team_b_id";

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
        .update({
          [nextParticipantSlot]: winnerParticipantId,
          [nextTeamSlot]: winnerTeamId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", nextRow.id);
    }
  }

  // Popula a partida pelo 3º lugar com o perdedor da semifinal
  if (winnerParticipantId && teamAId && teamBId) {
    const { data: thirdPlace } = await supabase
      .from("bracket_matches")
      .select("id, participant_a_id, participant_b_id, team_a_id, team_b_id")
      .eq("championship_id", champId)
      .eq("category_id", catId)
      .eq("is_third_place", true)
      .maybeSingle();

    if (thirdPlace) {
      // Confirma que a próxima rodada tem só 1 jogo (i.e., esta é uma semifinal)
      const { count: nextCount } = await supabase
        .from("bracket_matches")
        .select("id", { count: "exact", head: true })
        .eq("championship_id", champId)
        .eq("category_id", catId)
        .eq("round_index", roundIndex + 1)
        .eq("is_third_place", false);

      if (nextCount === 1) {
        const loserId = winnerParticipantId === teamAId ? teamBId : teamAId;
        const loserTeamId = winnerParticipantId === teamAId
          ? securedMatch.team_b_id
          : securedMatch.team_a_id;
        const participantSlot = matchIndex === 0 ? "participant_a_id" : "participant_b_id";
        const teamSlot = matchIndex === 0 ? "team_a_id" : "team_b_id";
        const already = participantSlot === "participant_a_id"
          ? thirdPlace.participant_a_id
          : thirdPlace.participant_b_id;
        if (!already) {
          await supabase
            .from("bracket_matches")
            .update({ [participantSlot]: loserId, [teamSlot]: loserTeamId })
            .eq("id", thirdPlace.id);
        }
      }
    }
  }

  // Aplica o rating via RPC atômica: ela mesma reverte qualquer aplicação
  // anterior desta partida antes de aplicar o resultado atual, então dá pra
  // chamar sempre (placar novo ou editado) sem se preocupar em detectar "é
  // resultado novo?" aqui — nunca soma dois deltas em cima do mesmo match_id.
  // Ver supabase/harden-rating-ledger-idempotency.sql.
  if (securedMatch.team_a_id && securedMatch.team_b_id) {
    await createAdminClient().rpc("apply_bracket_match_rating", { p_match_id: matchId });
  }

  revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
}

export async function clearScore(matchId: string, champId: string) {
  const supabase = await createClient();
  if (!(await canManageBracket(supabase, champId))) return;
  await supabase
    .from("bracket_matches")
    .update({
      sets_a: null,
      sets_b: null,
      winner_id: null,
      winner_participant_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .eq("championship_id", champId);
  // Reverte o rating que esse resultado tinha aplicado (idempotente — RPC
  // não faz nada se essa partida nunca teve rating aplicado).
  await createAdminClient().rpc("apply_bracket_match_rating", { p_match_id: matchId });
  revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
}

export async function resetBracket(champId: string, catId: string) {
  const supabase = await createClient();
  if (!(await canManageBracket(supabase, champId))) return;
  if (!(await categoryBelongsToChampionship(supabase, champId, catId))) return;
  // Reverte o rating de todas as partidas da categoria ANTES de apagá-las —
  // senão o histórico vira órfão (match_id some) e o rating aplicado fica
  // preso pra sempre nos atletas.
  await createAdminClient().rpc("reverse_bracket_category_ratings", {
    p_championship_id: champId,
    p_category_id: catId,
  });
  await supabase
    .from("bracket_matches")
    .delete()
    .eq("championship_id", champId)
    .eq("category_id", catId);
  revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
}

export async function confirmBracket(
  champId: string,
  catId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: champ } = await supabase
    .from("championships")
    .select("organizador_id")
    .eq("id", champId)
    .single();
  if (!champ || champ.organizador_id !== user.id)
    return { ok: false, error: "Sem permissão." };

  // Verifica que a final tem vencedor
  const { data: matches } = await supabase
    .from("bracket_matches")
    .select("round_index, winner_participant_id, is_third_place")
    .eq("championship_id", champId)
    .eq("category_id", catId);

  if (!matches || matches.length === 0)
    return { ok: false, error: "Chaveamento não gerado." };

  const regularMatches = matches.filter((m) => !m.is_third_place);
  const thirdPlace     = matches.find((m) => m.is_third_place);

  if (regularMatches.length === 0)
    return { ok: false, error: "Chaveamento não gerado." };

  const maxRound     = Math.max(...regularMatches.map((m) => m.round_index));
  const finalMatches = regularMatches.filter((m) => m.round_index === maxRound);
  const hasChampeão  = finalMatches.every((m) => m.winner_participant_id);
  if (!hasChampeão)
    return { ok: false, error: "O chaveamento ainda não está completo." };

  if (thirdPlace && !thirdPlace.winner_participant_id)
    return { ok: false, error: "A partida pelo 3º lugar ainda não tem resultado." };

  const { error } = await supabase
    .from("championship_categories")
    .update({ bracket_confirmed_at: new Date().toISOString() })
    .eq("id", catId);

  if (error) return { ok: false, error: "Erro ao confirmar resultado." };

  revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
  revalidatePath(`/campeonatos/${champId}/chaveamento`);
  return { ok: true };
}
