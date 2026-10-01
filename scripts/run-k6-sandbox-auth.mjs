import { spawnSync } from "node:child_process";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const EXPECTED_SUPABASE_URL = "https://obfqzifcvsqnygwmtpnx.supabase.co";
const FIXTURE_ORGANIZER_EMAIL = "organizer-e2e-rankftv@example.com";
const FIXTURE_CHAMPIONSHIP_NAME = "Campeonato E2E Carga RankFTV";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`k6_sandbox_missing_${name.toLowerCase()}`);
  return value;
}

const baseUrl = required("K6_BASE_URL").replace(/\/$/, "");
const championshipId = required("K6_CHAMPIONSHIP_ID");
const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const secretKey = required("SUPABASE_SECRET_KEY");
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  || required("NEXT_PUBLIC_SUPABASE_ANON_KEY");

if (supabaseUrl !== EXPECTED_SUPABASE_URL || !secretKey.startsWith("sb_secret_")) {
  throw new Error("k6_sandbox_refused_unexpected_supabase");
}
if (!/^https:\/\/rank-ftv-git-sandbox-homologacao-devcarlosrochas-projects\.vercel\.app$/i.test(baseUrl)) {
  throw new Error("k6_sandbox_refused_unexpected_base_url");
}

const admin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page += 1) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (result.error) throw result.error;
    const found = result.data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found;
    if (result.data.users.length < 100) return null;
  }
  throw new Error("k6_sandbox_user_search_limit");
}

async function ensureFixtureUser() {
  const user = await findUserByEmail(FIXTURE_ORGANIZER_EMAIL);
  if (user) return user;

  const created = await admin.auth.admin.createUser({
    email: FIXTURE_ORGANIZER_EMAIL,
    email_confirm: true,
    user_metadata: { nome: "Organizador E2E Carga", username: "organizador_e2e_carga", genero: "masculino" },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("k6_sandbox_organizer_create_failed");
  return created.data.user;
}

async function ensureOrganizerProfile(userId) {
  const profile = await admin.from("profiles").upsert({
    id: userId,
    nome: "Organizador E2E Carga",
    username: "organizador_e2e_carga",
    role: "user",
    genero: "masculino",
    tamanho_camisa: "M",
  }, { onConflict: "id" });
  if (profile.error) throw profile.error;

  const account = await admin.from("organizer_accounts").upsert({
    user_id: userId,
    cpf_cnpj: "11144477735",
    telefone: "11999990001",
    data_nascimento: "1990-01-01",
    habilitado: true,
  }, { onConflict: "user_id" });
  if (account.error) throw account.error;
}

async function findFixtureChampionship(userId) {
  const existing = await admin
    .from("championships")
    .select("id")
    .eq("organizador_id", userId)
    .eq("nome", FIXTURE_CHAMPIONSHIP_NAME)
    .limit(1)
    .maybeSingle();
  if (existing.error) throw existing.error;
  return existing.data?.id ?? null;
}

async function createFixtureChampionship(userId) {
  const championship = await admin.from("championships").insert({
    organizador_id: userId,
    nome: FIXTURE_CHAMPIONSHIP_NAME,
    descricao: "Fixture descartável para carga somente leitura.",
    regulamento: "Sem pagamentos ou inscrições.",
    data_inicio: "2099-01-10",
    data_fim: "2099-01-11",
    cidade: "Salvador",
    estado: "BA",
    local: "Sandbox",
    status: "rascunho",
  }).select("id").single();
  if (championship.error || !championship.data?.id) throw championship.error ?? new Error("k6_sandbox_fixture_create_failed");
  return championship.data.id;
}

async function ensureOrganizerFixture() {
  const user = await ensureFixtureUser();
  await ensureOrganizerProfile(user.id);
  return (await findFixtureChampionship(user.id)) ?? createFixtureChampionship(user.id);
}

async function sessionCookieHeader(emailName) {
  const email = required(emailName).toLowerCase();
  if (!email.endsWith("@example.com")) throw new Error(`k6_sandbox_refused_non_disposable_${emailName.toLowerCase()}`);

  const generated = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (generated.error) throw generated.error;

  const verifier = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await verifier.auth.verifyOtp({
    token_hash: generated.data.properties.hashed_token,
    type: "email",
  });
  if (verified.error || !verified.data.session) {
    throw verified.error ?? new Error("k6_sandbox_session_missing");
  }

  const cookies = [];
  const ssr = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => [],
      setAll: (values) => cookies.push(...values.map(({ name, value }) => ({ name, value }))),
    },
  });
  const session = await ssr.auth.setSession({
    access_token: verified.data.session.access_token,
    refresh_token: verified.data.session.refresh_token,
  });
  if (session.error || cookies.length === 0) throw session.error ?? new Error("k6_sandbox_cookie_missing");
  return cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
}

const organizerChampionshipId = await ensureOrganizerFixture();
process.env.E2E_ORGANIZER_EMAIL = FIXTURE_ORGANIZER_EMAIL;
const [athleteCookieHeader, organizerCookieHeader] = await Promise.all([
  sessionCookieHeader("E2E_ATHLETE_EMAIL"),
  sessionCookieHeader("E2E_ORGANIZER_EMAIL"),
]);

const profile = process.env.K6_PROFILE?.trim() || "capacity";
const args = [
  "run",
  "-e", `BASE_URL=${baseUrl}`,
  "-e", `CHAMPIONSHIP_ID=${championshipId}`,
  "-e", `ORGANIZER_CHAMPIONSHIP_ID=${organizerChampionshipId}`,
  "-e", `K6_PROFILE=${profile}`,
  "-e", `ATHLETE_COOKIE_HEADER=${athleteCookieHeader}`,
  "-e", `ORGANIZER_COOKIE_HEADER=${organizerCookieHeader}`,
  "scripts/k6-sandbox-smoke.js",
];
const summaryExport = process.env.K6_SUMMARY_EXPORT?.trim();
if (summaryExport) args.splice(args.length - 1, 0, "--summary-export", summaryExport);
const childEnv = Object.fromEntries(
  ["PATH", "Path", "SystemRoot", "TEMP", "TMP"].flatMap((name) => process.env[name] ? [[name, process.env[name]]] : []),
);
const result = spawnSync("k6", args, { cwd: process.cwd(), env: childEnv, stdio: "inherit", shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
