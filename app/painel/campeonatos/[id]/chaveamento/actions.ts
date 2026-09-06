"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { courtNumberForMatch, normalizeCourtConfiguration, type CourtConfiguration } from "@/lib/bracket-courts";
import { buildBracketInvalidationPlan, type ProgressionMatch } from "@/lib/bracket-progression";
import { validateBracketScore } from "@/lib/bracket-score";
import { createDoubleEliminationPlan, type BracketFormat } from "@/lib/double-elimination";

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

function validateCourtConfiguration(input: CourtConfiguration): string | null {
  if (!Number.isInteger(input.totalCourts) || input.totalCourts < 1 || input.totalCourts > 32) {
    return "Informe um total de quadras entre 1 e 32.";
  }
  if (!Number.isInteger(input.primaryCourtNumber) || input.primaryCourtNumber < 1 || input.primaryCourtNumber > input.totalCourts) {
    return "Escolha uma quadra principal válida.";
  }
  return null;
}

async function persistCourtConfiguration(
  champId: string,
  configuration: CourtConfiguration,
  redistributeExistingMatches: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const validationError = validateCourtConfiguration(configuration);
  if (validationError) return { ok: false, error: validationError };

  const normalized = normalizeCourtConfiguration(configuration);
  const admin = createAdminClient();
  const { error: championshipError } = await admin
    .from("championships")
    .update({
      total_courts: normalized.totalCourts,
      main_court_count: 1,
      primary_court_number: normalized.primaryCourtNumber,
    })
    .eq("id", champId);

  if (championshipError) {
    return { ok: false, error: "Não foi possível salvar a configuração das quadras." };
  }

  if (!redistributeExistingMatches) return { ok: true };

  const { data: matches, error: matchesError } = await admin
    .from("bracket_matches")
    .select("id, category_id, round_index, match_index, is_third_place, bracket_section, section_round_index")
    .eq("championship_id", champId);

  if (matchesError) {
    return { ok: false, error: "As quadras foram salvas, mas não foi possível redistribuir os jogos existentes." };
  }

  const totalRoundsByCategory = new Map<string, number>();
  for (const match of matches ?? []) {
    if (match.bracket_section !== "winners" || match.is_third_place) continue;
    const current = totalRoundsByCategory.get(match.category_id) ?? 0;
    totalRoundsByCategory.set(match.category_id, Math.max(current, (match.section_round_index ?? match.round_index) + 1));
  }

  for (const match of matches ?? []) {
    const totalRounds = totalRoundsByCategory.get(match.category_id) ?? 1;
    const courtLabel = String(courtNumberForMatch(normalized, {
      roundIndex: match.section_round_index ?? match.round_index,
      matchIndex: match.match_index,
      totalRounds,
      secondaryMatch: match.is_third_place || match.bracket_section === "losers" || match.bracket_section === "third_place",
    }));
    const { error } = await admin
      .from("bracket_matches")
      .update({ court_label: courtLabel })
      .eq("id", match.id);
    if (error) {
      return { ok: false, error: "As quadras foram salvas, mas alguns jogos não puderam ser redistribuídos." };
    }
  }

  return { ok: true };
}

