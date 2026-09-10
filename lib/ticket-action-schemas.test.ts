import assert from "node:assert/strict";
import test from "node:test";
import {
  athleteCredentialReplacementSchema,
  championshipWaitlistSchema,
  spectatorCancellationSchema,
  spectatorOwnershipChangeSchema,
} from "./ticket-action-schemas";

test("aceita entradas válidas de ingresso e lista de espera", () => {
  const ticketId = crypto.randomUUID();
  const championshipId = crypto.randomUUID();
  assert.equal(spectatorOwnershipChangeSchema.safeParse({
    ticketId,
    accessToken: crypto.randomUUID(),
    compradorNome: "Pessoa de Teste",
    compradorEmail: "pessoa@example.com",
    compradorCpf: "123.456.789-09",
  }).success, true);
  assert.equal(spectatorCancellationSchema.safeParse({ ticketId, accessToken: crypto.randomUUID() }).success, true);
  assert.equal(athleteCredentialReplacementSchema.safeParse({
    championshipId,
    credentialId: crypto.randomUUID(),
  }).success, true);
  assert.equal(championshipWaitlistSchema.safeParse({
    championshipId,
    categoryId: crypto.randomUUID(),
    email: "pessoa@example.com",
    consent: true,
  }).success, true);
});

test("recusa identificadores, e-mails e campos extras inválidos", () => {
  assert.equal(spectatorCancellationSchema.safeParse({ ticketId: "x", accessToken: "y" }).success, false);
  assert.equal(championshipWaitlistSchema.safeParse({
    championshipId: crypto.randomUUID(),
    categoryId: crypto.randomUUID(),
    email: "invalido",
    consent: true,
    role: "admin",
  }).success, false);
});
