import assert from "node:assert/strict";
import test from "node:test";
import {
  isParticipantCategoryConflict,
  participantCategoryConflictMessage,
} from "./participant-registration";

test("reconhece somente a violação de participante por categoria", () => {
  assert.equal(isParticipantCategoryConflict({
    code: "23505",
    message: "PARTICIPANT_ALREADY_REGISTERED",
  }), true);
  assert.equal(isParticipantCategoryConflict({
    code: "23505",
    details: "Key violates teams_one_active_category_per_atleta1",
  }), true);
  assert.equal(isParticipantCategoryConflict({ code: "23505", message: "access_token_unique" }), false);
  assert.equal(isParticipantCategoryConflict({ code: "23514", message: "PARTICIPANT_ALREADY_REGISTERED" }), false);
});

test("mensagem não revela qual integrante causou o conflito", () => {
  assert.match(participantCategoryConflictMessage, /você ou seu parceiro/i);
});