async function invalidateDependentMatches(
  champId: string,
  catId: string,
  sourceMatchId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bracket_matches")
    .select("id, round_index, match_index, bracket_section, is_third_place, winner_participant_id, next_winner_match_id, next_winner_slot, next_loser_match_id, next_loser_slot")
    .eq("championship_id", champId)
    .eq("category_id", catId);
  if (error) return { ok: false, error: "Não foi possível verificar os jogos dependentes." };

  const plan = buildBracketInvalidationPlan((data ?? []) as ProgressionMatch[], sourceMatchId);
  for (const step of plan) {
    const clearParticipantA = step.slots.includes("a");
    const clearParticipantB = step.slots.includes("b");
    const { error: updateError } = await admin
      .from("bracket_matches")
      .update({
        ...(clearParticipantA ? { participant_a_id: null, team_a_id: null } : {}),
        ...(clearParticipantB ? { participant_b_id: null, team_b_id: null } : {}),
        sets_a: null,
        sets_b: null,
        winner_id: null,
        winner_participant_id: null,
        set_details: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", step.matchId)
      .eq("championship_id", champId)
      .eq("category_id", catId);
    if (updateError) return { ok: false, error: "Não foi possível limpar todos os jogos dependentes." };

    // A RPC também funciona como reversão quando o resultado já foi limpo.
    const { error: ratingError } = await admin.rpc("apply_bracket_match_rating", {
      p_match_id: step.matchId,
    });
    if (ratingError) return { ok: false, error: "Os jogos foram limpos, mas não foi possível reverter todo o rating." };
  }

  return { ok: true };
}

export async function saveCourtConfiguration(
  champId: string,
  configuration: CourtConfiguration,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!(await canManageBracket(supabase, champId))) {
    return { ok: false, error: "Sem permissão para configurar as quadras deste campeonato." };
  }

  const result = await persistCourtConfiguration(champId, configuration, true);
  if (result.ok) {
    revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
    revalidatePath(`/staff/${champId}/chaveamento`);
    revalidatePath(`/campeonatos/${champId}/chaveamento`);
  }
  return result;
}

export async function changeMatchCourt(
  matchId: string,
  champId: string,
  courtNumber: number,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!(await canManageBracket(supabase, champId))) {
    return { ok: false, error: "Sem permissão para alterar a quadra deste jogo." };
  }
  if (!Number.isInteger(courtNumber) || courtNumber < 1) {
    return { ok: false, error: "Escolha uma quadra válida." };
  }

  const { data: championship } = await supabase
    .from("championships")
    .select("total_courts")
    .eq("id", champId)
    .single();
  if (!championship || courtNumber > (championship.total_courts ?? 1)) {
    return { ok: false, error: "Essa quadra não faz parte do campeonato." };
  }

  const { data: match, error } = await supabase
    .from("bracket_matches")
    .update({ court_label: String(courtNumber), updated_at: new Date().toISOString() })
    .eq("id", matchId)
    .eq("championship_id", champId)
    .select("id")
    .maybeSingle();
  if (error || !match) {
    return { ok: false, error: "Não foi possível alterar a quadra deste jogo." };
  }

  revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
  revalidatePath(`/staff/${champId}/chaveamento`);
  revalidatePath(`/campeonatos/${champId}/chaveamento`);
  return { ok: true };
}

export async function addManualBracketPair(
  champId: string,
  catId: string,
  athleteA: string,
  athleteB: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await canManageBracket(supabase, champId))) {
    return { ok: false, error: "Sem permissão para alterar este chaveamento." };
  }
  if (!(await categoryBelongsToChampionship(supabase, champId, catId))) {
    return { ok: false, error: "Categoria inválida." };
  }

  const firstName = athleteA.trim().replace(/\s+/g, " ").slice(0, 80);
  const secondName = athleteB.trim().replace(/\s+/g, " ").slice(0, 80);
  if (firstName.length < 2 || secondName.length < 2) {
    return { ok: false, error: "Informe o nome dos dois atletas da dupla." };
  }
  if (firstName.localeCompare(secondName, "pt-BR", { sensitivity: "base" }) === 0) {
    return { ok: false, error: "Os dois atletas da dupla precisam ser pessoas diferentes." };
  }

  const { error } = await createAdminClient().from("bracket_participants").insert({
    championship_id: champId,
    category_id: catId,
    source_type: "manual",
    display_name_snapshot: `${firstName} & ${secondName}`,
    active: true,
    created_by: user.id,
  });
  if (error?.code === "23505") return { ok: false, error: "Essa dupla já foi adicionada." };
  if (error) return { ok: false, error: "Não foi possível adicionar a dupla." };

  revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
  return { ok: true };
}

/* ─── gerar bracket por sorteio ─── */

