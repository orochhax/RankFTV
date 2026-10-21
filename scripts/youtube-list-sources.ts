import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function parseEnv(text: string) {
  const values: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

async function main() {
  const environment = parseEnv(await readFile(path.resolve(".env.local"), "utf8"));
  const url = environment.NEXT_PUBLIC_SUPABASE_URL;
  const key = environment.SUPABASE_SECRET_KEY ?? environment.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuração Supabase de produção ausente.");
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.from("yt_sources")
    .select("id, name, kind, url")
    .eq("enabled", true)
    .is("archived_at", null)
    .order("name");
  if (error) throw new Error(`YOUTUBE_SOURCES_READ_FAILED: ${error.message}`);
  process.stdout.write(`${JSON.stringify({ environment: "production", activeSources: data ?? [] }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Falha desconhecida"}\n`);
  process.exitCode = 1;
});

