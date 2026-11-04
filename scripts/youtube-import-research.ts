import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ideaApproachesSchema } from "../lib/youtube/idea-approaches";

const score = z.number().int().min(0).max(100);
const sourceOrigin = z.enum(["primary", "market", "mixed"]);
const portugueseTitleWords = /\b(a|as|com|como|da|das|de|do|dos|e|em|entre|é|na|nas|no|nos|nova|novo|o|os|para|por|que|se|sem|uma|um)\b/i;
const aiRelevance = z.object({
  score: score,
  rationale: z.string().min(20),
}).refine((value) => value.score >= 70, "O assunto precisa ter IA como tema central (mínimo 70/100). ");
const evidence = z.array(z.object({
  label: z.string().min(3),
  url: z.url(),
  note: z.string().min(8),
}));

const youtubeReferenceSchema = z.object({
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  title: z.string().min(5),
  channel: z.string().min(2),
  url: z.url().refine((value) => {
    const host = new URL(value).hostname;
    return host === "www.youtube.com" || host === "youtube.com" || host === "youtu.be";
  }, "A referência precisa apontar para um vídeo do YouTube."),
  publishedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  viewCount: z.number().int().min(0).max(10_000_000_000),
  selectionReason: z.string().min(18).max(500),
});

const itemSchema = z.object({
  title: z.string().min(8).refine((value) => portugueseTitleWords.test(value), "O título exibido precisa estar em português."),
  url: z.url(),
  summary: z.string().min(20),
  summaryPtBr: z.string().min(20),
  whyItMatters: z.string().min(20),
  subject: z.string().min(3),
  entity: z.string().optional(),
  language: z.string().default("en"),
  category: z.string().default("geral"),
  publishedAt: z.string().datetime(),
  observation: z.string().min(8),
  sourceUrls: z.array(z.url()).min(1),
  reliability: z.enum(["confirmed", "rumor", "interpretation", "insufficient"]),
  evidenceType: z.enum(["quantitative", "qualitative", "mixed"]),
  relevanceScore: score,
  noveltyScore: score,
  urgencyScore: score,
  opportunityScore: score,
  confidenceScore: score,
  factors: z.array(z.object({ label: z.string(), score, reason: z.string() })).min(1),
  aiRelevance,
  sourceOrigin,
});

const trendSchema = z.object({
  topicKey: z.string().regex(/^[a-z0-9-]+$/),
  topic: z.string().min(3),
  state: z.enum(["em_alta", "emergente", "estavel", "perdendo_forca", "atemporal", "desatualizado", "arquivado"]),
  score,
  confidenceScore: score,
  rationale: z.string().min(20),
  evidence: evidence.min(1),
  sourceUrls: z.array(z.url()).min(1),
  aiRelevance,
  sourceOrigin,
});

const ideaSchema = z.object({
  sourceFingerprint: z.string().min(8),
  title: z.string().min(10),
  alternateTitles: z.array(z.string().min(10)).min(1).max(3),
  summary: z.string().min(20),
  rationale: z.string().min(20),
  angle: z.enum(["explicacao", "tutorial", "demonstracao", "analise", "comparacao", "opiniao", "teste", "noticia"]),
  format: z.enum(["longo", "shorts", "ambos"]),
  outline: z.array(z.string().min(4)).min(3).max(8),
  hook: z.string().min(10),
  priority: z.enum(["agora", "proximos_dias", "atemporal"]),
  state: z.enum(["em_alta", "emergente", "estavel", "perdendo_forca", "atemporal", "desatualizado", "arquivado"]),
  score,
  confidenceScore: score,
  evidence: evidence.min(1),
  sourceUrls: z.array(z.url()).min(1),
  aiRelevance,
  sourceOrigin,
  approaches: ideaApproachesSchema,
  youtubeReferences: z.array(youtubeReferenceSchema).min(3).max(5).optional(),
});

