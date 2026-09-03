// Atualiza (ou cria) o webhook do Asaas apontando para a URL de produção.
// Uso: node scripts/asaas-webhook-producao.mjs
//
// Lê ASAAS_API_KEY e ASAAS_BASE_URL do .env.local via @next/env.

import pkg from "@next/env";
const { loadEnvConfig } = pkg;
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
loadEnvConfig(resolve(__dirname, ".."));

const BASE_URL    = process.env.ASAAS_BASE_URL;
const API_KEY     = process.env.ASAAS_API_KEY;
const WH_TOKEN    = process.env.ASAAS_WEBHOOK_TOKEN;
const PROD_URL    = "https://www.rankftv.com/api/webhooks/asaas";

function writeOutput(message) {
  process.stdout.write(`${message}\n`);
}

function writeError(message) {
  process.stderr.write(`${message}\n`);
}

if (!BASE_URL || !API_KEY || !WH_TOKEN) {
  writeError("❌  Variáveis faltando no .env.local (ASAAS_BASE_URL, ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN)");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "access_token": API_KEY,
};

async function req(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

// 1. Lista webhooks existentes
const lista = await req("GET", "/webhooks");
const webhooks = lista.data ?? lista ?? [];
writeOutput(`\n📋  Webhooks cadastrados: ${webhooks.length}`);
webhooks.forEach((w) => writeOutput(`   · [${w.id}] ${w.url}  (ativo: ${w.enabled})`));

// 2. Remove os antigos (túnel ou qualquer URL diferente da produção)
for (const w of webhooks) {
  if (w.url !== PROD_URL) {
    await req("DELETE", `/webhooks/${w.id}`);
    writeOutput(`🗑️   Removido: ${w.url}`);
  } else {
    writeOutput(`✅  Já existe apontando pro prod: ${w.url}`);
    process.exit(0);
  }
}

// 3. Cria o webhook de produção
const payload = {
  name:          "RankFTV Produção",
  url:           PROD_URL,
  email:         "carlosrocha0923@gmail.com",
  enabled:       true,
  interrupted:   false,
  authToken:     WH_TOKEN,
  sendType:      "SEQUENTIALLY",
  events: [
    "PAYMENT_CONFIRMED",
    "PAYMENT_RECEIVED",
    "PAYMENT_REFUNDED",
    "PAYMENT_DELETED",
  ],
};

const criado = await req("POST", "/webhooks", payload);
if (criado?.id) {
  writeOutput("\n🎉  Webhook criado com sucesso!");
  writeOutput(`   ID:  ${criado.id}`);
  writeOutput(`   URL: ${criado.url}`);
} else {
  const errorCodes = Array.isArray(criado?.errors)
    ? criado.errors.map((error) => error?.code).filter(Boolean)
    : [];
  writeError(`\n❌  Falha ao criar webhook${errorCodes.length ? ` (${errorCodes.join(", ")})` : "."}`);
}
