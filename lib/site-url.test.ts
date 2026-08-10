import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SITE_URL, resolveBaseUrl } from "./site-url";

test("normaliza dominio de producao com ou sem protocolo", () => {
  assert.equal(resolveBaseUrl("rankftv.com.br"), "https://rankftv.com.br");
  assert.equal(resolveBaseUrl("https://rankftv.com.br///"), "https://rankftv.com.br");
});

test("preserva localhost explicito e usa fallback para URL invalida", () => {
  assert.equal(resolveBaseUrl("http://localhost:3000/"), "http://localhost:3000");
  assert.equal(resolveBaseUrl("://invalida"), DEFAULT_SITE_URL);
  assert.equal(resolveBaseUrl("javascript:alert(1)"), DEFAULT_SITE_URL);
});
