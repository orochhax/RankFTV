/* global __ENV, __VU, __ITER */
// Teste de capacidade somente-leitura para o Preview/Sandbox.
// Uso: k6 run -e BASE_URL=https://... scripts/k6-sandbox-smoke.js
// Nunca aponta para Production e não cria pagamento, inscrição ou conta.
import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = (__ENV.BASE_URL || "").replace(/\/$/, "");
if (!/^https:\/\/rank-ftv-(git-sandbox-homologacao|[a-z0-9-]+-devcarlosrochas-projects)\.vercel\.app$/i.test(baseUrl)) {
  throw new Error("Refusing load test: BASE_URL must be an explicit RankFTV Sandbox/Preview URL.");
}

export const options = {
  stages: [
    { duration: "2m", target: 5 },
    { duration: "3m", target: 10 },
    { duration: "5m", target: 25 },
    { duration: "5m", target: 25 },
    { duration: "2m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],
  },
  userAgent: "RankFTV-Sandbox-k6/1.0",
};

const publicPaths = ["/", "/campeonatos", "/meus-ingressos"];

export default function () {
  const path = publicPaths[(__VU + __ITER) % publicPaths.length];
  const response = http.get(`${baseUrl}${path}`, { tags: { flow: "public_read" } });
  check(response, { "returns a public page": (res) => res.status >= 200 && res.status < 400 });
  sleep(1 + Math.random() * 2);
}
