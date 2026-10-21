import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const VERSION = "1.0.0";
const PRODUCTION_SUPABASE_URL = "https://tkyopolcxfsdbhvrgadj.supabase.co";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const artifactDir = path.join(repoRoot, ".codex-artifacts", "evolution-agent");
const outputSchemaPath = path.join(scriptDir, "evolution-agent-output.schema.json");
const tsxEntrypoint = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
const vaultPath = process.env.EVOLUTION_VAULT_PATH?.trim()
  || "C:\\Users\\SnyX\\Desktop\\Carlos Rocha";
const workerId = `${os.hostname()}-${createHash("sha256").update(repoRoot).digest("hex").slice(0, 10)}`;
const once = process.argv.includes("--once");
const pollIntervalMs = 15_000;

function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

function sanitizedMessage(error) {
  const record = error && typeof error === "object" ? error : null;
  const message = record && "message" in record && typeof record.message === "string"
    ? record.message
    : null;
  const code = record && "code" in record && typeof record.code === "string"
    ? record.code
    : null;
  const raw = error instanceof Error ? error.message : message ? `${code ? `${code}: ` : ""}${message}` : String(error);
  return raw
    .replace(/https?:\/\/[^\s]+/g, "[url removida]")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[valor removido]")
    .slice(0, 900);
}

function log(message) {
  process.stdout.write(`[${new Date().toISOString()}] ${message}\n`);
}

function run(command, args, { input, timeoutMs = 45 * 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const keepTail = (current, chunk) => `${current}${chunk}`.slice(-32_000);
    child.stdout.on("data", (chunk) => { stdout = keepTail(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = keepTail(stderr, chunk); });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${command} excedeu o limite de execução.`));
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} terminou com código ${code}: ${stderr || stdout}`));
    });
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

function runTsx(script, args = [], options) {
  return run(process.execPath, [tsxEntrypoint, path.join(repoRoot, script), ...args], options);
}

function currentWeekStartInSaoPaulo() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date()).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const date = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

function codexCommand() {
  if (process.platform !== "win32") return { command: "codex", prefix: [] };
  const appData = process.env.APPDATA;
  if (!appData) throw new Error("CODEX_APPDATA_UNAVAILABLE");
  return {
    // O wrapper do PowerShell interpreta algumas opções como parâmetros dele
    // quando é iniciado por spawn. Invocar o entrypoint JS diretamente
    // preserva todos os argumentos do Codex e o stdin do agente.
    command: process.execPath,
    prefix: [path.join(appData, "npm", "node_modules", "@openai", "codex", "bin", "codex.js")],
  };
}

async function loadConfiguration() {
  const local = parseEnv(await readFile(path.join(repoRoot, ".env.local"), "utf8"));
  const environment = { ...local, ...process.env };
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (environment.SUPABASE_SECRET_KEY || environment.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  const adminEmail = environment.ADMIN_EMAIL?.trim().toLowerCase();
  if (url !== PRODUCTION_SUPABASE_URL) throw new Error("EVO_AGENT_REFUSED_NON_PRODUCTION_TARGET");
  if (!key || !adminEmail) throw new Error("EVO_AGENT_CONFIGURATION_MISSING");
  Object.assign(process.env, environment);
  return { url, key, adminEmail };
}

async function resolveOwner(admin, adminEmail) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const owners = data.users.filter((user) => user.email?.toLowerCase() === adminEmail);
  if (owners.length !== 1) throw new Error("EVO_AGENT_OWNER_NOT_UNIQUE");
  return owners[0];
}

