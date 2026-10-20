import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { test } from "node:test";

const enabled = process.env.P0_RPC_TEST_DISPOSABLE_SANDBOX === "RANKFTV_DISPOSABLE_SANDBOX";
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "P0_ORGANIZER_EMAIL",
  "P0_ORGANIZER_PASSWORD",
  "P0_OTHER_ORGANIZER_EMAIL",
  "P0_OTHER_ORGANIZER_PASSWORD",
  "P0_CHAMPIONSHIP_ID",
  "P0_OTHER_CHAMPIONSHIP_ID",
  "P0_EXTERNAL_USER_ID",
  "P0_ARENA_ID",
];

function configured() {
  if (!enabled) return false;
  for (const key of required) assert.ok(process.env[key]?.trim(), `missing_${key}`);
  const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
  assert.match(host, /^[a-z0-9]{20}\.supabase\.co$/i, "Must target a Supabase project");
  assert.notEqual(host.split(".")[0], "tkyopolcxfsdbhvrgadj", "Refusing production project");
  return true;
}

function clientWithToken(token: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

test("P0 RPCs reject forged price, direct Pix changes, unrelated users and parallel Elite debt", {
  skip: !configured() && "Configure an explicitly disposable Sandbox fixture to run the destructive integration test",
}, async () => {
  const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const otherAuthClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [ownerAuth, otherAuth] = await Promise.all([
    authClient.auth.signInWithPassword({ email: process.env.P0_ORGANIZER_EMAIL!, password: process.env.P0_ORGANIZER_PASSWORD! }),
    otherAuthClient.auth.signInWithPassword({ email: process.env.P0_OTHER_ORGANIZER_EMAIL!, password: process.env.P0_OTHER_ORGANIZER_PASSWORD! }),
  ]);
  assert.ifError(ownerAuth.error);
  assert.ifError(otherAuth.error);

  const owner = clientWithToken(ownerAuth.data.session!.access_token);
  const other = clientWithToken(otherAuth.data.session!.access_token);
  const championshipId = process.env.P0_CHAMPIONSHIP_ID!;
  const otherChampionshipId = process.env.P0_OTHER_CHAMPIONSHIP_ID!;
  const externalUserId = process.env.P0_EXTERNAL_USER_ID!;

  const { data: initial, error: initialError } = await owner
    .from("championships")
    .select("organizador_id,is_elite,premium_fee_pendente,status")
    .eq("id", championshipId)
    .single();
  assert.ifError(initialError);
  assert.equal(initial.organizador_id, ownerAuth.data.user!.id);
  assert.equal(initial.is_elite, false, "fixture must start with Elite disabled");
  assert.equal(Number(initial.premium_fee_pendente ?? 0), 0);
  assert.ok(["rascunho", "inscricoes_abertas"].includes(initial.status));

  const stamp = Date.now();
  const [forgedActivation, forgedCancellation, organizerPix, arenaPix, directOrganizerPix, directArenaPix] = await Promise.all([
    owner.rpc("ativar_championship_elite", { p_champ_id: championshipId, p_preco_elite: 0 } as never),
    owner.rpc("cancelar_championship_elite", { p_champ_id: championshipId, p_preco_elite: 0 } as never),
    owner.rpc("atualizar_chave_pix_organizador", { p_chave: `p0-${stamp}@example.invalid` }),
    owner.rpc("atualizar_chave_pix_arena", { p_arena_id: process.env.P0_ARENA_ID!, p_chave: `p0-${stamp}@example.invalid` }),
    owner.from("organizer_accounts").update({ chave_pix: `p0-${stamp}@example.invalid` }).eq("user_id", ownerAuth.data.user!.id),
    owner.from("arena_accounts").update({ chave_pix: `p0-${stamp}@example.invalid` }).eq("arena_id", process.env.P0_ARENA_ID!),
  ]);
  assert.ok(forgedActivation.error, "legacy price argument must not resolve");
  assert.ok(forgedCancellation.error, "legacy price argument must not resolve");
  assert.ok(organizerPix.error, "authenticated JWT must not execute organizer Pix RPC");
  assert.ok(arenaPix.error, "authenticated JWT must not execute arena Pix RPC");
  assert.ok(directOrganizerPix.error, "authenticated JWT must not update organizer Pix directly");
  assert.ok(directArenaPix.error, "authenticated JWT must not update arena Pix directly");

  const [externalContact, otherChampContact, otherOrganizerChamp] = await Promise.all([
    owner.rpc("organizer_profile_contacts", { p_championship_id: championshipId, p_user_ids: [externalUserId] }),
    owner.rpc("organizer_profile_contacts", { p_championship_id: otherChampionshipId, p_user_ids: [externalUserId] }),
    other.rpc("organizer_profile_contacts", { p_championship_id: championshipId, p_user_ids: [externalUserId] }),
  ]);
  assert.ifError(externalContact.error);
  assert.deepEqual(externalContact.data, []);
  assert.ok(otherChampContact.error);
  assert.ok(otherOrganizerChamp.error);

  const [activationA, activationB] = await Promise.all([
    owner.rpc("ativar_championship_elite", { p_champ_id: championshipId }),
    owner.rpc("ativar_championship_elite", { p_champ_id: championshipId }),
  ]);
  assert.ifError(activationA.error);
  assert.ifError(activationB.error);
  const { data: row, error } = await owner
    .from("championships")
    .select("is_elite,premium_fee_pendente")
    .eq("id", championshipId)
    .single();
  assert.ifError(error);
  assert.equal(row.is_elite, true);
  assert.equal(Number(row.premium_fee_pendente), 178);
});
