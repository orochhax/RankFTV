import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createDoubleEliminationPlan } from "../lib/double-elimination.ts";

const CHAMPIONSHIP_ID = "61212887-0228-4fcb-9f45-016f0399b01e";

function loadLocalEnv() {
  const raw = readFileSync(".env.local");
  const contents = raw[0] === 0xff && raw[1] === 0xfe
    ? raw.toString("utf16le")
    : raw.toString("utf8");
  for (const sourceLine of contents.split(/\r?\n/)) {
    const line = sourceLine.replace(/^\uFEFF/, "").trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadLocalEnv();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data: categories, error: categoryReadError } = await supabase
  .from("championship_categories")
  .select("id, nome")
  .eq("championship_id", CHAMPIONSHIP_ID)
  .order("created_at", { ascending: true });
if (categoryReadError) throw categoryReadError;
if (!categories?.length) throw new Error("A Copa Bahia não possui categoria para o chaveamento.");
const category = categories[0];

const { data: championship, error: championshipError } = await supabase
  .from("championships")
  .select("total_courts, primary_court_number")
  .eq("id", CHAMPIONSHIP_ID)
  .single();
if (championshipError) throw championshipError;

const { data: participants, error: participantError } = await supabase
  .from("bracket_participants")
  .select("id, team_id, display_name_snapshot")
  .eq("championship_id", CHAMPIONSHIP_ID)
  .eq("category_id", category.id)
  .eq("active", true)
  .order("display_name_snapshot", { ascending: true });
if (participantError) throw participantError;
if (participants?.length !== 16) {
  throw new Error(`Esperava 16 duplas ativas na Copa Bahia, mas encontrei ${participants?.length ?? 0}.`);
}

const participantIds = participants.map((participant) => participant.id);
const participantTeams = new Map(participants.map((participant) => [participant.id, participant.team_id]));
const plan = createDoubleEliminationPlan(participantIds);
const qualificationRounds = Math.log2(participantIds.length) - 1;
const idsByKey = new Map(plan.map((match) => [match.key, crypto.randomUUID()]));
const totalCourts = Math.max(1, championship.total_courts ?? 1);
const primaryCourt = Math.min(totalCourts, Math.max(1, championship.primary_court_number ?? 1));
const secondaryCourts = Array.from({ length: totalCourts }, (_, index) => index + 1)
  .filter((court) => court !== primaryCourt);

function courtFor(match) {
  if (match.section === "third_place") return secondaryCourts[0] ?? primaryCourt;
  if (match.section === "losers" && secondaryCourts.length > 0) {
    return secondaryCourts[(match.sectionRoundIndex + match.matchIndex) % secondaryCourts.length];
  }
  if (match.section === "winners" && match.sectionRoundIndex >= qualificationRounds) return primaryCourt;
  const available = [primaryCourt, ...secondaryCourts];
  return available[match.matchIndex % available.length];
}

await supabase.rpc("reverse_bracket_category_ratings", {
  p_championship_id: CHAMPIONSHIP_ID,
  p_category_id: category.id,
});
const { error: deleteError } = await supabase
  .from("bracket_matches")
  .delete()
  .eq("championship_id", CHAMPIONSHIP_ID)
  .eq("category_id", category.id);
if (deleteError) throw deleteError;

const { error: categoryUpdateError } = await supabase
  .from("championship_categories")
  .update({ bracket_format: "double_elimination", bracket_confirmed_at: null })
  .eq("id", category.id);
if (categoryUpdateError) throw categoryUpdateError;

const rows = plan.map((match) => ({
  id: idsByKey.get(match.key),
  championship_id: CHAMPIONSHIP_ID,
  category_id: category.id,
  round_index: match.roundIndex,
  match_index: match.matchIndex,
  bracket_section: match.section,
  section_round_index: match.sectionRoundIndex,
  is_third_place: match.section === "third_place",
  participant_a_id: match.participantAId,
  participant_b_id: match.participantBId,
  team_a_id: match.participantAId ? participantTeams.get(match.participantAId) ?? null : null,
  team_b_id: match.participantBId ? participantTeams.get(match.participantBId) ?? null : null,
  next_winner_match_id: match.nextWinnerKey ? idsByKey.get(match.nextWinnerKey) : null,
  next_winner_slot: match.nextWinnerSlot,
  next_loser_match_id: match.nextLoserKey ? idsByKey.get(match.nextLoserKey) : null,
  next_loser_slot: match.nextLoserSlot,
  court_label: String(courtFor(match)),
}));
const { error: insertError } = await supabase.from("bracket_matches").insert(rows);
if (insertError) throw insertError;

const states = new Map(plan.map((match) => [match.key, {
  ...match,
  participantAId: match.participantAId,
  participantBId: match.participantBId,
}]));

async function sendParticipant(destinationKey, slot, participantId) {
  if (!destinationKey || !participantId || (slot !== "a" && slot !== "b")) return;
  const destination = states.get(destinationKey);
  destination[slot === "a" ? "participantAId" : "participantBId"] = participantId;
  const { error } = await supabase.from("bracket_matches").update({
    [slot === "a" ? "participant_a_id" : "participant_b_id"]: participantId,
    [slot === "a" ? "team_a_id" : "team_b_id"]: participantTeams.get(participantId) ?? null,
  }).eq("id", idsByKey.get(destinationKey));
  if (error) throw error;
}

async function finishMatch(match, forceWinnerSlot) {
  const a = match.participantAId;
  const b = match.participantBId;
  if (!a || !b) throw new Error(`Partida ${match.key} ainda não recebeu as duas duplas.`);
  const winnerSlot = forceWinnerSlot ?? ((match.roundIndex + match.matchIndex) % 2 === 0 ? "a" : "b");
  const winner = winnerSlot === "a" ? a : b;
  const loser = winnerSlot === "a" ? b : a;
  const setsA = winnerSlot === "a" ? 2 : 0;
  const setsB = winnerSlot === "b" ? 2 : 0;
  const setDetails = winnerSlot === "a"
    ? [{ a: 6, b: 3 }, { a: 6, b: 4 }]
    : [{ a: 3, b: 6 }, { a: 4, b: 6 }];
  const { error } = await supabase.from("bracket_matches").update({
    sets_a: setsA,
    sets_b: setsB,
    winner_participant_id: winner,
    winner_id: participantTeams.get(winner) ?? null,
    set_details: setDetails,
  }).eq("id", idsByKey.get(match.key));
  if (error) throw error;
  await sendParticipant(match.nextWinnerKey, match.nextWinnerSlot, winner);
  await sendParticipant(match.nextLoserKey, match.nextLoserSlot, loser);
  return { winner, loser };
}

for (const match of plan.filter((item) => item.key.startsWith("w-"))) {
  await finishMatch(states.get(match.key));
}
for (const match of plan.filter((item) => item.section === "losers")) {
  await finishMatch(states.get(match.key));
}
for (const match of plan.filter((item) => item.key.startsWith("semi-"))) {
  await finishMatch(states.get(match.key));
}
await finishMatch(states.get("final"));
await finishMatch(states.get("third-place"));

// A demonstração deve permanecer editável para homologar troca/limpeza de
// resultados e a invalidação em cascata. A confirmação final é testada depois.
const { error: confirmationError } = await supabase
  .from("championship_categories")
  .update({ bracket_confirmed_at: null })
  .eq("id", category.id);
if (confirmationError) throw confirmationError;

console.log(JSON.stringify({
  championship: "Copa Bahia",
  category: category.nome,
  participants: participants.length,
  matches: plan.length,
  winnersMatches: plan.filter((match) => match.section === "winners").length,
  losersMatches: plan.filter((match) => match.section === "losers").length,
  semifinals: 2,
  final: 1,
  thirdPlace: 1,
}, null, 2));
