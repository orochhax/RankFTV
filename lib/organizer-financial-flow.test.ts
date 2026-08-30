import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const statusPage = readFileSync(
  "app/painel/campeonatos/[id]/financeiro/[status]/page.tsx",
  "utf8",
);
const expandableRow = readFileSync(
  "components/painel/InscricaoExpandivel.tsx",
  "utf8",
);

test("organizer financial detail includes authenticated and guest athlete purchases", () => {
  assert.match(statusPage, /\.from\("registrations"\)/);
  assert.match(statusPage, /\.from\("athlete_tickets"\)/);
  assert.match(statusPage, /\.eq\("status_pagamento", status\)/g);
  assert.match(statusPage, /const lista = \[\.\.\.listaRegs, \.\.\.listaTickets\]/);
  assert.match(statusPage, /\.sort\(\(a, b\) => b\.criadoEm\.localeCompare\(a\.criadoEm\)\)/);
  assert.match(statusPage, /\.slice\(\(page - 1\) \* pageSize, page \* pageSize\)/);
});

test("guest athlete rows do not render a fake username", () => {
  assert.match(expandableRow, /\{atleta\.username && \(/);
});
