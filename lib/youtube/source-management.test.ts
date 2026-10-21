import assert from "node:assert/strict";
import test from "node:test";
import { normalizeYoutubeSourceUrl, youtubeSourceCreateSchema } from "./source-management";

test("normaliza links públicos de fontes", () => {
  assert.equal(normalizeYoutubeSourceUrl(" HTTPS://YouTube.com/@canal/ "), "https://youtube.com/@canal");
  const parsed = youtubeSourceCreateSchema.parse({
    name: "Canal confiável",
    url: "https://www.youtube.com/@canal/videos#inicio",
    kind: "youtube",
  });
  assert.equal(parsed.url, "https://www.youtube.com/@canal/videos");
});

test("aceita os tipos editoriais usados no cadastro", () => {
  for (const kind of ["site", "blog", "youtube", "x", "newsletter", "reddit", "rss", "atom", "api", "other"] as const) {
    assert.equal(youtubeSourceCreateSchema.parse({ name: "Fonte teste", url: `https://example.com/${kind}`, kind }).kind, kind);
  }
});

test("rejeita endereços privados e credenciais na URL", () => {
  for (const url of ["http://localhost/feed", "http://192.168.1.20/feed", "https://user:pass@example.com/feed"]) {
    assert.equal(youtubeSourceCreateSchema.safeParse({ name: "Fonte teste", url, kind: "rss" }).success, false);
  }
});

