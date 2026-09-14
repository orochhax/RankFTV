import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const EXPECTED_URL = "https://obfqzifcvsqnygwmtpnx.supabase.co";
const email = process.env.E2E_ATHLETE_EMAIL?.trim().toLowerCase();
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (process.env.NEXT_PUBLIC_SUPABASE_URL !== EXPECTED_URL) {
  throw new Error("setup_e2e_refused_unexpected_supabase");
}
if (!secretKey?.startsWith("sb_secret_")) {
  throw new Error("setup_e2e_refused_missing_sandbox_secret");
}
if (!email?.endsWith("@example.com")) {
  throw new Error("setup_e2e_refused_non_disposable_email");
}

const admin = createClient(EXPECTED_URL, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(targetEmail) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === targetEmail);
    if (found) return found;
    if (data.users.length < 100) return null;
  }
  throw new Error("setup_e2e_user_search_limit");
}

let user = await findUserByEmail(email);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: `${randomUUID()}Aa1!`,
    email_confirm: true,
    user_metadata: {
      nome: "Atleta E2E Sandbox",
      username: "atleta_e2e_sandbox",
      genero: "masculino",
    },
  });
  if (error || !data.user) throw error ?? new Error("setup_e2e_create_user_failed");
  user = data.user;
}

const { error: profileError } = await admin.from("profiles").upsert({
  id: user.id,
  nome: "Atleta E2E Sandbox",
  username: "atleta_e2e_sandbox",
  role: "user",
  genero: "masculino",
  tamanho_camisa: "M",
}, { onConflict: "id" });
if (profileError) throw profileError;

const { error: privateError } = await admin.from("profiles_private").upsert({
  user_id: user.id,
  cpf: "52998224725",
  telefone: "11999990000",
  data_nascimento: "1995-01-01",
}, { onConflict: "user_id" });
if (privateError) throw privateError;

process.stdout.write(`Conta E2E de atleta pronta no Sandbox: ${user.id}\n`);

