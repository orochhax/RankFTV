/* global __ENV, __VU, __ITER */
// Teste de capacidade somente-leitura para o Preview/Sandbox.
// Uso: k6 run -e BASE_URL=https://... scripts/k6-sandbox-smoke.js
// Nunca aponta para Production e não cria pagamento, inscrição ou conta.
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const baseUrl = (__ENV.BASE_URL || "").replace(/\/$/, "");
if (!/^https:\/\/(?:rank-ftv-git-sandbox-homologacao-devcarlosrochas-projects|rank-[a-z0-9]+-devcarlosrochas-projects)\.vercel\.app$/i.test(baseUrl)) {
  throw new Error("Refusing load test: BASE_URL must be an explicit RankFTV Sandbox/Preview URL.");
}

const championshipId = (__ENV.CHAMPIONSHIP_ID || "").trim();
const organizerChampionshipId = (__ENV.ORGANIZER_CHAMPIONSHIP_ID || championshipId).trim();
const athleteCookieHeader = (__ENV.ATHLETE_COOKIE_HEADER || "").trim();
const organizerCookieHeader = (__ENV.ORGANIZER_COOKIE_HEADER || "").trim();
const smokeProfile = (__ENV.K6_PROFILE || "").trim().toLowerCase() === "smoke";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (championshipId && !uuidPattern.test(championshipId)) {
  throw new Error("Refusing load test: CHAMPIONSHIP_ID must be a UUID.");
}
if (organizerChampionshipId && !uuidPattern.test(organizerChampionshipId)) {
  throw new Error("Refusing load test: ORGANIZER_CHAMPIONSHIP_ID must be a UUID.");
}
if ([athleteCookieHeader, organizerCookieHeader].some((header) => /[\r\n]/.test(header))) {
  throw new Error("Refusing load test: a cookie header contains an invalid line break.");
}

const routeFailures = new Rate("rankftv_route_failures");
const routeDuration = new Trend("rankftv_route_duration", true);

export const options = {
  stages: smokeProfile ? [
    { duration: "10s", target: 1 },
    { duration: "20s", target: 1 },
    { duration: "5s", target: 0 },
  ] : [
    { duration: "2m", target: 5 },
    { duration: "3m", target: 10 },
    { duration: "5m", target: 25 },
    { duration: "5m", target: 25 },
    { duration: "2m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],
    rankftv_route_failures: ["rate<0.01"],
    "rankftv_route_duration{flow:public}": ["p(95)<1500"],
    "rankftv_route_duration{flow:championship}": ["p(95)<1500"],
    "rankftv_route_duration{flow:authenticated}": ["p(95)<1500"],
  },
  userAgent: "RankFTV-Sandbox-k6/1.0",
};

const routes = [
  { name: "home", path: "/", flow: "public", authenticated: false },
  { name: "championships", path: "/campeonatos", flow: "public", authenticated: false },
  { name: "arenas", path: "/arenas", flow: "public", authenticated: false },
  { name: "news", path: "/noticias", flow: "public", authenticated: false },
  { name: "login", path: "/login", flow: "public", authenticated: false },
  { name: "signup", path: "/cadastro", flow: "public", authenticated: false },
];

if (championshipId) {
  routes.push(
    { name: "championship", path: `/campeonatos/${championshipId}`, flow: "championship", authenticated: false },
    { name: "categories", path: `/campeonatos/${championshipId}/categorias`, flow: "championship", authenticated: false },
    { name: "bracket", path: `/campeonatos/${championshipId}/chaveamento`, flow: "championship", authenticated: false },
    { name: "live-score", path: `/campeonatos/${championshipId}/ao-vivo`, flow: "championship", authenticated: false },
  );
}

if (athleteCookieHeader) {
  routes.push(
    { name: "purchases", path: "/minhas-compras", flow: "authenticated", cookie: athleteCookieHeader },
    { name: "my-tickets", path: "/meus-ingressos", flow: "authenticated", cookie: athleteCookieHeader },
  );
}

if (organizerCookieHeader) {
  routes.push(
    { name: "organizer-panel", path: "/painel", flow: "authenticated", cookie: organizerCookieHeader },
    { name: "organizer-championships", path: "/painel/campeonatos", flow: "authenticated", cookie: organizerCookieHeader },
  );
  if (organizerChampionshipId) {
    routes.push(
      { name: "organizer-championship", path: `/painel/campeonatos/${organizerChampionshipId}`, flow: "authenticated", cookie: organizerCookieHeader },
      { name: "organizer-bracket", path: `/painel/campeonatos/${organizerChampionshipId}/chaveamento`, flow: "authenticated", cookie: organizerCookieHeader },
      { name: "organizer-checkin", path: `/painel/campeonatos/${organizerChampionshipId}/checkin`, flow: "authenticated", cookie: organizerCookieHeader },
    );
  }
}

export default function publicReadSmoke() {
  const route = routes[(__VU + __ITER) % routes.length];
  const response = http.get(`${baseUrl}${route.path}`, {
    headers: route.cookie ? { Cookie: route.cookie } : undefined,
    redirects: route.cookie ? 0 : 5,
    tags: { flow: route.flow, route: route.name },
  });
  const passed = check(response, {
    "returns the expected page": (res) => route.cookie ? res.status === 200 : res.status >= 200 && res.status < 400,
    "does not return a server error": (res) => res.status < 500,
  }, { flow: route.flow, route: route.name });
  routeFailures.add(!passed, { flow: route.flow, route: route.name });
  routeDuration.add(response.timings.duration, { flow: route.flow, route: route.name });
  sleep(1 + Math.random() * 2);
}
