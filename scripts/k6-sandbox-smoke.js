/* global __ENV, __VU, __ITER */
// Teste de capacidade somente-leitura para o Preview/Sandbox.
// Uso: k6 run -e BASE_URL=https://... scripts/k6-sandbox-smoke.js
// Nunca aponta para Production e não cria pagamento, inscrição ou conta.
import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = (__ENV.BASE_URL || "").replace(/\/$/, "");
if (!/^https:\/\/(?:rank-ftv-git-sandbox-homologacao|rank-[a-z0-9-]+-devcarlosrochas-projects)\.vercel\.app$/i.test(baseUrl)) {
  throw new Error("Refusing load test: BASE_URL must be an explicit RankFTV Sandbox/Preview URL.");
}

const sessionPath = __ENV.K6_SESSION_FILE;
if (!sessionPath) throw new Error("K6_SESSION_FILE is required for authenticated coverage.");
const sessions = JSON.parse(open(sessionPath));
if (!sessions.athleteCookie || !sessions.organizerCookie || !sessions.championshipId) {
  throw new Error("Sandbox session fixture is incomplete.");
}

const bypass = __ENV.VERCEL_AUTOMATION_BYPASS_SECRET;
const baseHeaders = bypass ? { "x-vercel-protection-bypass": bypass } : {};

const capacityStages = [
    { duration: "2m", target: 5 },
    { duration: "3m", target: 10 },
    { duration: "5m", target: 25 },
    { duration: "5m", target: 25 },
    { duration: "2m", target: 0 },
];
const validationStages = [{ duration: "15s", target: 2 }, { duration: "5s", target: 0 }];

export const options = {
  stages: __ENV.K6_QUICK === "1" ? validationStages : capacityStages,
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<3000"],
    "http_req_duration{flow:public_read}": ["p(95)<2500"],
    "http_req_duration{flow:athlete_page}": ["p(95)<3000"],
    "http_req_duration{flow:organizer_panel}": ["p(95)<3000"],
    "http_req_duration{flow:championship_operation}": ["p(95)<2500"],
    "http_req_duration{flow:ticket_status}": ["p(95)<1500"],
  },
  userAgent: "RankFTV-Sandbox-k6/1.0",
};

const publicPaths = ["/", "/campeonatos", "/campeonatos/ao-vivo", "/meus-ingressos"];
const athletePaths = ["/perfil", "/minhas-inscricoes", "/minhas-compras", "/meus-ingressos"];
const organizerPaths = ["/painel", "/painel/campeonatos"];
const championshipPaths = [
  `/campeonatos/${sessions.championshipId}`,
  `/campeonatos/${sessions.championshipId}/chaveamento`,
  `/campeonatos/${sessions.championshipId}/ao-vivo`,
];

function get(path, flow, cookie) {
  const headers = cookie ? { ...baseHeaders, Cookie: cookie } : baseHeaders;
  const response = http.get(`${baseUrl}${path}`, { headers, redirects: 0, tags: { flow } });
  check(response, {
    [`${flow} returns expected page`]: (res) => res.status >= 200 && res.status < 400,
    [`${flow} is not redirected to login`]: (res) => !String(res.headers.Location || "").includes("/login"),
  });
}

function ticketStatus() {
  if (!sessions.ticket) return false;
  const response = http.post(`${baseUrl}/api/ticket-status`, JSON.stringify({
    id: sessions.ticket.id,
    tipo: "atleta",
    token: sessions.ticket.access_token,
  }), {
    headers: { ...baseHeaders, "Content-Type": "application/json" },
    tags: { flow: "ticket_status" },
  });
  check(response, { "private ticket status succeeds": (res) => res.status === 200 });
  return true;
}

export default function publicReadSmoke() {
  const selector = (__VU + __ITER) % 5;
  if (selector === 0) get(publicPaths[__ITER % publicPaths.length], "public_read");
  if (selector === 1) get(athletePaths[__ITER % athletePaths.length], "athlete_page", sessions.athleteCookie);
  if (selector === 2) get(organizerPaths[__ITER % organizerPaths.length], "organizer_panel", sessions.organizerCookie);
  if (selector === 3) get(championshipPaths[__ITER % championshipPaths.length], "championship_operation");
  if (selector === 4 && !ticketStatus()) get("/meus-ingressos", "public_read");
  sleep(1 + Math.random() * 2);
}
