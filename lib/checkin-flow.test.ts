import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/actions/checkin.ts", "utf8");
const scannerSource = readFileSync("components/checkin/QrScanner.tsx", "utf8");
const directorySource = readFileSync("lib/checkin-directory.ts", "utf8");
const organizerPageSource = readFileSync("app/painel/campeonatos/[id]/checkin/page.tsx", "utf8");
const clientSource = readFileSync("components/checkin/CheckinClient.tsx", "utf8");

test("athlete check-in accepts authenticated and guest credentials", () => {
  assert.match(source, /\.from\("credentials"\)/);
  assert.match(source, /\.from\("athlete_tickets"\)/);
  assert.match(source, /\.eq\("championship_id", championshipId\)/);
  assert.match(source, /qr_token\.eq\.\$\{token\},code\.eq\.\$\{tokenUpper\}/);
  assert.match(source, /ticket\.status_pagamento !== "pago"/);
  assert.match(source, /ticket\.comprador_nome, ticket\.parceiro_nome/);
});

test("check-in claims each QR only once", () => {
  const atomicClaims = source.match(/\.eq\("checked_in", false\)/g) ?? [];
  assert.equal(atomicClaims.length, 2);
  assert.match(source, /if \(!claimed\) return \{ alreadyDone: true, nome \}/);
  assert.match(source, /current\?\.checked_in[\s\S]*alreadyDone: true/);
});

test("camera scanner keeps an iOS-compatible decoder fallback", () => {
  assert.match(scannerSource, /from "qr-scanner"/);
  assert.match(scannerSource, /preferredCamera: "environment"/);
  assert.match(scannerSource, /returnDetailedScanResult: true/);
  assert.match(scannerSource, /scanner\.start\(\)/);
  assert.match(scannerSource, /scanner\.destroy\(\)/);
  assert.match(scannerSource, /playsInline/);
  assert.doesNotMatch(scannerSource, /!\("BarcodeDetector" in window\)/);
});

test("check-in directory includes paid guest pairs in counters and presence list", () => {
  assert.match(directorySource, /\.from\("credentials"\)/);
  assert.match(directorySource, /\.from\("athlete_tickets"\)/);
  assert.match(directorySource, /\.eq\("status_pagamento", "pago"\)/);
  assert.match(directorySource, /ticket\.comprador_nome, ticket\.parceiro_nome/);
  assert.match(directorySource, /kind: "pair"/);
  assert.match(organizerPageSource, /getCheckinDirectory\(id, user\.id\)/);
  assert.match(organizerPageSource, /allList\.filter\(\(item\) => item\.checked_in\)/);
});

test("successful scans refresh the server-rendered directory", () => {
  assert.match(clientSource, /await markCheckin\(token, championshipId\)/);
  assert.match(clientSource, /router\.refresh\(\)/);
});
