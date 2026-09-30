import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const EXPECTED_SUPABASE_URL = "https://obfqzifcvsqnygwmtpnx.supabase.co";
const previewPattern = /^https:\/\/(?:rank-ftv-git-sandbox-homologacao|rank-[a-z0-9-]+-devcarlosrochas-projects)\.vercel\.app$/i;
const baseUrl = (process.env.BASE_URL ?? "").replace(/\/$/, "");
const outputPath = path.resolve(process.env.K6_SESSION_FILE ?? ".artifacts/k6-sandbox-session.json");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!previewPattern.test(baseUrl)) throw new Error("setup_k6_refused_non_preview_url");
if (supabaseUrl !== EXPECTED_SUPABASE_URL) throw new Error("setup_k6_refused_unexpected_supabase");
if (!publishableKey || !secretKey?.startsWith("sb_secret_")) throw new Error("setup_k6_missing_sandbox_keys");

const admin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function sessionCookie(email) {
  if (!email) throw new Error("setup_k6_missing_e2e_email");
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const verifier = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await verifier.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: "email",
  });
  if (verified.error || !verified.data.session) {
    throw verified.error ?? new Error("setup_k6_session_missing");
  }

  const cookies = [];
  const ssr = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => [],
      setAll: (updates) => cookies.push(...updates.map(({ name, value }) => ({ name, value }))),
    },
  });
  const { error: sessionError } = await ssr.auth.setSession({
    access_token: verified.data.session.access_token,
    refresh_token: verified.data.session.refresh_token,
  });
  if (sessionError) throw sessionError;
  return cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
}

async function loadReadTargets() {
  const { data: championship, error: championshipError } = await admin
    .from("championships")
    .select("id")
    .ilike("nome", "%Sandbox%")
    .limit(1)
    .maybeSingle();
  if (championshipError || !championship) throw championshipError ?? new Error("setup_k6_championship_missing");

  const { data: ticket, error: ticketError } = await admin
    .from("athlete_tickets")
    .select("id, access_token")
    .eq("status_pagamento", "pago")
    .like("comprador_email", "%@example.com")
    .limit(1)
    .maybeSingle();
  if (ticketError) throw ticketError;
  return { championshipId: championship.id, ticket: ticket ?? null };
}

const [athleteCookie, organizerCookie, targets] = await Promise.all([
  sessionCookie(process.env.E2E_ATHLETE_EMAIL?.trim().toLowerCase()),
  sessionCookie(process.env.E2E_ORGANIZER_EMAIL?.trim().toLowerCase()),
  loadReadTargets(),
]);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify({ athleteCookie, organizerCookie, ...targets }), {
  encoding: "utf8",
  mode: 0o600,
});
process.stdout.write("Sessões k6 descartáveis e alvos somente-leitura preparados no Sandbox.\n");
