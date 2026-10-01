import assert from "node:assert/strict";
import test from "node:test";
import { detectSafeImageMimeType, validateImageUpload, validatePdfUpload } from "./upload-preflight";

function uploadFile(bytes: number[], type: string) {
  const blob = new Blob([new Uint8Array(bytes)]);
  return { size: blob.size, slice: blob.slice.bind(blob), type };
}

test("detecta assinaturas de imagens permitidas", () => {
  assert.equal(detectSafeImageMimeType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(detectSafeImageMimeType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(detectSafeImageMimeType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])), "image/webp");
  assert.equal(detectSafeImageMimeType(new Uint8Array([0x3c, 0x73, 0x76, 0x67])), null);
});

test("recusa tipo declarado que não combina com o conteúdo", async () => {
  const result = await validateImageUpload(uploadFile([0x3c, 0x73, 0x76, 0x67], "image/png"));
  assert.deepEqual(result, { ok: false, error: "O conteúdo da imagem não corresponde ao formato informado." });
});

test("aceita PNG e normaliza a extensão", async () => {
  const result = await validateImageUpload(uploadFile([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image/png"));
  assert.deepEqual(result, { ok: true, mimeType: "image/png", extension: "png" });
});

test("aceita PDF somente com assinatura PDF real", async () => {
  const accepted = await validatePdfUpload(uploadFile([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31], "application/pdf"));
  const rejected = await validatePdfUpload(uploadFile([0x3c, 0x68, 0x74, 0x6d, 0x6c], "application/pdf"));

  assert.deepEqual(accepted, { ok: true });
  assert.deepEqual(rejected, { ok: false, error: "O conteúdo do arquivo não corresponde a um PDF." });
});
