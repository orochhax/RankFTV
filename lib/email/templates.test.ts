import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, comunicadoHtml } from "@/lib/email/templates";

describe("escapeHtml (evita injeção de HTML/phishing em e-mail)", () => {
  test("escapa tag de script", () => {
    assert.equal(escapeHtml("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  test("escapa aspas (quebra de atributo)", () => {
    assert.equal(escapeHtml(`" onerror="alert(1)`), "&quot; onerror=&quot;alert(1)");
  });

  test("escapa &", () => {
    assert.equal(escapeHtml("Carlos & Julia"), "Carlos &amp; Julia");
  });

  test("texto normal fica intacto", () => {
    assert.equal(escapeHtml("Campeonato de Praia 2026"), "Campeonato de Praia 2026");
  });
});

describe("comunicadoHtml (título/mensagem livres do organizador — maior superfície de injeção)", () => {
  test("título com tag HTML vira texto literal no e-mail", () => {
    const html = comunicadoHtml({
      nomeAtleta: "Ana",
      nomeCampeonato: "Copa RankFTV",
      titulo: "<img src=x onerror=alert(1)>",
      mensagem: "Chegue 30min antes.",
    });
    assert.ok(!html.includes("<img src=x"));
    assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  });

  test("mensagem com script embutido vira texto literal", () => {
    const html = comunicadoHtml({
      nomeAtleta: "Ana",
      nomeCampeonato: "Copa RankFTV",
      titulo: "Aviso",
      mensagem: "<script>document.location='https://evil.example'</script>",
    });
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });
});
