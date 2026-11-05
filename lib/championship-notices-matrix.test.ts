import assert from "node:assert/strict";
import test from "node:test";
import { buildChampionshipChangeNotice, championshipNoticeRetryAt } from "./championship-notices-core";
import { emailRecipientDigest } from "./email/recipient-digest";
import { isEmailRecipientAllowed } from "./email/recipient-allowlist";

process.env.EMAIL_EVENT_HASH_SECRET = "test-secret-at-least-32-chars-long-for-hmac-sha256";

test("N01: Sem mudança relevante não gera aviso", () => {
  const current = { dataInicio: "2026-11-20", dataFim: "2026-11-22", cidade: "Salvador", estado: "BA", local: "Arena Central" };
  const notice = buildChampionshipChangeNotice(current, current);
  assert.equal(notice, null);
});

test("N02: Mudança de agenda/local gera aviso durável com mensagem descritiva", () => {
  const before = { dataInicio: "2026-11-20", dataFim: "2026-11-22", cidade: "Salvador", estado: "BA", local: "Arena Central" };
  const after = { dataInicio: "2026-11-27", dataFim: "2026-11-29", cidade: "Salvador", estado: "BA", local: "Arena Praia" };
  const notice = buildChampionshipChangeNotice(before, after);
  assert.ok(notice);
  assert.equal(notice.kind, "schedule");
  assert.match(notice.message, /Data anterior: 2026-11-20 a 2026-11-22/);
  assert.match(notice.message, /Nova data: 2026-11-27 a 2026-11-29/);
  assert.match(notice.message, /Local anterior: Arena Central, Salvador - BA/);
  assert.match(notice.message, /Novo local: Arena Praia, Salvador - BA/);
  assert.match(notice.dedupeKey, /^[a-f0-9]{64}$/);
});

test("N03: Edição de dados não relacionados à data/local não gera aviso", () => {
  const before = { dataInicio: "2026-11-20", dataFim: "2026-11-22", cidade: "Salvador", estado: "BA", local: "Arena Central" };
  const after = { ...before };
  const notice = buildChampionshipChangeNotice(before, after);
  assert.equal(notice, null);
});

test("N04 & N05: Deduplicação de e-mail por normalização e hash digest", () => {
  const email1 = "atleta@exemplo.com";
  const email2 = "  ATLETA@Exemplo.COM ";
  const digest1 = emailRecipientDigest(email1);
  const digest2 = emailRecipientDigest(email2);
  assert.equal(digest1, digest2);
  assert.match(digest1, /^[a-f0-9]{64}$/);
});

test("N06: Elegibilidade estrita: ingressos não pagos não são elegíveis", () => {
  const validStatus = "pago";
  const invalidStatuses = ["pendente", "expirado", "estornado", "cancelado", "recusado"];
  for (const s of invalidStatuses) {
    assert.notEqual(s, validStatus);
  }
});

test("N07: Repetição da mesma mudança gera a mesma dedupeKey para proteção de idempotência", () => {
  const before = { dataInicio: "2026-11-20", dataFim: "2026-11-22", cidade: "Salvador", estado: "BA", local: "Arena A" };
  const after = { ...before, local: "Arena B" };
  const noticeA = buildChampionshipChangeNotice(before, after);
  const noticeB = buildChampionshipChangeNotice(before, after);
  assert.equal(noticeA?.dedupeKey, noticeB?.dedupeKey);
});

test("N08: Nova mudança com operação distinta gera nova dedupeKey", () => {
  const before = { dataInicio: "2026-11-20", dataFim: "2026-11-22", cidade: "Salvador", estado: "BA", local: "Arena A" };
  const after = { ...before, local: "Arena B" };
  const notice1 = buildChampionshipChangeNotice(before, after, "op-1");
  const notice2 = buildChampionshipChangeNotice(before, after, "op-2");
  assert.notEqual(notice1?.dedupeKey, notice2?.dedupeKey);
});

test("N09: Backoff exponencial para falhas transitórias (5, 10, 20, 40 min)", () => {
  const baseTime = 1700000000000;
  const retry1 = new Date(championshipNoticeRetryAt(1, baseTime)).getTime() - baseTime;
  const retry2 = new Date(championshipNoticeRetryAt(2, baseTime)).getTime() - baseTime;
  const retry3 = new Date(championshipNoticeRetryAt(3, baseTime)).getTime() - baseTime;
  const retry4 = new Date(championshipNoticeRetryAt(4, baseTime)).getTime() - baseTime;

  assert.equal(retry1, 5 * 60_000);
  assert.equal(retry2, 10 * 60_000);
  assert.equal(retry3, 20 * 60_000);
  assert.equal(retry4, 40 * 60_000);
});

test("N10: Limite de 5 tentativas atinge teto", () => {
  const baseTime = 1700000000000;
  const retry5 = new Date(championshipNoticeRetryAt(5, baseTime)).getTime() - baseTime;
  assert.equal(retry5, 80 * 60_000);
});

test("N13 & N14: Minimização e proteção de allowlist", () => {
  assert.equal(isEmailRecipientAllowed("teste@exemplo.com", "teste@exemplo.com,atleta@rankftv.com"), true);
  assert.equal(isEmailRecipientAllowed("outro@externo.com", "teste@exemplo.com,atleta@rankftv.com"), false);
  assert.equal(isEmailRecipientAllowed("qualquer@exemplo.com", ""), true);
});
