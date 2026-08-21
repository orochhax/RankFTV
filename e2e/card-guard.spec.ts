import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { financialMutationSandboxEnabled } from "../lib/e2e-sandbox-safety";

const enabled = financialMutationSandboxEnabled("E2E_CARD_GUARD_MUTATION_TESTS")
  && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

function sandboxClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function beginAttempt(client: ReturnType<typeof sandboxClient>, seed: string, order: string) {
  const { data, error } = await client.rpc("begin_card_payment_attempt", {
    p_flow: "registration",
    p_order_reference: order,
    p_actor_id: null,
    p_ip_hash: `ip-${seed}`,
    p_card_fingerprint: `card-${seed}`,
    p_card_last4: "4242",
  });
  expect(error).toBeNull();
  return data as { allowed: boolean; attemptId: string; retryAfterSeconds: number };
}

async function cleanup(client: ReturnType<typeof sandboxClient>, seed: string, orders: string[]) {
  await client.from("payment_card_attempts").delete().in("order_reference", orders);
  await client.from("payment_card_guards").delete().or(
    `scope_key.eq.card:card-${seed},scope_key.eq.ip:ip-${seed},scope_key.like.order:registration:${seed}%`,
  );
}

test("sandbox serializes concurrent attempts for the same masked card", async () => {
  test.skip(!enabled, "Disposable Supabase card-security sandbox was not configured");
  const client = sandboxClient();
  const seed = randomUUID();
  const order = `${seed}-concurrent`;
  try {
    const attempts = await Promise.all(Array.from({ length: 8 }, () => beginAttempt(client, seed, order)));
    expect(attempts.filter((attempt) => attempt.allowed)).toHaveLength(6);
    expect(attempts.filter((attempt) => !attempt.allowed)).toHaveLength(2);

    const { data: stored } = await client
      .from("payment_card_attempts")
      .select("card_fingerprint, card_last4")
      .eq("order_reference", order);
    expect(stored).toHaveLength(8);
    expect(stored?.every((row) => row.card_last4 === "4242" && row.card_fingerprint === `card-${seed}`)).toBe(true);
  } finally {
    await cleanup(client, seed, [order]);
  }
});

test("sandbox cooldown blocks declines and a successful accepted attempt unlocks card and order", async () => {
  test.skip(!enabled, "Disposable Supabase card-security sandbox was not configured");
  const client = sandboxClient();
  const seed = randomUUID();
  const order = `${seed}-cooldown`;
  try {
    const attempts = [];
    for (let index = 0; index < 4; index++) attempts.push(await beginAttempt(client, seed, order));
    expect(attempts.every((attempt) => attempt.allowed)).toBe(true);

    for (const attempt of attempts.slice(0, 3)) {
      const { error } = await client.rpc("finish_card_payment_attempt", {
        p_attempt_id: attempt.attemptId,
        p_outcome: "declined",
        p_provider_code: "fixture_decline",
      });
      expect(error).toBeNull();
    }
    expect((await beginAttempt(client, seed, order)).allowed).toBe(false);

    const { error } = await client.rpc("finish_card_payment_attempt", {
      p_attempt_id: attempts[3].attemptId,
      p_outcome: "success",
      p_provider_code: "fixture_success",
    });
    expect(error).toBeNull();
    expect((await beginAttempt(client, seed, order)).allowed).toBe(true);
  } finally {
    await cleanup(client, seed, [order]);
  }
});
