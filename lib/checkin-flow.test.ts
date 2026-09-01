import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/actions/checkin.ts", "utf8");
const scannerSource = readFileSync("components/checkin/QrScanner.tsx", "utf8");

test("athlete check-in accepts authenticated and guest credentials", () => {
  assert.match(source, /\.from\("credentials"\)/);
  assert.match(source, /\.from\("athlete_tickets"\)/);
  assert.match(source, /\.eq\("championship_id", championshipId\)/);
  assert.match(source, /qr_token\.eq\.\$\{token\},code\.eq\.\$\{tokenUpper\}/);
  assert.match(source, /ticket\.status_pagamento !== "pago"/);
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
