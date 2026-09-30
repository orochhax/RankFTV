import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildChampionshipChangeNotice } from "./championship-notices-core";

test("championship notice explains date and location changes", () => {
  const notice = buildChampionshipChangeNotice(
    { dataInicio: "2026-09-10", dataFim: "2026-09-11", cidade: "Salvador", estado: "BA", local: "Arena A" },
    { dataInicio: "2026-09-12", dataFim: "2026-09-13", cidade: "Lauro", estado: "BA", local: "Arena B" },
  );
  assert.equal(notice?.kind, "schedule");
  assert.match(notice?.message ?? "", /Data anterior: 2026-09-10 a 2026-09-11/);
  assert.match(notice?.message ?? "", /Nova data/);
  assert.match(notice?.message ?? "", /Local anterior: Arena A, Salvador - BA/);
  assert.match(notice?.message ?? "", /Novo local/);
  assert.match(notice?.dedupeKey ?? "", /^[a-f0-9]{64}$/);
});

test("championship notice is stable and ignores unrelated edits", () => {
  const before = { dataInicio: "2026-09-10T10:00", dataFim: "2026-09-11T18:00", cidade: "Salvador", estado: "BA", local: "Arena A" };
  assert.equal(buildChampionshipChangeNotice(before, before), null);
  assert.equal(
    buildChampionshipChangeNotice(before, { ...before, local: "Arena B" })?.dedupeKey,
    buildChampionshipChangeNotice(before, { ...before, local: "Arena B" })?.dedupeKey,
  );
});

test("a later repetition of the same transition can create a new operational notice", () => {
  const before = { dataInicio: "2026-09-10", dataFim: "2026-09-11", cidade: "Salvador", estado: "BA", local: "Arena A" };
  const after = { ...before, local: "Arena B" };
  assert.notEqual(
    buildChampionshipChangeNotice(before, after, "operation-1")?.dedupeKey,
    buildChampionshipChangeNotice(before, after, "operation-2")?.dedupeKey,
  );
});

test("championship notice delivery persists hashes and resolves recipients just in time", () => {
  const source = readFileSync(new URL("./championship-notices.ts", import.meta.url), "utf8");
  assert.match(source, /recipient_hash: emailRecipientDigest/);
  assert.match(source, /getUserById\(row\.recipient_ref\)/);
  assert.match(source, /status_pagamento !== "pago"/);
  assert.match(source, /idempotencyKey: `championship-change-/);
  assert.doesNotMatch(source, /championship_notice_deliveries[\s\S]{0,400}recipient_email/);
});

test("notification worker atomically claims deliveries before contacting the provider", () => {
  const worker = readFileSync(new URL("./championship-notices.ts", import.meta.url), "utf8");
  const migration = readFileSync(
    new URL("../supabase/production-championship-notification-claims.sql", import.meta.url),
    "utf8",
  );

  assert.match(worker, /rpc\("claim_championship_notice_deliveries"/);
  assert.doesNotMatch(worker, /\.from\("championship_notice_deliveries"\)\s*\.select/);
  assert.match(migration, /FOR UPDATE SKIP LOCKED/);
  assert.match(migration, /status = 'processing'/);
  assert.match(migration, /claimed_at < now\(\) - interval '15 minutes'/);
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated/);
});

test("organizer is warned before a date or location change notifies athletes", () => {
  const form = readFileSync(
    new URL("../components/painel/EditarCampeonatoForm.tsx", import.meta.url),
    "utf8",
  );

  assert.match(form, /const notificaAtletas/);
  assert.match(form, /Aviso automático aos atletas/);
  assert.match(form, /todos os atletas com inscrição paga e ativa receberão um e-mail e uma notificação/);
});

test("historical championship changes are not exposed on public or ticket pages", () => {
  const publicPage = readFileSync(
    new URL("../app/campeonatos/[id]/page.tsx", import.meta.url),
    "utf8",
  );
  const ticketPage = readFileSync(
    new URL("../app/campeonatos/[id]/comprar/ingresso/[ticketId]/page.tsx", import.meta.url),
    "utf8",
  );

  for (const page of [publicPage, ticketPage]) {
    assert.doesNotMatch(page, /ChampionshipNotices/);
    assert.doesNotMatch(page, /from\("championship_notices"\)/);
  }
});
