import assert from "node:assert/strict";
import test from "node:test";

import robots from "../app/robots";
import sitemap from "../app/sitemap";

test("robots indexes public pages and blocks private and API areas", () => {
  const config = robots();
  const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
  const blocked = rules.flatMap((rule) => rule.disallow ?? []);
  assert.ok(blocked.includes("/admin"));
  assert.ok(blocked.includes("/api"));
  assert.ok(blocked.includes("/painel"));
  assert.ok(blocked.includes("/perfil"));
  assert.match(String(config.sitemap), /\/sitemap\.xml$/);
});

test("sitemap contains only stable public launch routes", () => {
  const entries = sitemap();
  const paths = entries.map((entry) => new URL(entry.url).pathname);
  assert.ok(paths.includes("/"));
  assert.ok(paths.includes("/campeonatos"));
  assert.ok(paths.includes("/termos"));
  assert.ok(paths.includes("/privacidade"));
  assert.equal(paths.some((item) => item.startsWith("/admin") || item.startsWith("/painel")), false);
});
