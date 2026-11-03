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

function slug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

function legacyDuration(seconds: number | null) {
  if (!seconds) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${hours ? `${hours}h` : ""}${minutes}min${String(remainder).padStart(2, "0")}s`;
}

type Curriculum = {
  courses: Array<{
    id: number;
    slug: string;
    sections: Array<{ items: Array<{ id: number; type: string; number: number | null; title: string; durationSeconds: number | null }> }>;
  }>;
};

async function main() {
  const apply = process.argv.includes("--apply");
  const envFileIndex = process.argv.indexOf("--env-file");
  const envFile = envFileIndex >= 0 ? path.resolve(process.argv[envFileIndex + 1]) : path.resolve(".env.local");
  const [rawEnv, curriculumRaw] = await Promise.all([
    readFile(envFile, "utf8"),
    readFile(path.resolve("data/evolution/udemy-curricula.json"), "utf8"),
  ]);
  const environment = { ...parseEnv(rawEnv), ...process.env };
  const url = environment.NEXT_PUBLIC_SUPABASE_URL;
  const key = environment.SUPABASE_SECRET_KEY ?? environment.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmail = environment.ADMIN_EMAIL?.trim().toLowerCase();
  if (!url || !key || !adminEmail) throw new Error("Configuração de Production incompleta.");

  const curriculum = JSON.parse(curriculumRaw) as Curriculum;
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;
  const owners = usersData.users.filter((user) => user.email?.toLowerCase() === adminEmail);
  if (owners.length !== 1) throw new Error(`Migração abortada: ADMIN_EMAIL corresponde a ${owners.length} contas; esperado: 1.`);
  const userId = owners[0].id;
  const { data: progress, error: progressError } = await supabase.from("evo_roadmap_progress").select("task_id,completed_at").eq("user_id", userId);
  if (progressError) throw progressError;

  const items = curriculum.courses.flatMap((course) => course.sections.flatMap((section) => section.items.map((item) => ({ course, item }))));
  const migrations = new Map<string, Set<string>>();
  for (const row of progress ?? []) {
    const dayMatch = String(row.task_id).match(/^dia-(\d+)-/);
    if (!dayMatch) continue;
    const day = dayMatch[1];
    const matches = items.filter(({ item }) => {
      const type = item.type === "lecture" ? "Aula" : item.type === "quiz" ? "Quiz" : item.type === "role-play" ? "Simulação" : "Atividade";
      const duration = legacyDuration(item.durationSeconds);
      const label = `${type}: ${item.title}${duration ? ` — ${duration}` : ""}`;
      return `dia-${day}-${slug(label)}` === row.task_id;
    });
    if (matches.length === 1) {
      const [{ course, item }] = matches;
      migrations.set(row.task_id, new Set([`udemy-${course.id}-${item.type}-${item.id}`]));
    }
  }

  const powerBiLegacyId = "dia-01-aula-aulas-10-a-15-o-que-e-bi-etl-dw-e-dm-tabelas-fato-e-dimensao-star-schema-e-";
  if ((progress ?? []).some((row) => row.task_id === powerBiLegacyId)) {
    const powerBi = curriculum.courses.find((course) => course.slug === "formacao-power-bi-pro");
    if (!powerBi) throw new Error("Grade do Power BI não encontrada.");
    const completedLectures = powerBi.sections.flatMap((section) => section.items).filter((item) => item.type === "lecture" && item.number !== null && item.number >= 10 && item.number <= 15);
    if (completedLectures.length !== 6) throw new Error(`Esperadas 6 aulas de Power BI; encontradas ${completedLectures.length}.`);
    migrations.set(powerBiLegacyId, new Set(completedLectures.map((item) => `udemy-${powerBi.id}-${item.type}-${item.id}`)));
  }

  const rowsById = new Map((progress ?? []).map((row) => [String(row.task_id), row]));
  const inserts = [...migrations].flatMap(([legacyId, canonicalIds]) => [...canonicalIds].map((taskId) => ({
    user_id: userId,
    task_id: taskId,
    completed_at: rowsById.get(legacyId)?.completed_at,
  })));
  const legacyIds = [...migrations.keys()];
  if (!apply) {
    process.stdout.write(`${JSON.stringify({ mode: "dry-run", legacyRows: legacyIds.length, canonicalRows: inserts.length, preservedUnmappedRows: (progress?.length ?? 0) - legacyIds.length }, null, 2)}\n`);
    return;
  }

  if (inserts.length) {
    const { error: insertError } = await supabase.from("evo_roadmap_progress").upsert(inserts, { onConflict: "user_id,task_id", ignoreDuplicates: true });
    if (insertError) throw insertError;
    const { count, error: verifyError } = await supabase.from("evo_roadmap_progress").select("task_id", { count: "exact", head: true }).eq("user_id", userId).in("task_id", inserts.map((row) => row.task_id));
    if (verifyError) throw verifyError;
    if (count !== new Set(inserts.map((row) => row.task_id)).size) throw new Error("Verificação dos novos IDs de progresso falhou; os IDs antigos foram preservados.");
  }
  if (legacyIds.length) {
    const { error: deleteError } = await supabase.from("evo_roadmap_progress").delete().eq("user_id", userId).in("task_id", legacyIds);
    if (deleteError) throw deleteError;
  }
  process.stdout.write(`${JSON.stringify({ mode: "applied", migratedLegacyRows: legacyIds.length, canonicalRows: inserts.length, preservedUnmappedRows: (progress?.length ?? 0) - legacyIds.length }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