async function heartbeat(admin, userId, status = "online", lastErrorCode = null) {
  const { error } = await admin.from("evo_ai_workers").upsert({
    user_id: userId,
    worker_id: workerId,
    status,
    version: VERSION,
    last_error_code: lastErrorCode,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}

async function updateJob(admin, jobId, values) {
  const { error } = await admin.from("evo_ai_jobs").update({
    ...values,
    heartbeat_at: new Date().toISOString(),
  }).eq("id", jobId);
  if (error) throw error;
}

async function claimJob(admin, userId, requestedStatus) {
  const { data, error } = await admin.rpc("evo_claim_ai_job", {
    p_user_id: userId,
    p_worker_id: workerId,
    p_requested_status: requestedStatus,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

async function collectMetrics(admin, userId) {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 14);
  const since = start.toISOString().slice(0, 10);
  const [settings, study, training, weights, followers, video, projects, ideas, activeSources] = await Promise.all([
    admin.from("evo_settings").select("daily_study_target_minutes,weekly_study_target_minutes,follower_target,current_weight_kg,goal_weight_kg").eq("user_id", userId).maybeSingle(),
    admin.from("evo_study_sessions").select("study_date,minutes,source").eq("user_id", userId).gte("study_date", since).order("study_date"),
    admin.from("evo_training_logs").select("training_date,body_parts").eq("user_id", userId).gte("training_date", since).order("training_date"),
    admin.from("evo_weight_logs").select("measured_on,weight_kg").eq("user_id", userId).order("measured_on", { ascending: false }).limit(12),
    admin.from("evo_follower_snapshots").select("measured_on,followers,source").eq("user_id", userId).order("measured_on", { ascending: false }).limit(12),
    admin.from("evo_weekly_videos").select("week_start,title_snapshot,published_at").eq("user_id", userId).order("week_start", { ascending: false }).limit(4),
    admin.from("evo_project_progress").select("project_id,progress,status,note,updated_at").eq("user_id", userId),
    admin.from("yt_ideas").select("source_fingerprint,title,status,current_rank,score,rationale,editorial_state,priority,title_locked_by_user,notes").not("status", "eq", "discarded").order("current_rank"),
    admin.from("yt_sources").select("id,name,kind,url").eq("enabled", true).is("archived_at", null).order("name"),
  ]);
  const failed = [settings, study, training, weights, followers, video, projects, ideas, activeSources].find((result) => result.error);
  if (failed?.error) throw failed.error;
  return {
    capturedAt: now.toISOString(),
    settings: settings.data,
    study: study.data ?? [],
    training: training.data ?? [],
    weights: weights.data ?? [],
    followers: followers.data ?? [],
    weeklyVideos: video.data ?? [],
    projects: projects.data ?? [],
    activeIdeas: ideas.data ?? [],
    activeSources: activeSources.data ?? [],
  };
}

function buildPrompt(metrics) {
  return `Você está executando uma atualização privada da Central de Evolução do Carlos.

Regras obrigatórias:
1. Você está em sandbox somente leitura. Pode e deve usar comandos somente de leitura para abrir AGENTS.md, docs/IA/README.md, docs/YOUTUBE-RADAR-CODEX.md, docs/CENTRAL-DE-EVOLUCAO.md, o schema em scripts/youtube-import-research.ts e os arquivos necessários em ${vaultPath}. Não modifique arquivos, banco, Git, deploy ou serviços.
2. Não execute npm run youtube:sources: o agente local já consultou as fontes autorizadas. Use exclusivamente os IDs e URLs de activeSources nas métricas abaixo; não consulte fonte desativada ou ausente dessa lista.
3. Use pesquisa web verificável, abra páginas individuais e reavalie todas as ideias ativas. Não invente datas, alcance ou fatos.
4. A cobrança deve ser direta e baseada em evidências, sem humilhação e sem punições prejudiciais.
5. Retorne APENAS JSON válido, sem markdown, com esta forma exata:
{
  "version": 1,
  "generatedAt": "ISO-8601",
  "review": {
    "score": 0,
    "verdict": "diagnóstico direto",
    "summary": "síntese baseada nas métricas",
    "actions": ["de 1 a 6 próximas ações concretas"]
  },
  "youtube": { "payload completo aceito pelo schema de scripts/youtube-import-research.ts" }
}
O objeto youtube deve usar scope full, declarar todas as fontes ativas em researchSourceIds e incluir todas as ideias ativas, além das novas que forem justificadas. Para ideias novas, inclua de 3 a 5 referências verificadas do YouTube.
youtube nunca pode ser null: se uma fonte estiver inacessível, registre a limitação no payload seguindo o schema em vez de omitir o objeto.
Todo item.title exibido na interface precisa estar em português e conter uma construção portuguesa (por exemplo, “com”, “de”, “para” ou “como”); não reutilize um título em inglês como título exibido.

Métricas atuais sanitizadas:
${JSON.stringify(metrics)}`;
}

function parseAgentResult(raw) {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(trimmed);
  if (parsed?.version !== 1 || !parsed.review || !parsed.youtube) throw new Error("EVO_AGENT_RESULT_SHAPE_INVALID");
  if (!Number.isInteger(parsed.review.score) || parsed.review.score < 0 || parsed.review.score > 100) throw new Error("EVO_AGENT_REVIEW_SCORE_INVALID");
  if (typeof parsed.review.verdict !== "string" || parsed.review.verdict.length < 10) throw new Error("EVO_AGENT_REVIEW_VERDICT_INVALID");
  if (typeof parsed.review.summary !== "string" || parsed.review.summary.length < 10) throw new Error("EVO_AGENT_REVIEW_SUMMARY_INVALID");
  if (!Array.isArray(parsed.review.actions) || parsed.review.actions.length < 1 || parsed.review.actions.length > 6) throw new Error("EVO_AGENT_REVIEW_ACTIONS_INVALID");
  return parsed;
}

async function validateResearch(jobId, result) {
  const researchPath = path.join(artifactDir, `${jobId}-research.json`);
  await writeFile(researchPath, `${JSON.stringify(result.youtube, null, 2)}\n`, "utf8");
  await runTsx("scripts/youtube-import-research.ts", ["--preflight", researchPath], { timeoutMs: 5 * 60_000 });
  return researchPath;
}

async function analyzeJob(admin, userId, job) {
  await updateJob(admin, job.id, { stage: "metrics", progress_message: "Lendo métricas, metas e estado atual." });
  const metrics = await collectMetrics(admin, userId);
  await updateJob(admin, job.id, { stage: "research", progress_message: "Pesquisando notícias e reavaliando as ideias do Rocha Tech." });
  const outputPath = path.join(artifactDir, `${job.id}-preview.json`);
  const codex = codexCommand();
  const args = [
    ...codex.prefix,
    "exec", "--ephemeral", "--ignore-user-config",
    "--sandbox", "read-only",
    "--cd", repoRoot, "--add-dir", vaultPath,
    "--output-schema", outputSchemaPath,
    "--output-last-message", outputPath, "-",
  ];
  await run(codex.command, args, { input: buildPrompt(metrics) });
  const result = parseAgentResult(await readFile(outputPath, "utf8"));
  await updateJob(admin, job.id, { stage: "validating", progress_message: "Validando a pesquisa antes de mostrar a prévia." });
  await validateResearch(job.id, result);
  await updateJob(admin, job.id, {
    status: "awaiting_approval",
    stage: "preview_ready",
    progress_message: "Prévia pronta. Revise antes de aplicar em Production.",
    result,
    preview_ready_at: new Date().toISOString(),
  });
}

async function applyJob(admin, userId, job) {
  const result = parseAgentResult(JSON.stringify(job.result));
  const researchPath = await validateResearch(job.id, result);
  await updateJob(admin, job.id, { stage: "youtube", progress_message: "Atualizando notícias, tendências e ranking do Rocha Tech." });
  await runTsx("scripts/youtube-import-research.ts", [researchPath]);
  await updateJob(admin, job.id, { stage: "sources", progress_message: "Sincronizando roadmap e pendências do RankFTV." });
  await run(process.execPath, [path.join(repoRoot, "scripts", "evolution-sync-sources.mjs"), "--vault", vaultPath], { timeoutMs: 10 * 60_000 });
  await runTsx("scripts/evolution-import-sources.ts", [], { timeoutMs: 10 * 60_000 });
  const { error: reviewError } = await admin.from("evo_ai_reviews").insert({
    user_id: userId,
    week_start: currentWeekStartInSaoPaulo(),
    score: result.review.score,
    verdict: result.review.verdict,
    actions: result.review.actions,
  });
  if (reviewError) throw reviewError;
  await updateJob(admin, job.id, {
    status: "completed",
    stage: "completed",
    progress_message: "Métricas, fontes e recomendações atualizadas.",
    completed_at: new Date().toISOString(),
  });
}

async function failJob(admin, userId, job, error) {
  const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
    ? error.message
    : "EVO_AGENT_EXECUTION_FAILED";
  await updateJob(admin, job.id, {
    status: "failed",
    stage: "failed",
    progress_message: "A execução parou sem aplicar etapas futuras.",
    error_code: code,
    error_message: "A atualização falhou no agente local. Consulte o log sanitizado no computador e execute novamente.",
    completed_at: new Date().toISOString(),
  }).catch(() => undefined);
  await heartbeat(admin, userId, "error", code).catch(() => undefined);
  log(`Job ${job.id} falhou: ${sanitizedMessage(error)}`);
}

async function processNext(admin, userId) {
  const analysis = await claimJob(admin, userId, "queued_analysis");
  if (analysis) {
    await heartbeat(admin, userId, "busy");
    try { await analyzeJob(admin, userId, analysis); }
    catch (error) { await failJob(admin, userId, analysis, error); }
    return true;
  }
  const apply = await claimJob(admin, userId, "queued_apply");
  if (apply) {
    await heartbeat(admin, userId, "busy");
    try { await applyJob(admin, userId, apply); }
    catch (error) { await failJob(admin, userId, apply, error); }
    return true;
  }
  await heartbeat(admin, userId, "online");
  return false;
}

async function main() {
  process.chdir(repoRoot);
  await mkdir(artifactDir, { recursive: true });
  const configuration = await loadConfiguration();
  const admin = createClient(configuration.url, configuration.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const owner = await resolveOwner(admin, configuration.adminEmail);
  const codex = codexCommand();
  await run(codex.command, [...codex.prefix, "login", "status"], { timeoutMs: 30_000 });
  log(`Agente local ${VERSION} iniciado.`);
  do {
    try { await processNext(admin, owner.id); }
    catch (error) {
      await heartbeat(admin, owner.id, "error", "EVO_AGENT_POLL_FAILED").catch(() => undefined);
      log(`Falha de polling: ${sanitizedMessage(error)}`);
    }
    if (!once) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  } while (!once);
}

main().catch((error) => {
  log(`Agente encerrado: ${sanitizedMessage(error)}`);
  process.exitCode = 1;
});
