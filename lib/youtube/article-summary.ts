import "server-only";

import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOpenAIClient } from "@/lib/openai";
import type { YoutubeNewsItem } from "@/lib/youtube/queries";
import { extractArticleText, isSafeArticleUrl } from "@/lib/youtube/article-summary-utils";

const SUMMARY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const articleSummarySchema = z.object({
  summaryPtBr: z.string().min(80).max(8_000),
  keyFacts: z.array(z.string().min(8).max(500)).min(3).max(12),
  importantDetails: z.array(z.string().min(8).max(500)).min(1).max(10),
});

export type YoutubeArticleSummary = {
  id?: string;
  itemId: string;
  sourceUrl: string;
  summaryPtBr: string;
  keyFacts: string[];
  importantDetails: string[];
  fetchedAt: string | null;
  status: "completed" | "unavailable" | "not_configured" | "failed";
  message?: string;
};

type ArticleSummaryRow = {
  id: string;
  item_id: string;
  source_url: string;
  summary_pt_br: string;
  key_facts: unknown;
  important_details: unknown;
  fetched_at: string;
  status: YoutubeArticleSummary["status"];
};

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function mapRow(row: ArticleSummaryRow): YoutubeArticleSummary {
  return {
    id: row.id,
    itemId: row.item_id,
    sourceUrl: row.source_url,
    summaryPtBr: row.summary_pt_br,
    keyFacts: stringArray(row.key_facts),
    importantDetails: stringArray(row.important_details),
    fetchedAt: row.fetched_at,
    status: row.status,
  };
}

async function fetchArticle(url: string) {
  if (!isSafeArticleUrl(url)) throw new Error("SOURCE_URL_NOT_ALLOWED");
  const response = await fetch(url, {
    headers: { accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1", "user-agent": "RankFTV-PulsoAI/1.0 (+https://www.rankftv.com)" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`SOURCE_FETCH_FAILED_${response.status}`);
  if (Number(response.headers.get("content-length") ?? 0) > 2_000_000) throw new Error("SOURCE_TOO_LARGE");
  const text = extractArticleText(await response.text(), response.headers.get("content-type") ?? "");
  if (text.length < 200) throw new Error("SOURCE_TEXT_INSUFFICIENT");
  return text;
}

async function getSettings() {
  const { data, error } = await createAdminClient().from("yt_app_settings").select("ai_provider, ai_model").eq("id", 1).maybeSingle();
  if (error) throw new Error(`YOUTUBE_SETTINGS_READ_FAILED: ${error.message}`);
  return data as { ai_provider?: string | null; ai_model?: string | null } | null;
}

async function getCachedSummary(itemId: string) {
  const { data, error } = await createAdminClient().from("yt_article_summaries")
    .select("id, item_id, source_url, summary_pt_br, key_facts, important_details, fetched_at, status")
    .eq("item_id", itemId).maybeSingle();
  if (error) {
    if (error.code === "42P01" || error.message.toLowerCase().includes("does not exist")) return null;
    throw new Error(`YOUTUBE_ARTICLE_SUMMARY_READ_FAILED: ${error.message}`);
  }
  return data ? mapRow(data as ArticleSummaryRow) : null;
}

export async function getYoutubeArticleSummary(itemId: string) {
  return getCachedSummary(itemId);
}

export async function generateYoutubeArticleSummary(item: YoutubeNewsItem): Promise<YoutubeArticleSummary> {
  const cached = await getCachedSummary(item.id);
  if (cached?.status === "completed" && cached.fetchedAt && Date.now() - Date.parse(cached.fetchedAt) < SUMMARY_TTL_MS) return cached;

  let articleText: string;
  try {
    articleText = await fetchArticle(item.url);
  } catch (error) {
    return { itemId: item.id, sourceUrl: item.url, summaryPtBr: item.summary_pt_br ?? item.summary ?? "A fonte não pôde ser lida neste momento.", keyFacts: [], importantDetails: [], fetchedAt: null, status: "unavailable", message: error instanceof Error ? error.message : "SOURCE_FETCH_FAILED" };
  }

  const settings = await getSettings();
  if (settings?.ai_provider !== "openai" || !settings.ai_model || !process.env.OPENAI_API_KEY?.trim()) {
    return { itemId: item.id, sourceUrl: item.url, summaryPtBr: item.summary_pt_br ?? item.summary ?? "A fonte foi lida, mas o resumo completo ainda não está configurado.", keyFacts: [], importantDetails: [], fetchedAt: null, status: "not_configured", message: "Configure o provedor OpenAI e o modelo no radar para gerar o resumo completo." };
  }

  const response = await getOpenAIClient().responses.create({
    model: settings.ai_model,
    instructions: "Você resume notícias para o radar editorial de um canal brasileiro. Use somente o conteúdo fornecido. Preserve nomes, números, datas, preços, condições, limitações, riscos e disponibilidade. Remova repetições, mas não elimine fatos necessários. Escreva em português brasileiro claro e não invente informações.",
    input: JSON.stringify({ titulo: item.title, fonte: item.source_name, url: item.url, resumoAnterior: item.summary, conteudoDaPagina: articleText }),
    text: { format: zodTextFormat(articleSummarySchema, "youtube_article_summary") },
    max_output_tokens: 4_000,
    store: false,
  }, { timeout: 90_000, maxRetries: 1 });

  const parsed = articleSummarySchema.parse(JSON.parse(response.output_text));
  const now = new Date().toISOString();
  const { data, error } = await createAdminClient().from("yt_article_summaries").upsert({
    item_id: item.id, source_url: item.url, summary_pt_br: parsed.summaryPtBr, key_facts: parsed.keyFacts,
    important_details: parsed.importantDetails, fetched_at: now, status: "completed", model: settings.ai_model, updated_at: now,
  }, { onConflict: "item_id" }).select("id, item_id, source_url, summary_pt_br, key_facts, important_details, fetched_at, status").single();
  if (error) throw new Error(`YOUTUBE_ARTICLE_SUMMARY_WRITE_FAILED: ${error.message}`);
  return mapRow(data as ArticleSummaryRow);
}
