import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const required = [
  "E2E_BASE_URL",
  "E2E_SANDBOX_SUPABASE_PROJECT_REF",
  "E2E_CHAMPIONSHIP_ID",
  "E2E_CATEGORY_ID",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VERCEL_AUTOMATION_BYPASS_SECRET",
];
for (const key of required) {
  if (!process.env[key]?.trim()) throw new Error(`missing_${key}`);
}
if (process.env.E2E_DISPOSABLE_SANDBOX !== "RANKFTV_DISPOSABLE_SANDBOX") {
  throw new Error("sandbox_confirmation_missing");
}

const baseUrl = process.env.E2E_BASE_URL.replace(/\/$/, "");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const projectRef = process.env.E2E_SANDBOX_SUPABASE_PROJECT_REF.toLowerCase();
const previewHost = new URL(baseUrl).hostname.toLowerCase();
const supabaseHost = new URL(supabaseUrl).hostname.toLowerCase();
if (!previewHost.endsWith(".vercel.app") || !previewHost.includes("sandbox-homologacao")) {
  throw new Error("not_sandbox_preview");
}
if (projectRef === "tkyopolcxfsdbhvrgadj" || supabaseHost !== `${projectRef}.supabase.co`) {
  throw new Error("not_sandbox_supabase");
}

const championshipId = process.env.E2E_CHAMPIONSHIP_ID;
const categoryId = process.env.E2E_CATEGORY_ID;
const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let browser;
let createdMatchIds = [];

async function organizerEmail() {
  const { data: championship, error } = await admin
    .from("championships")
    .select("organizador_id")
    .eq("id", championshipId)
    .single();
  if (error) throw error;
  const { data, error: userError } = await admin.auth.admin.getUserById(championship.organizador_id);
  if (userError || !data.user?.email) throw userError ?? new Error("organizer_email_missing");
  return data.user.email;
}

async function authenticatedPage(email, path) {
  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${baseUrl}/auth/callback` },
  });
  if (error) throw error;
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
      "x-vercel-set-bypass-cookie": "true",
    },
  });
  const page = await context.newPage();
  await page.goto(
    `${baseUrl}/auth/callback?token_hash=${encodeURIComponent(link.properties.hashed_token)}`
      + `&type=magiclink&next=${encodeURIComponent(path)}`,
    { waitUntil: "domcontentloaded", timeout: 30_000 },
  );
  await page.waitForURL((url) => url.pathname === new URL(path, baseUrl).pathname, { timeout: 30_000 });
  return { context, page };
}

try {
  const { data: existing, error: existingError } = await admin
    .from("bracket_matches")
    .select("id")
    .eq("championship_id", championshipId)
    .eq("category_id", categoryId);
  if (existingError) throw existingError;
  if (existing.length !== 0) throw new Error("category_already_has_bracket");

  const { data: participants, error: participantsError } = await admin
    .from("bracket_participants")
    .select("id,display_name_snapshot")
    .eq("championship_id", championshipId)
    .eq("category_id", categoryId)
    .eq("active", true)
    .order("id");
  if (participantsError) throw participantsError;
  if (participants.length < 2) throw new Error("not_enough_active_participants");

  browser = await chromium.launch({ headless: true });
  const { context, page } = await authenticatedPage(
    await organizerEmail(),
    `/painel/campeonatos/${championshipId}/chaveamento?cat=${categoryId}`,
  );
  await page.getByRole("button", { name: /Gerar chaveamento/i }).click();

  let matches = [];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await admin
      .from("bracket_matches")
      .select("id,participant_a_id,participant_b_id,winner_participant_id,is_third_place")
      .eq("championship_id", championshipId)
      .eq("category_id", categoryId)
      .order("round_index")
      .order("match_index");
    if (error) throw error;
    matches = data;
    if (matches.length > 0) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(matches.length > 0, "bracket_was_not_created");
  createdMatchIds = matches.map((match) => match.id);

  const assigned = new Set(
    matches.flatMap((match) => [match.participant_a_id, match.participant_b_id]).filter(Boolean),
  );
  assert.deepEqual(assigned, new Set(participants.map((participant) => participant.id)));
  assert.equal(matches.some((match) => match.winner_participant_id !== null), false);

  await page.goto(`${baseUrl}/campeonatos/${championshipId}/chaveamento`, {
    waitUntil: "domcontentloaded",
  });
  for (const participant of participants) {
    for (const athleteName of participant.display_name_snapshot.split(" & ")) {
      await page.getByText(athleteName, { exact: true }).first().waitFor();
    }
  }
  await context.close();

  console.log(JSON.stringify({
    ok: true,
    participants: participants.length,
    matches: matches.length,
    publicNamesVisible: participants.length,
  }));
} finally {
  if (browser) await browser.close();
  if (createdMatchIds.length > 0) {
    const { error } = await admin.from("bracket_matches").delete().in("id", createdMatchIds);
    if (error) throw error;
  }
}
