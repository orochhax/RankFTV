// Remove dados de demonstracao e todas as contas, exceto ADMIN_EMAIL.
// Por seguranca, o padrao e apenas conferir. Use --execute para efetivar.

import pkg from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const { loadEnvConfig } = pkg;
const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
loadEnvConfig(root);

const execute = process.argv.includes("--execute");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

if (!url || !serviceRole || !adminEmail) {
  throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou ADMIN_EMAIL.");
}

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listAllUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

const users = await listAllUsers();
const admins = users.filter((user) => user.email?.trim().toLowerCase() === adminEmail);
if (admins.length !== 1) {
  throw new Error(`Limpeza abortada: ADMIN_EMAIL corresponde a ${admins.length} contas; esperado: 1.`);
}

const admin = admins[0];
const otherUsers = users.filter((user) => user.id !== admin.id);
console.log(`Conta administrativa encontrada. Contas a remover: ${otherUsers.length}.`);

if (!execute) {
  console.log("Conferencia concluida; nenhum dado foi alterado. Rode novamente com --execute.");
} else {

// Ordem: filhos antes dos pais. Dados financeiros pessoais e configuracao da
// plataforma nao fazem parte da limpeza.
const tablesToEmpty = [
  "arena_attendance",
  "student_charges",
  "arena_daily_passes",
  "arena_rentals",
  "arena_subscriptions",
  "arena_students",
  "arena_classes",
  "arena_photos",
  "arena_plans",
  "arena_accounts",
  "arenas",
  "rating_history",
  "bracket_matches",
  "credentials",
  "shirt_production",
  "notifications",
  "championship_staff",
  "page_championship_invites",
  "registrations",
  "athlete_tickets",
  "spectator_tickets",
  "pricing_tiers",
  "coupons",
  "teams",
  "spectator_ticket_types",
  "championship_categories",
  "championships",
  "conquistas",
  "external_results",
  "external_athletes",
  "external_tournaments",
  "news",
];

for (const table of tablesToEmpty) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .not("id", "is", null);
  if (error?.code === "PGRST205") {
    console.log(`${table}: tabela de legado ausente; ignorada.`);
    continue;
  }
  if (error) throw new Error(`Falha ao limpar ${table}: ${error.message}`);
  console.log(`${table}: ${count ?? 0} removidos.`);
}

// Conteudo social de contas que serao apagadas. A pagina do admin e preservada.
for (const table of ["page_followers", "organizer_accounts", "profiles_private", "profiles"]) {
  const column = table === "pages" ? "owner_id" : table === "profiles" ? "id" : "user_id";
  const { error } = await supabase.from(table).delete().neq(column, admin.id);
  if (error?.code === "PGRST205") {
    console.log(`${table}: tabela de legado ausente; ignorada.`);
    continue;
  }
  if (error) throw new Error(`Falha ao limpar ${table}: ${error.message}`);
}

for (const user of otherUsers) {
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) throw new Error(`Falha ao remover uma conta: ${error.message}`);
}

// Remove valores esportivos sabidamente criados pelos seeds, sem apagar os
// dados cadastrais/financeiros privados da conta administrativa.
const { error: profileError } = await supabase
  .from("profiles")
  .update({ rating: 0, tamanho_camisa: null })
  .eq("id", admin.id);
if (profileError) throw profileError;

const remaining = await listAllUsers();
if (remaining.length !== 1 || remaining[0].id !== admin.id) {
  throw new Error(`Pos-condicao invalida: restaram ${remaining.length} contas.`);
}

console.log("Limpeza concluida: somente a conta administrativa permanece.");
}
