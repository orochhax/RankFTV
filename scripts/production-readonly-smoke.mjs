import assert from "node:assert/strict";

const EXPECTED_ORIGIN = "https://www.rankftv.com";
const origin = (process.env.PRODUCTION_BASE_URL ?? EXPECTED_ORIGIN).replace(/\/$/, "");
if (origin !== EXPECTED_ORIGIN) throw new Error("production_smoke_refused_unexpected_origin");

const results = [];

async function request(pathname, init = {}) {
  const startedAt = performance.now();
  const response = await fetch(`${origin}${pathname}`, { redirect: "manual", ...init });
  results.push({ pathname, status: response.status, durationMs: Math.round(performance.now() - startedAt) });
  return response;
}

function scriptSource(csp) {
  return csp.split(";").map((part) => part.trim()).find((part) => part.startsWith("script-src")) ?? "";
}

const health = await request("/api/health");
assert.equal(health.status, 200);
const healthBody = await health.json();
assert.equal(healthBody.status, "ok");
for (const forbidden of ["password", "secret", "service_role", "authorization"]) {
  assert.equal(JSON.stringify(healthBody).toLowerCase().includes(forbidden), false);
}

for (const pathname of ["/", "/campeonatos", "/login", "/termos", "/privacidade", "/robots.txt", "/sitemap.xml"]) {
  const response = await request(pathname);
  assert.equal(response.status, 200, `${pathname} deveria responder 200`);
  const csp = response.headers.get("content-security-policy") ?? "";
  if (pathname !== "/robots.txt" && pathname !== "/sitemap.xml") {
    assert.ok(csp, `${pathname} sem CSP`);
    assert.equal(scriptSource(csp).includes("'unsafe-inline'"), false, `${pathname} permite script inline inseguro`);
  }
}

const protectedPage = await request("/painel");
const protectedBody = await protectedPage.text();
const redirectsToLogin = [302, 303, 307, 308].includes(protectedPage.status)
  && (protectedPage.headers.get("location") ?? "").includes("/login");
const streamsLoginBoundary = protectedPage.status === 200
  && protectedBody.includes("/login")
  && !protectedBody.includes("Meus campeonatos");
assert.ok(redirectsToLogin || streamsLoginBoundary);
assert.match(protectedPage.headers.get("cache-control") ?? "", /no-store/);
assert.match(protectedPage.headers.get("x-robots-tag") ?? "", /noindex/);

const invalidWebhook = await request("/api/webhooks/asaas", {
  method: "POST",
  headers: { "content-type": "application/json", "asaas-access-token": "invalid-readonly-smoke" },
  body: JSON.stringify({}),
});
assert.equal(invalidWebhook.status, 401);

const invalidTicket = await request("/api/ticket-status", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ id: "invalid", tipo: "atleta", token: "invalid" }),
});
assert.equal(invalidTicket.status, 400);

const unauthorizedCron = await request("/api/cron/operational-alerts");
assert.equal(unauthorizedCron.status, 401);

const maximum = Math.max(...results.map((result) => result.durationMs));
const average = Math.round(results.reduce((sum, result) => sum + result.durationMs, 0) / results.length);
process.stdout.write(`${JSON.stringify({ ok: true, requests: results.length, averageMs: average, maximumMs: maximum, results }, null, 2)}\n`);