const importSchema = z.object({
  scope: z.enum(["full", "partial"]).default("full"),
  summary: z.string().min(20),
  editorialProfile: z.string().min(40).optional(),
  researchSourceIds: z.array(z.string().uuid()).min(1),
  items: z.array(itemSchema).min(1),
  trends: z.array(trendSchema),
  ideas: z.array(ideaSchema),
});

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
  const args = process.argv.slice(2);
  const validateOnly = args.includes("--validate-only");
  const preflight = args.includes("--preflight");
  const input = args.find((argument) => !argument.startsWith("--"));
  if (!input) throw new Error("Uso: npm run youtube:import -- caminho/para/pesquisa.json");
  const rawInput = await readFile(path.resolve(input), "utf8");
  const payload = importSchema.parse(JSON.parse(rawInput));
  if (validateOnly && !preflight) {
    process.stdout.write(`${JSON.stringify({ valid: true, items: payload.items.length, trends: payload.trends.length, ideas: payload.ideas.length })}\n`);
    return;
  }
  const rawEnv = await readFile(path.resolve(".env.local"), "utf8");
  const environment = parseEnv(rawEnv);
  const url = environment.NEXT_PUBLIC_SUPABASE_URL;
  const key = environment.SUPABASE_SECRET_KEY ?? environment.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuração Supabase de produção ausente.");

  const prepared = {
    ...payload,
    idempotencyKey: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
    items: payload.items.map((item) => ({
      ...item,
      contentHash: createHash("sha256").update(`${item.url}\n${item.title}`).digest("hex"),
      raw: { importedBy: "codex", researchMethod: "web-verified-manual", importedAt: new Date().toISOString() },
    })),
  };
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const fingerprints = payload.ideas.map((idea) => idea.sourceFingerprint);
  const [existingIdeasResult, activeSourcesResult] = await Promise.all([
    supabase.from("yt_ideas")
      .select("source_fingerprint")
      .not("status", "in", "(published,discarded)")
      .not("editorial_state", "in", "(arquivado,desatualizado)"),
    supabase.from("yt_sources")
      .select("id, name")
      .eq("enabled", true)
      .is("archived_at", null),
  ]);
  const { data: existingIdeas, error: existingIdeasError } = existingIdeasResult;
  if (existingIdeasError) throw new Error(`YOUTUBE_CODEX_IMPORT_LOOKUP_FAILED: ${existingIdeasError.message}`);
  if (activeSourcesResult.error) throw new Error(`YOUTUBE_CODEX_IMPORT_SOURCE_LOOKUP_FAILED: ${activeSourcesResult.error.message}`);
  const activeSources = activeSourcesResult.data ?? [];
  const activeSourceIds = new Set(activeSources.map((source) => source.id));
  const submittedSourceIds = new Set(payload.researchSourceIds);
  const inactiveSources = payload.researchSourceIds.filter((id) => !activeSourceIds.has(id));
  if (inactiveSources.length) {
    throw new Error(`YOUTUBE_CODEX_IMPORT_INACTIVE_RESEARCH_SOURCE: ${inactiveSources.join(", ")}`);
  }
  if (payload.scope === "full") {
    const omittedSources = activeSources.filter((source) => !submittedSourceIds.has(source.id));
    if (omittedSources.length) {
      throw new Error(`YOUTUBE_CODEX_IMPORT_INCOMPLETE_SOURCE_SET: ${omittedSources.map((source) => source.name).join(", ")}`);
    }
  }
  const knownFingerprints = new Set((existingIdeas ?? []).map((idea) => idea.source_fingerprint));
  if (payload.scope === "full") {
    const submittedFingerprints = new Set(fingerprints);
    const missingReevaluations = [...knownFingerprints].filter((fingerprint) => !submittedFingerprints.has(fingerprint));
    if (missingReevaluations.length) {
      throw new Error(`YOUTUBE_CODEX_IMPORT_INCOMPLETE_FULL_REEVALUATION: ${missingReevaluations.join(", ")}`);
    }
  }
  const missingYoutubeResearch = payload.ideas.filter((idea) => !knownFingerprints.has(idea.sourceFingerprint) && !idea.youtubeReferences);
  if (missingYoutubeResearch.length) {
    throw new Error(`YOUTUBE_CODEX_IMPORT_MISSING_YOUTUBE_REFERENCES: ${missingYoutubeResearch.map((idea) => idea.sourceFingerprint).join(", ")}`);
  }
  if (preflight) {
    process.stdout.write(`${JSON.stringify({ valid: true, environment: "production", items: payload.items.length, trends: payload.trends.length, ideas: payload.ideas.length, activeSources: activeSources.length })}\n`);
    return;
  }
  const { data, error } = await supabase.rpc("yt_apply_codex_research", { payload: prepared });
  if (error) throw new Error(`YOUTUBE_CODEX_IMPORT_FAILED: ${error.message}`);
  const imported = z.object({ runId: z.string().uuid() }).passthrough().parse(data);
  const { data: rankingData, error: rankingError } = await supabase.rpc("yt_recalculate_codex_idea_ranks", { p_run_id: imported.runId });
  if (rankingError) throw new Error(`YOUTUBE_CODEX_IMPORT_RANKING_FAILED: ${rankingError.message}`);
  const approaches = payload.ideas.flatMap((idea) => idea.approaches.map((approach) => ({
    sourceFingerprint: idea.sourceFingerprint,
    ...approach,
  })));
  let approachData: unknown = { upserted: 0 };
  if (approaches.length) {
    const { data: appliedApproaches, error: approachError } = await supabase.rpc("yt_apply_codex_idea_approaches", {
      p_approaches: approaches,
      p_run_id: imported.runId,
    });
    if (approachError) throw new Error(`YOUTUBE_CODEX_IMPORT_APPROACHES_FAILED: ${approachError.message}`);
    approachData = appliedApproaches;
  }
  const youtubeReferences = payload.ideas.flatMap((idea) => (idea.youtubeReferences ?? []).map((reference) => ({
    sourceFingerprint: idea.sourceFingerprint,
    ...reference,
  })));
  let referenceData: unknown = { upserted: 0 };
  if (youtubeReferences.length) {
    const { data: appliedReferences, error: referenceError } = await supabase.rpc("yt_apply_codex_youtube_references", {
      p_references: youtubeReferences,
      p_run_id: imported.runId,
    });
    if (referenceError) throw new Error(`YOUTUBE_CODEX_IMPORT_YOUTUBE_REFERENCES_FAILED: ${referenceError.message}`);
    referenceData = appliedReferences;
  }
  if (payload.editorialProfile) {
    const { error: settingsError } = await supabase.from("yt_app_settings").update({ editorial_profile: payload.editorialProfile }).eq("id", 1);
    if (settingsError) throw new Error(`YOUTUBE_CODEX_IMPORT_EDITORIAL_PROFILE_FAILED: ${settingsError.message}`);
  }
  process.stdout.write(`${JSON.stringify({ environment: "production", imported: data, ranking: rankingData, approaches: approachData, youtubeReferences: referenceData, editorialProfileUpdated: Boolean(payload.editorialProfile) })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Falha desconhecida"}\n`);
  process.exitCode = 1;
});
