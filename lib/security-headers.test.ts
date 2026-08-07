import assert from "node:assert/strict";
import test from "node:test";

import {
  applyRequestSecurityHeaders,
  buildContentSecurityPolicy,
} from "./security-headers";

test("production CSP uses a request nonce without unsafe inline scripts", () => {
  const csp = buildContentSecurityPolicy("nonce123");
  const scriptDirective = csp
    .split("; ")
    .find((directive) => directive.startsWith("script-src"));

  assert.match(scriptDirective ?? "", /'nonce-nonce123'/);
  assert.match(scriptDirective ?? "", /'strict-dynamic'/);
  assert.doesNotMatch(scriptDirective ?? "", /'unsafe-inline'/);
  assert.doesNotMatch(scriptDirective ?? "", /'unsafe-eval'/);
  assert.match(csp, /challenges\.cloudflare\.com/);
  assert.match(csp, /upgrade-insecure-requests/);
});

test("development CSP permits eval only for the React development runtime", () => {
  const csp = buildContentSecurityPolicy("devnonce", { development: true });
  const scriptDirective = csp
    .split("; ")
    .find((directive) => directive.startsWith("script-src"));

  assert.match(scriptDirective ?? "", /'unsafe-eval'/);
  assert.doesNotMatch(csp, /upgrade-insecure-requests/);
});

test("response security headers include correlation and browser protections", () => {
  const headers = new Headers();
  applyRequestSecurityHeaders(headers, {
    csp: "default-src 'self'",
    requestId: "request-123",
    production: true,
  });

  assert.equal(headers.get("x-request-id"), "request-123");
  assert.equal(headers.get("x-frame-options"), "DENY");
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.match(headers.get("strict-transport-security") ?? "", /preload/);
});
