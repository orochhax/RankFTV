import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const required = [
  "E2E_BASE_URL",
  "E2E_SANDBOX_SUPABASE_PROJECT_REF",
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
if (!championshipId) throw new Error("missing_E2E_CHAMPIONSHIP_ID");

const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const createdUsers = [];
let staffRowId = null;
let browser;

async function createTemporaryUser(label, role = "user") {
  const suffix = randomUUID().replaceAll("-", "");
  const email = `rankftv-${label}-${suffix}@example.com`;
  const password = `${randomUUID()}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome: `E2E ${label}`, username: `e2e_${label}_${suffix.slice(0, 10)}` },
  });
  if (error || !data.user) throw error ?? new Error(`create_${label}_failed`);
  createdUsers.push(data.user.id);

  const { data: profile } = await admin.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
  if (!profile) {
    const { error: profileError } = await admin.from("profiles").insert({
      id: data.user.id,
      nome: `E2E ${label}`,
      username: `e2e_${label}_${suffix.slice(0, 10)}`,
      role,
    });
    if (profileError) throw profileError;
  } else if (role !== "user") {
    const { error: roleError } = await admin.from("profiles").update({ role }).eq("id", data.user.id);
    if (roleError) throw roleError;
  }
  return { id: data.user.id, email };
}

async function userClient(email) {
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) throw linkError;
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await client.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (error) throw error;
  return client;
}

async function authenticatedPage(email, next) {
  const expectedPathname = new URL(next, baseUrl).pathname;
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
      + `&type=magiclink&next=${encodeURIComponent(next)}`,
    { waitUntil: "domcontentloaded", timeout: 30_000 },
  );
  await page.waitForURL((url) => url.pathname === expectedPathname, { timeout: 30_000 });
  return { context, page };
}

async function authEmail(userId) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) throw error ?? new Error("user_email_missing");
  return data.user.email;
}

try {
  const { data: championship, error: championshipError } = await admin
    .from("championships")
    .select("organizador_id")
    .eq("id", championshipId)
    .single();
  if (championshipError) throw championshipError;

  const { data: athleteTicket, error: athleteError } = await admin
    .from("athlete_tickets")
    .select("id,user_id")
    .eq("championship_id", championshipId)
    .eq("status_pagamento", "pago")
    .not("user_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (athleteError || !athleteTicket?.user_id) {
    throw athleteError ?? new Error("linked_paid_athlete_missing");
  }

  const organizerEmail = await authEmail(championship.organizador_id);
  const athleteEmail = await authEmail(athleteTicket.user_id);
  const staff = await createTemporaryUser("staff");
  const commercialAdmin = await createTemporaryUser("admin", "admin");
  const unrelated = await createTemporaryUser("unlinked");

  const { data: staffRow, error: staffError } = await admin
    .from("championship_staff")
    .insert({
      championship_id: championshipId,
      user_id: staff.id,
      invited_by: championship.organizador_id,
      status: "aceito",
      can_qrcode: true,
      can_inscricoes: true,
      can_chaveamento: true,
    })
    .select("id")
    .single();
  if (staffError) throw staffError;
  staffRowId = staffRow.id;

  const organizerClient = await userClient(organizerEmail);
  const athleteClient = await userClient(athleteEmail);
  const staffClient = await userClient(staff.email);
  const adminClient = await userClient(commercialAdmin.email);
  const unrelatedClient = await userClient(unrelated.email);

  const { data: organizerTicket } = await organizerClient
    .from("athlete_tickets").select("id").eq("id", athleteTicket.id);
  const { data: organizerStaff } = await organizerClient
    .from("championship_staff").select("id").eq("id", staffRowId);
  assert.equal(organizerTicket?.length, 1);
  assert.equal(organizerStaff?.length, 1);

  const { data: athleteOwn } = await athleteClient
    .from("athlete_tickets").select("id").eq("id", athleteTicket.id);
  const { data: athleteStaff } = await athleteClient
    .from("championship_staff").select("id").eq("id", staffRowId);
  assert.equal(athleteOwn?.length, 1);
  assert.equal(athleteStaff?.length, 0);

  const { data: ownStaff } = await staffClient
    .from("championship_staff").select("id").eq("id", staffRowId);
  const { error: staffRegistrationsError } = await staffClient
    .from("registrations").select("id").eq("championship_id", championshipId).limit(1);
  const { data: staffGuestTicket } = await staffClient
    .from("athlete_tickets").select("id").eq("id", athleteTicket.id);
  assert.equal(ownStaff?.length, 1);
  assert.equal(staffRegistrationsError, null);
  assert.equal(staffGuestTicket?.length, 0);

  const { data: adminRole } = await adminClient
    .from("profiles").select("role").eq("id", commercialAdmin.id).single();
  assert.equal(adminRole?.role, "admin");

  const { data: unrelatedStaff } = await unrelatedClient
    .from("championship_staff").select("id").eq("id", staffRowId);
  const { data: unrelatedTicket } = await unrelatedClient
    .from("athlete_tickets").select("id").eq("id", athleteTicket.id);
  assert.equal(unrelatedStaff?.length, 0);
  assert.equal(unrelatedTicket?.length, 0);

  browser = await chromium.launch({ headless: true });

  {
    const { context, page } = await authenticatedPage(organizerEmail, `/painel/campeonatos/${championshipId}`);
    await page.getByText("Receita confirmada", { exact: true }).waitFor();
    await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
    assert.equal(new URL(page.url()).pathname, "/");
    await context.close();
  }
  {
    const { context, page } = await authenticatedPage(athleteEmail, "/minhas-compras?aba=atleta");
    await page.getByRole("heading", { name: "Minhas compras", exact: true }).waitFor();
    await page.goto(`${baseUrl}/painel/campeonatos/${championshipId}`, { waitUntil: "domcontentloaded" });
    assert.equal(await page.getByText("Receita confirmada", { exact: true }).count(), 0);
    await context.close();
  }
  {
    const { context, page } = await authenticatedPage(staff.email, `/staff/${championshipId}`);
    await page.getByText("Você está acessando como staff", { exact: true }).waitFor();
    await page.goto(`${baseUrl}/painel/campeonatos/${championshipId}`, { waitUntil: "domcontentloaded" });
    assert.equal(await page.getByText("Receita confirmada", { exact: true }).count(), 0);
    await context.close();
  }
  {
    const { context, page } = await authenticatedPage(commercialAdmin.email, "/admin");
    await page.getByRole("heading", { name: "Painel Admin", exact: true }).waitFor();
    await page.goto(`${baseUrl}/painel/campeonatos/${championshipId}`, { waitUntil: "domcontentloaded" });
    assert.equal(await page.getByText("Receita confirmada", { exact: true }).count(), 0);
    await context.close();
  }
  {
    const { context, page } = await authenticatedPage(unrelated.email, `/staff/${championshipId}`);
    await page.goto(`${baseUrl}/staff/${championshipId}`, { waitUntil: "domcontentloaded" });
    assert.equal(await page.getByText("Você está acessando como staff", { exact: true }).count(), 0);
    await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
    assert.equal(new URL(page.url()).pathname, "/");
    await context.close();
  }

  const { data: buckets, error: bucketsError } = await admin.storage.listBuckets();
  if (bucketsError) throw bucketsError;

  console.log(JSON.stringify({
    ok: true,
    roles: {
      organizer: "own_panel_and_financial_rows_only",
      athlete: "own_ticket_and_purchases_only",
      staff: "assigned_staff_routes_and_registration_reads_only",
      admin: "commercial_admin_only",
      unlinked: "protected_routes_and_rows_denied",
    },
    temporaryUsersRemoved: createdUsers.length,
    storage: buckets.length === 0 ? "not_testable_no_buckets_in_sandbox" : `${buckets.length}_bucket(s)_require_policy_tests`,
  }));
} finally {
  if (browser) await browser.close();
  if (staffRowId) await admin.from("championship_staff").delete().eq("id", staffRowId);
  for (const userId of createdUsers.reverse()) {
    await admin.auth.admin.deleteUser(userId);
  }
}
