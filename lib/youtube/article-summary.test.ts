import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractArticleText, isSafeArticleUrl } from "./article-summary-utils";

describe("article summary source safety", () => {
  it("allows public http(s) URLs and blocks internal targets", () => {
    assert.equal(isSafeArticleUrl("https://example.com/news"), true);
    assert.equal(isSafeArticleUrl("http://localhost:3000/admin"), false);
    assert.equal(isSafeArticleUrl("http://127.0.0.1:8080"), false);
    assert.equal(isSafeArticleUrl("http://192.168.1.5/article"), false);
    assert.equal(isSafeArticleUrl("https://user:password@example.com/news"), false);
  });
});

describe("article text extraction", () => {
  it("removes page chrome and keeps readable article paragraphs", () => {
    const text = extractArticleText(`
      <nav>Menu that must not be summarized</nav>
      <article><h1>Uma notícia importante para criadores</h1>
      <p>A ferramenta foi lançada hoje e estará disponível para assinantes Pro.</p>
      <p>O preço inicial é de &amp; 20 dólares por mês, segundo a empresa.</p></article>
      <script>alert('tracking')</script>
    `);
    assert.match(text, /Uma notícia importante/);
    assert.match(text, /& 20 dólares/);
    assert.doesNotMatch(text, /Menu que must|tracking/);
  });
});
