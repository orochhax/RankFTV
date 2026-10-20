import assert from "node:assert/strict";
import test from "node:test";
import { validateUploadBytes } from "./upload-validation";

const png = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1,
  8, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

test("validates actual PNG signature, declared MIME, size and terminator", () => {
  assert.deepEqual(validateUploadBytes(png, "image/png", 1024), { ok: true, mimeType: "image/png", size: png.length });
});

test("rejects empty, oversized, spoofed MIME and truncated image", () => {
  assert.equal(validateUploadBytes(new Uint8Array(), "image/png", 1024).ok, false);
  assert.equal(validateUploadBytes(png, "image/jpeg", 1024).ok, false);
  assert.equal(validateUploadBytes(png, "image/png", png.length - 1).ok, false);
  assert.equal(validateUploadBytes(png.subarray(0, 20), "image/png", 1024).ok, false);
  assert.equal(validateUploadBytes(new TextEncoder().encode("not an image"), "image/png", 1024).ok, false);
});

test("accepts a structurally terminated PDF and rejects a truncated PDF", () => {
  const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF");
  assert.equal(validateUploadBytes(pdf, "application/pdf", 1024).ok, true);
  assert.equal(validateUploadBytes(pdf.subarray(0, 12), "application/pdf", 1024).ok, false);
});
