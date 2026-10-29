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
  const args = process.argv.slice(2);
  const dataDirIndex = args.indexOf("--data-dir");
  const onlyIndex = args.indexOf("--only");
  const dataDir = dataDirIndex >= 0 ? path.resolve(args[dataDirIndex + 1]) : path.resolve("data/evolution");
  const only = onlyIndex >= 0 ? args[onlyIndex + 1] : null;
  if (only && only !== "roadmap" && only !== "rankftv") {
    throw new Error("--only deve ser roadmap ou rankftv.");
  }
  const [rawEnv, roadmapRaw, rankRaw] = await Promise.all([
    readFile(path.resolve(".env.local"), "utf8"),
    readFile(path.join(dataDir, "roadmap.json"), "utf8"),
    readFile(path.join(dataDir, "rankftv.json"), "utf8"),
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
  ].filter((entry) => !only || entry.source_kind === only).map((entry) => ({
    user_id: owners[0].id,
    source_kind: entry.source_kind,
    payload: snapshotSchema.parse(JSON.parse(entry.raw)),
    source_hash: createHash("sha256").update(entry.raw).digest("hex"),
    imported_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("evo_source_snapshots").upsert(snapshots, { onConflict: "user_id,source_kind" });
  if (error) throw error;
  const { data: storedSnapshots, error: verifyError } = await supabase
    .from("evo_source_snapshots")
    .select("source_kind,source_hash,payload")
    .eq("user_id", owners[0].id)
    .in("source_kind", snapshots.map((item) => item.source_kind));
  if (verifyError) throw verifyError;
  for (const expected of snapshots) {
    const stored = storedSnapshots?.find((item) => item.source_kind === expected.source_kind);
    if (!stored || stored.source_hash !== expected.source_hash) {
      throw new Error(`Verificação falhou para o snapshot ${expected.source_kind}.`);
    }
  }
  process.stdout.write(`Snapshots importados para a Central de Evolução: ${snapshots.map((item) => item.source_kind).join(", ")}.\n`);
  const roadmap = storedSnapshots?.find((item) => item.source_kind === "roadmap")?.payload as { totalBusinessDays?: number; period?: { start?: string; end?: string } } | undefined;
  if (roadmap) process.stdout.write(`Roadmap verificado: ${roadmap.totalBusinessDays ?? "?"} dias úteis, ${roadmap.period?.start ?? "?"} a ${roadmap.period?.end ?? "?"}.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
