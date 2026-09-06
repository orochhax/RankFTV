import assert from "node:assert/strict";
import test from "node:test";
import { buildBracketInvalidationPlan, type ProgressionMatch } from "./bracket-progression";

function match(overrides: Partial<ProgressionMatch> & Pick<ProgressionMatch, "id">): ProgressionMatch {
  return {
    round_index: 0,
    match_index: 0,
    bracket_section: "winners",
    is_third_place: false,
    winner_participant_id: null,
    next_winner_match_id: null,
    next_winner_slot: null,
    next_loser_match_id: null,
    next_loser_slot: null,
    ...overrides,
  };
}

test("troca de vencedor invalida os dois destinos e seus descendentes concluídos", () => {
  const matches = [
    match({ id: "origem", winner_participant_id: "p1", next_winner_match_id: "principal", next_winner_slot: "a", next_loser_match_id: "repescagem", next_loser_slot: "b" }),
    match({ id: "principal", winner_participant_id: "p1", next_winner_match_id: "semi", next_winner_slot: "a" }),
    match({ id: "repescagem", bracket_section: "losers", winner_participant_id: "p2", next_winner_match_id: "semi", next_winner_slot: "b" }),
    match({ id: "semi", round_index: 2, winner_participant_id: "p1", next_winner_match_id: "final", next_winner_slot: "a", next_loser_match_id: "terceiro", next_loser_slot: "a" }),
    match({ id: "final", round_index: 3 }),
    match({ id: "terceiro", bracket_section: "third_place", is_third_place: true }),
  ];

  assert.deepEqual(buildBracketInvalidationPlan(matches, "origem"), [
    { matchId: "principal", slots: ["a"] },
    { matchId: "repescagem", slots: ["b"] },
    { matchId: "semi", slots: ["a", "b"] },
    { matchId: "final", slots: ["a"] },
    { matchId: "terceiro", slots: ["a"] },
  ]);
});

test("jogo ainda não concluído interrompe a invalidação em cascata", () => {
  const matches = [
    match({ id: "origem", next_winner_match_id: "proximo", next_winner_slot: "a" }),
    match({ id: "proximo", round_index: 1, next_winner_match_id: "final", next_winner_slot: "a" }),
    match({ id: "final", round_index: 2 }),
  ];
  assert.deepEqual(buildBracketInvalidationPlan(matches, "origem"), [
    { matchId: "proximo", slots: ["a"] },
  ]);
});

test("chave simples antiga infere final e terceiro lugar a partir das semifinais", () => {
  const matches = [
    match({ id: "semi-a", round_index: 1, match_index: 0, winner_participant_id: "p1" }),
    match({ id: "semi-b", round_index: 1, match_index: 1, winner_participant_id: "p2" }),
    match({ id: "final", round_index: 2, match_index: 0 }),
    match({ id: "terceiro", round_index: 3, bracket_section: "third_place", is_third_place: true }),
  ];
  assert.deepEqual(buildBracketInvalidationPlan(matches, "semi-a"), [
    { matchId: "final", slots: ["a"] },
    { matchId: "terceiro", slots: ["a"] },
  ]);
});