export async function generateBracket(
  champId: string,
  catId:   string,
  teamIds: string[],
  requestedCourtConfiguration?: CourtConfiguration,
  requestedFormat: BracketFormat = "single_elimination",
) {
  const supabase = await createClient();
  if (!(await canManageBracket(supabase, champId))) return { ok: false, error: "Sem permissão para gerar este chaveamento." };
  if (!(await categoryBelongsToChampionship(supabase, champId, catId))) return { ok: false, error: "Categoria inválida." };
  if (requestedFormat !== "single_elimination" && requestedFormat !== "double_elimination") {
    return { ok: false, error: "Formato de chaveamento inválido." };
  }

  const { data: existingMatches } = await supabase
    .from("bracket_matches")
    .select("winner_participant_id")
    .eq("championship_id", champId)
    .eq("category_id", catId);
  const hasResults = (existingMatches ?? []).some((match) => !!match.winner_participant_id);
  const { data: category } = await supabase
    .from("championship_categories")
    .select("bracket_format")
    .eq("id", catId)
    .single();
  if (hasResults && category?.bracket_format !== requestedFormat) {
    return { ok: false, error: "Limpe o chaveamento antes de trocar o formato, pois já existem resultados lançados." };
  }

  if (requestedCourtConfiguration) {
    const saved = await persistCourtConfiguration(champId, requestedCourtConfiguration, false);
    if (!saved.ok) return saved;
  }

  const { data: courtData } = await supabase
    .from("championships")
    .select("total_courts, primary_court_number")
    .eq("id", champId)
    .single();
  const courtConfiguration = normalizeCourtConfiguration({
    totalCourts: requestedCourtConfiguration?.totalCourts ?? courtData?.total_courts ?? 1,
    primaryCourtNumber: requestedCourtConfiguration?.primaryCourtNumber ?? courtData?.primary_court_number ?? 1,
  });

  const uniqueParticipantIds = [...new Set(teamIds)].slice(0, 256);
  if (uniqueParticipantIds.length !== teamIds.length) return { ok: false, error: "A seleção contém duplas repetidas ou excede o limite permitido." };
  if (requestedFormat === "double_elimination" && (
    uniqueParticipantIds.length < 8 ||
    (uniqueParticipantIds.length & (uniqueParticipantIds.length - 1)) !== 0
  )) {
    return { ok: false, error: "Nesta versão, a repescagem exige 8, 16, 32, 64, 128 ou 256 duplas selecionadas." };
  }
  let participantTeamIds = new Map<string, string | null>();
  if (uniqueParticipantIds.length > 0) {
    const { data: validParticipants } = await supabase
      .from("bracket_participants")
      .select("id, team_id")
      .in("id", uniqueParticipantIds)
      .eq("championship_id", champId)
      .eq("category_id", catId)
      .eq("active", true);
    if ((validParticipants ?? []).length !== uniqueParticipantIds.length) return { ok: false, error: "Uma ou mais duplas selecionadas não estão disponíveis." };
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

  const { error: formatError } = await supabase
    .from("championship_categories")
    .update({ bracket_format: requestedFormat, bracket_confirmed_at: null })
    .eq("id", catId);
  if (formatError) return { ok: false, error: "Não foi possível salvar o formato do chaveamento." };

  if (requestedFormat === "double_elimination") {
    const plan = createDoubleEliminationPlan(slots);
    const mainTotalRounds = totalRounds + 1;
    const idsByKey = new Map(plan.map((match) => [match.key, crypto.randomUUID()]));
    const rows = plan.map((match) => ({
      id: idsByKey.get(match.key),
      championship_id: champId,
      category_id: catId,
      round_index: match.roundIndex,
      match_index: match.matchIndex,
      bracket_section: match.section,
      section_round_index: match.sectionRoundIndex,
      is_third_place: match.section === "third_place",
      participant_a_id: match.participantAId,
      participant_b_id: match.participantBId,
      team_a_id: match.participantAId ? (participantTeamIds.get(match.participantAId) ?? null) : null,
      team_b_id: match.participantBId ? (participantTeamIds.get(match.participantBId) ?? null) : null,
      next_winner_match_id: match.nextWinnerKey ? idsByKey.get(match.nextWinnerKey) : null,
      next_winner_slot: match.nextWinnerSlot,
      next_loser_match_id: match.nextLoserKey ? idsByKey.get(match.nextLoserKey) : null,
      next_loser_slot: match.nextLoserSlot,
      court_label: String(courtNumberForMatch(courtConfiguration, {
        roundIndex: match.sectionRoundIndex,
        matchIndex: match.matchIndex,
        totalRounds: mainTotalRounds,
        secondaryMatch: match.section === "losers" || match.section === "third_place",
      })),
    }));
    const { error } = await createAdminClient().from("bracket_matches").insert(rows);
    if (error) return { ok: false, error: "Não foi possível criar a chave de dupla eliminação." };
    revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
    revalidatePath(`/campeonatos/${champId}/chaveamento`);
    return { ok: true };
  }

  const rows = [];
  for (let r = 0; r < totalRounds; r++) {
    const matchCount = n / Math.pow(2, r + 1);
    for (let m = 0; m < matchCount; m++) {
      rows.push({
        championship_id: champId,
        category_id:     catId,
        round_index:     r,
        match_index:     m,
        bracket_section: "winners",
        section_round_index: r,
        participant_a_id: r === 0 ? (slots[m * 2]     ?? null) : null,
        participant_b_id: r === 0 ? (slots[m * 2 + 1] ?? null) : null,
        team_a_id: r === 0 && slots[m * 2]
          ? (participantTeamIds.get(slots[m * 2]!) ?? null)
          : null,
        team_b_id: r === 0 && slots[m * 2 + 1]
          ? (participantTeamIds.get(slots[m * 2 + 1]!) ?? null)
          : null,
        court_label: String(courtNumberForMatch(courtConfiguration, {
          roundIndex: r,
          matchIndex: m,
          totalRounds,
        })),
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
      bracket_section: "third_place",
      section_round_index: 0,
      court_label: String(courtNumberForMatch(courtConfiguration, {
        roundIndex: totalRounds,
        matchIndex: 0,
        totalRounds,
        secondaryMatch: true,
      })),
    });
  }

  revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
  revalidatePath(`/campeonatos/${champId}/chaveamento`);
  return { ok: true };
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
  if (!(await canManageBracket(supabase, champId))) return { ok: false, error: "Sem permissão para salvar este placar." };
  const scoreValidationError = validateBracketScore(setsA, setsB, setDetails);
  if (scoreValidationError) return { ok: false, error: scoreValidationError };

  const { data: securedMatch } = await supabase
    .from("bracket_matches")
    .select("winner_participant_id, participant_a_id, participant_b_id, team_a_id, team_b_id, round_index, match_index, category_id, bracket_section, next_winner_match_id, next_winner_slot, next_loser_match_id, next_loser_slot")
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
  const loserParticipantId = winnerParticipantId === teamAId ? teamBId : teamAId;
  const loserTeamId = winnerParticipantId === teamAId ? securedMatch.team_b_id : securedMatch.team_a_id;

  if (
    securedMatch.winner_participant_id &&
    securedMatch.winner_participant_id !== winnerParticipantId
  ) {
    const invalidation = await invalidateDependentMatches(champId, catId, matchId);
    if (!invalidation.ok) return invalidation;
  }

  const { error: scoreError } = await supabase
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
  if (scoreError) return { ok: false, error: "Não foi possível salvar o placar." };

  async function sendParticipant(
    destinationId: string | null,
    slot: string | null,
    participantId: string | null,
    legacyTeamId: string | null,
  ) {
    if (!destinationId || !participantId || (slot !== "a" && slot !== "b")) return;
    await supabase
      .from("bracket_matches")
      .update({
        [slot === "a" ? "participant_a_id" : "participant_b_id"]: participantId,
        [slot === "a" ? "team_a_id" : "team_b_id"]: legacyTeamId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", destinationId)
      .eq("championship_id", champId)
      .eq("category_id", catId);
  }

  if (securedMatch.bracket_section === "grand_final" && winnerParticipantId && teamAId && teamBId) {
    const { data: resetFinal } = await supabase
      .from("bracket_matches")
      .select("id")
      .eq("championship_id", champId)
      .eq("category_id", catId)
      .eq("bracket_section", "reset_final")
      .maybeSingle();
    if (resetFinal && winnerParticipantId === teamBId) {
      await supabase.from("bracket_matches").update({
        participant_a_id: teamAId,
        participant_b_id: teamBId,
        team_a_id: securedMatch.team_a_id,
        team_b_id: securedMatch.team_b_id,
        updated_at: new Date().toISOString(),
      }).eq("id", resetFinal.id);
    } else if (resetFinal && winnerParticipantId === teamAId) {
      // Se o invicto vence a grande final, não há partida de reset. Limpa um
      // eventual resultado antigo caso o placar da grande final tenha sido editado.
      await supabase.from("bracket_matches").update({
        participant_a_id: null,
        participant_b_id: null,
        team_a_id: null,
        team_b_id: null,
        sets_a: null,
        sets_b: null,
        winner_id: null,
        winner_participant_id: null,
        set_details: null,
        updated_at: new Date().toISOString(),
      }).eq("id", resetFinal.id);
    }
  } else if (winnerParticipantId && securedMatch.next_winner_match_id) {
    await sendParticipant(securedMatch.next_winner_match_id, securedMatch.next_winner_slot, winnerParticipantId, winnerTeamId);
    await sendParticipant(securedMatch.next_loser_match_id, securedMatch.next_loser_slot, loserParticipantId, loserTeamId);
  }

  // Compatibilidade com chaves simples criadas antes dos vínculos explícitos.
  if (winnerParticipantId && !securedMatch.next_winner_match_id && securedMatch.bracket_section === "winners") {
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
  revalidatePath(`/staff/${champId}/chaveamento`);
  revalidatePath(`/campeonatos/${champId}/chaveamento`);
  return { ok: true };
}

export async function clearScore(matchId: string, champId: string) {
  const supabase = await createClient();
  if (!(await canManageBracket(supabase, champId))) return { ok: false, error: "Sem permissão para limpar este placar." };
  const { data: match } = await supabase
    .from("bracket_matches")
    .select("category_id")
    .eq("id", matchId)
    .eq("championship_id", champId)
    .maybeSingle();
  if (!match) return { ok: false, error: "Partida não encontrada." };

  const invalidation = await invalidateDependentMatches(champId, match.category_id, matchId);
  if (!invalidation.ok) return invalidation;

  const { error } = await supabase
    .from("bracket_matches")
    .update({
      sets_a: null,
      sets_b: null,
      winner_id: null,
      winner_participant_id: null,
      set_details: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .eq("championship_id", champId);
  if (error) return { ok: false, error: "Não foi possível limpar o placar." };
  // Reverte o rating que esse resultado tinha aplicado (idempotente — RPC
  // não faz nada se essa partida nunca teve rating aplicado).
  await createAdminClient().rpc("apply_bracket_match_rating", { p_match_id: matchId });
  revalidatePath(`/painel/campeonatos/${champId}/chaveamento`);
  revalidatePath(`/staff/${champId}/chaveamento`);
  revalidatePath(`/campeonatos/${champId}/chaveamento`);
  return { ok: true };
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
    .select("round_index, winner_participant_id, participant_a_id, participant_b_id, is_third_place, bracket_section")
    .eq("championship_id", champId)
    .eq("category_id", catId);

  if (!matches || matches.length === 0)
    return { ok: false, error: "Chaveamento não gerado." };

  const regularMatches = matches.filter((m) => !m.is_third_place && m.bracket_section !== "reset_final");
  const thirdPlace     = matches.find((m) => m.is_third_place || m.bracket_section === "third_place");

  if (regularMatches.length === 0)
    return { ok: false, error: "Chaveamento não gerado." };

  const maxRound     = Math.max(...regularMatches.map((m) => m.round_index));
  const finalMatches = regularMatches.filter((m) => m.round_index === maxRound);
  const hasChampeão  = finalMatches.every((m) => m.winner_participant_id);
  if (!hasChampeão) return { ok: false, error: "O chaveamento ainda não está completo." };

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
