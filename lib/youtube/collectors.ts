import "server-only";

import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";

export type YoutubeSource = {
  id: string;
  name: string;
  kind: "site" | "blog" | "youtube" | "x" | "newsletter" | "reddit" | "rss" | "atom" | "api" | "other";
  url: string;
  category: string;
  language: string;
};

export type YoutubeCollectedItem = {
  sourceId: string;
  sourceName: string;
  title: string;
  summary: string | null;
  url: string;
  canonicalUrl: string;
  contentHash: string;
  author: string | null;
  language: string;
  category: string;
  publishedAt: string | null;
  raw: Record<string, unknown>;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

const trackingParams = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid",
]);

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanText(value: unknown): string {
  if (typeof value === "object" && value && "#text" in value) {
    return cleanText((value as { "#text": unknown })["#text"]);
  }
  if (typeof value !== "string") return "";
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (trackingParams.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase();
    return url.toString().replace(/\/$/, "");
  } catch {
    return rawUrl.trim();
  }
}

function atomLink(value: unknown): string {
  for (const link of asArray(value as Record<string, unknown> | Record<string, unknown>[])) {
    if (typeof link === "string") return link;
    if (
      link && typeof link === "object" && typeof link["@_href"] === "string"
      && (!link["@_rel"] || link["@_rel"] === "alternate")
    ) return link["@_href"];
  }
  return "";
}

function makeItem(
  source: YoutubeSource,
  input: {
    title: unknown;
    summary?: unknown;
    url: string;
    author?: unknown;
    publishedAt?: unknown;
    raw?: Record<string, unknown>;
  },
): YoutubeCollectedItem | null {
  const title = cleanText(input.title);
  const canonicalUrl = canonicalizeUrl(input.url);
  if (!title || !canonicalUrl.startsWith("http")) return null;
  const date = typeof input.publishedAt === "string" || typeof input.publishedAt === "number"
    ? new Date(input.publishedAt)
    : null;
  return {
    sourceId: source.id,
    sourceName: source.name,
    title,
    summary: cleanText(input.summary).slice(0, 4000) || null,
    url: input.url,
    canonicalUrl,
    contentHash: createHash("sha256").update(canonicalUrl).digest("hex"),
    author: cleanText(input.author) || null,
    language: source.language,
    category: source.category,
    publishedAt: date && !Number.isNaN(date.valueOf()) ? date.toISOString() : null,
    raw: input.raw ?? {},
  };
}

async function fetchWithTimeout(url: string, attempts = 2) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "PulsoAI/1.0 (+https://www.rankftv.com/admin/youtube)",
          accept: "application/rss+xml, application/atom+xml, application/json, text/xml;q=0.9",
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Falha desconhecida na fonte");
}

async function collectFeed(source: YoutubeSource, limit: number) {
  const response = await fetchWithTimeout(source.url);
  const document = parser.parse(await response.text()) as Record<string, unknown>;
  const rssChannel = (document.rss as { channel?: { item?: unknown } } | undefined)?.channel;
  const atomFeed = document.feed as { entry?: unknown } | undefined;
  const entries = rssChannel
    ? asArray(rssChannel.item as Record<string, unknown> | Record<string, unknown>[])
    : asArray(atomFeed?.entry as Record<string, unknown> | Record<string, unknown>[]);

  return entries.slice(0, limit).flatMap((entry) => {
    const link = rssChannel
      ? (typeof entry.link === "string" ? entry.link : atomLink(entry.link))
      : atomLink(entry.link);
    const item = makeItem(source, {
      title: entry.title,
      summary: entry.description ?? entry.summary ?? entry.content,
      url: link,
      author: entry.author ?? entry["dc:creator"],
      publishedAt: entry.pubDate ?? entry.published ?? entry.updated,
      raw: { externalId: entry.guid ?? entry.id ?? null },
    });
    return item ? [item] : [];
  });
}

async function collectHackerNews(source: YoutubeSource, limit: number) {
  const ids = (await (await fetchWithTimeout(source.url)).json()) as number[];
  const selected = ids.slice(0, Math.min(limit * 2, 40));
  const records = await Promise.all(selected.map(async (id) => {
    const response = await fetchWithTimeout(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
    return response.json() as Promise<{
      id: number;
      title?: string;
      url?: string;
      by?: string;
      time?: number;
      type?: string;
      dead?: boolean;
      deleted?: boolean;
    }>;
  }));
  return records.flatMap((record) => {
    if (!record.title || record.dead || record.deleted || record.type !== "story") return [];
    const item = makeItem(source, {
      title: record.title,
      url: record.url ?? `https://news.ycombinator.com/item?id=${record.id}`,
      author: record.by,
      publishedAt: record.time ? record.time * 1000 : undefined,
      raw: {
        externalId: record.id,
        discussionUrl: `https://news.ycombinator.com/item?id=${record.id}`,
      },
    });
    return item ? [item] : [];
  }).slice(0, limit);
}

export async function collectYoutubeSource(source: YoutubeSource, limit: number) {
  if (source.kind === "api" && source.url.includes("hacker-news.firebaseio.com")) {
    return collectHackerNews(source, limit);
  }
  if (source.kind === "rss" || source.kind === "atom") return collectFeed(source, limit);
  throw new Error(`Coletor ainda não implementado para ${source.name}`);
}
