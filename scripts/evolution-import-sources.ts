import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

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

const snapshotSchema = z.record(z.string(), z.unknown());

async function main() {
  const [rawEnv, roadmapRaw, rankRaw] = await Promise.all([
    readFile(path.resolve(".env.local"), "utf8"),
    readFile(path.resolve("data/evolution/roadmap.json"), "utf8"),
    readFile(path.resolve("data/evolution/rankftv.json"), "utf8"),
  ]);
  const environment = { ...parseEnv(rawEnv), ...process.env };
  const url = environment.NEXT_PUBLIC_SUPABASE_URL;
  const key = environment.SUPABASE_SECRET_KEY ?? environment.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmail = environment.ADMIN_EMAIL?.trim().toLowerCase();
  if (!url || !key || !adminEmail) throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e/ou ADMIN_EMAIL.");

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;
  const owners = usersData.users.filter((user) => user.email?.toLowerCase() === adminEmail);
  if (owners.length !== 1) throw new Error(`Importação abortada: ADMIN_EMAIL corresponde a ${owners.length} contas; esperado: 1.`);

  const snapshots = [
    { source_kind: "roadmap", raw: roadmapRaw },
    { source_kind: "rankftv", raw: rankRaw },
  ].map((entry) => ({
    user_id: owners[0].id,
    source_kind: entry.source_kind,
    payload: snapshotSchema.parse(JSON.parse(entry.raw)),
    source_hash: createHash("sha256").update(entry.raw).digest("hex"),
    imported_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("evo_source_snapshots").upsert(snapshots, { onConflict: "user_id,source_kind" });
  if (error) throw error;
  process.stdout.write("Snapshots do roadmap e RankFTV importados para a Central de Evolução.\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
