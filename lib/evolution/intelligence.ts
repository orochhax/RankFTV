import fs from "node:fs/promises";
import path from "node:path";

export type CompetitorVideo = { id: string | null; channel: string; title: string; originalTitle: string; url: string | null; thumbnail: string | null; thumbnailUrl: string | null; views: number | null; durationSeconds: number | null; publishedText: string | null; observedAt: string | null };
type Channel = { name: string; id: string | null; url: string | null; folder: string };
type Snapshot = { observedAt: string | null; channels: Channel[]; videos: CompetitorVideo[] };
const empty: Snapshot = { observedAt: null, channels: [], videos: [] };
const decimalFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const integerFormat = new Intl.NumberFormat("pt-BR");

const ptBrTitlesByVideoId: Record<string, string> = {
  "6KB9h-FcD8Q": "A maneira mais fácil de ganhar dinheiro online em 2026 (US$ 100 por dia ou mais)",
  bcQY9UvfMF4: "Desapareça e volte irreconhecível: 7 regras para mudar sua vida",
  "8Rf0xna31xg": "Como um canal sem rosto faturou US$ 39 mil usando Claude e ChatGPT",
  "-pp851qDmOY": "A maneira mais simples de ganhar dinheiro online com o Claude em 2027",
  Fys4oHlXQmQ: "Curso completo de Claude para iniciantes em 2026: torne-se profissional",
  zWEV2aE4RMg: "30 truques do ChatGPT que você precisa conhecer em 2026",
  bcM9dP_uXJU: "Como criar um agente de IA com Claude Code: tutorial completo",
  "0jk1zGhHb-g": "Copie e aplique esta estratégia para ganhar seus primeiros US$ 1.000 online",
  "AWMd-Z_1KMI": "GPT-5: a nova era da IA chegou — recursos explicados",
  "j4FzO2fF1kg": "Esqueça o After Effects: Claude e CapCut são tudo o que você precisa para editar",
};

const editorialTitle = (id: string | null, title: string) =>
  (id ? ptBrTitlesByVideoId[id] : undefined) ?? title;

const relativeTimeUnits: Record<string, [string, string]> = {
  minute: ["minuto", "minutos"],
  hour: ["hora", "horas"],
  day: ["dia", "dias"],
  week: ["semana", "semanas"],
  month: ["mês", "meses"],
  year: ["ano", "anos"],
};

const localizePublishedText = (value: string | null) => {
  if (!value) return null;
  const normalized = value.trim().toLocaleLowerCase("en-US");
  if (normalized === "today") return "hoje";
  if (normalized === "yesterday") return "ontem";
  const match = normalized.match(/^(?:(?:streamed|premiered)\s+)?(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago$/);
  if (!match) return value;
  const amount = Number(match[1]);
  const unit = relativeTimeUnits[match[2]];
  return `há ${integerFormat.format(amount)} ${amount === 1 ? unit[0] : unit[1]}`;
};

const packagedObservedAt = "2026-10-22T15:40:08.726Z";
const packagedRows: Array<[string, string, string, number, number, string]> = [
  ["6KB9h-FcD8Q", "Iman Gadzhi", "Laziest Way to Make Money Online In 2026 ($100/day+)", 2_600_000, 1670, "1 year ago"],
  ["bcQY9UvfMF4", "Iman Gadzhi", "Disappear And Come Back Unrecognizable (7 Rules To Change Your Life)", 2_200_000, 1039, "1 year ago"],
  ["wtDDjBOfTZo", "Iman Gadzhi", "Me dê 26 minutos e eu te darei 10.000 horas de conhecimento sobre o Claude", 1_700_000, 1587, "há 2 meses"],
  ["_67MWD7XW9Q", "Iman Gadzhi", "A maneira mais preguiçosa de ganhar dinheiro com IA (US$ 373/dia+)", 1_600_000, 1566, "há 1 ano"],
  ["DZoeGR_tatA", "Iman Gadzhi", "5 Maneiras Comprovadas de Ganhar Dinheiro com IA (Sem Experiência)", 1_500_000, 2191, "há 3 meses"],
  ["8Rf0xna31xg", "Sanji Nai-Chien", "How a Faceless Channel Made $39K With Claude + ChatGPT", 1_500_000, 1430, "há 1 mês"],
  ["-pp851qDmOY", "Money Talk With Leon", "A Maneira MAIS SIMPLES de Ganhar Dinheiro Online com Claude AI em 2027", 918_000, 894, "há 1 mês"],
  ["H895ZcG13Hg", "Iman Gadzhi", "Desapareça e volte irreconhecível em 3 meses", 887_000, 1229, "há 9 meses"],
  ["Fys4oHlXQmQ", "AI Master", "FULL Claude Course for Beginners in 2026! (Become a PRO!)", 832_000, 6293, "3 months ago"],
  ["zWEV2aE4RMg", "AI Master", "30 ChatGPT Hacks You Need to Know in 2026 (Become a PRO!)", 778_000, 1384, "1 year ago"],
  ["bcM9dP_uXJU", "AI Master", "How to Build an AI Agent with Claude Code (Claude AI Agent Tutorial)", 774_000, 1328, "3 months ago"],
  ["0jk1zGhHb-g", "Iman Gadzhi", "Copy & Paste THIS Strategy To Make Your First $1,000 Online", 761_000, 1041, "1 year ago"],
  ["w-lkP9XcZfg", "Iman Gadzhi", "Me dê 28 minutos, e eu te darei 10.000 horas de conhecimento sobre o ChatGPT", 715_000, 1662, "há 2 meses"],
  ["AWMd-Z_1KMI", "AI Master", "GPT 5 — The New AI Era is Here! Features EXPLAINED", 707_000, 1189, "1 year ago"],
  ["j4FzO2fF1kg", "Sanji Nai-Chien", "Forget After Effects: Claude + CapCut Is the Only Editing Stack You Need", 656_000, 1359, "há 2 meses"],
];
const packagedTopVideos: CompetitorVideo[] = packagedRows.map(([id, channel, originalTitle, views, durationSeconds, publishedText]) => ({
  id,
  channel,
  title: editorialTitle(id, originalTitle),
  originalTitle,
  url: `https://www.youtube.com/watch?v=${id}`,
  thumbnail: null,
  thumbnailUrl: `/api/admin/youtube/research?asset=thumbnail&channel=${encodeURIComponent(channel)}&video=${encodeURIComponent(id)}`,
  views,
  durationSeconds,
  publishedText: localizePublishedText(publishedText),
  observedAt: packagedObservedAt,
}));
const packagedTopics = [
  { label: "Negócios e dinheiro", count: 60, averageViews: 198_044.36666666667 },
  { label: "Modelos e lançamentos", count: 267, averageViews: 92_961.19101123596 },
  { label: "Ferramentas práticas", count: 149, averageViews: 70_690.3918918919 },
  { label: "Agentes e automação", count: 72, averageViews: 58_065.27777777778 },
  { label: "Notícias e opinião", count: 21, averageViews: 48_733.71428571428 },
];

export const formatEditorialViews = (value: number | null) => {
  if (value == null) return "—";
  if (value >= 1_000_000) return `${decimalFormat.format(value / 1_000_000)} milhões`;
  if (value >= 1_000) return `${decimalFormat.format(value / 1_000)} mil`;
  return integerFormat.format(value);
};
export const formatEditorialDuration = (seconds: number | null) => seconds == null ? "duração não informada" : `${Math.floor(seconds / 60)}min${seconds % 60 ? ` ${seconds % 60}s` : ""}`;

const topicRules = [
  { label: "Negócios e dinheiro", terms: ["money", "dinheiro", "business", "negócio", "vendas", "renda", "price", "preço"] },
  { label: "Ferramentas práticas", terms: ["como", "tutorial", "usei", "testei", "ferramenta", "tool", "app"] },
  { label: "Modelos e lançamentos", terms: ["openai", "claude", "gemini", "gpt", "modelo", "model", "lançamento", "release"] },
  { label: "Agentes e automação", terms: ["agent", "agente", "automação", "automation", "workflow"] },
  { label: "Notícias e opinião", terms: ["news", "notícia", "noticias", "why", "por que", "opinião", "mercado"] },
];

async function readCompetitorFiles(): Promise<Snapshot> {
  const vaultRoot = process.env.ROCHA_VAULT_ROOT ?? "C:\\Users\\SnyX\\Desktop\\Carlos Rocha";
  const root = path.join(vaultRoot, "Rocha Tech - YT", "Concorrentes");
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const channels: Channel[] = [];
    const videos: CompetitorVideo[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dataRoot = path.join(root, entry.name, "Dados");
      let files;
      try { files = await fs.readdir(dataRoot, { withFileTypes: true }); } catch { continue; }
      let channelName = entry.name;
      let channelId: string | null = null;
      let channelUrl: string | null = null;
      for (const file of files) {
        if (!file.name.endsWith(".json")) continue;
        const item = JSON.parse(await fs.readFile(path.join(dataRoot, file.name), "utf8"));
        channelName = item.channel?.name ?? channelName;
        channelId = item.channel?.id ?? channelId;
        channelUrl = item.channel?.url ?? channelUrl;
        const video = item.video ?? {};
        const observation = item.observations?.[0] ?? {};
        const publishedAt = video.publishedAt ?? video.published_at ?? video.publishDate ?? video.uploaded_at ?? video.uploadedAt ?? null;
        const publishedText = localizePublishedText(video.publishedText ?? (publishedAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(publishedAt)) : null));
        const id = video.id ?? null;
        const originalTitle = video.title ?? observation.title ?? "Sem título";
        videos.push({
          id,
          channel: channelName,
          title: editorialTitle(id, originalTitle),
          originalTitle,
          url: video.url ?? (video.id ? `https://www.youtube.com/watch?v=${video.id}` : null),
          thumbnail: item.thumbnail?.sourceUrl ?? item.thumbnail?.source_url ?? observation.thumbnail?.source_url ?? video.thumbnails?.at(-1)?.url ?? null,
          thumbnailUrl: video.id ? `/api/admin/youtube/research?asset=thumbnail&channel=${encodeURIComponent(entry.name)}&video=${encodeURIComponent(video.id)}` : null,
          views: typeof video.views === "number" ? video.views : typeof observation.views === "number" ? observation.views : null,
          durationSeconds: typeof video.durationSeconds === "number" ? video.durationSeconds : typeof video.duration_seconds === "number" ? video.duration_seconds : null,
          publishedText,
          observedAt: item.observedAt ?? observation.observed_at ?? null,
        });
      }
      channels.push({ name: channelName, id: channelId, url: channelUrl, folder: entry.name });
    }
    videos.sort((a, b) => (b.views ?? -1) - (a.views ?? -1));
    return { channels: channels.sort((a, b) => a.name.localeCompare(b.name)), videos, observedAt: videos.map((v) => v.observedAt).filter(Boolean).sort().at(-1) ?? null };
  } catch { return empty; }
}

export async function getEditorialIntelligence() {
  const data = await readCompetitorFiles();
  if (!data.videos.length) {
    return {
      ...empty,
      observedAt: packagedObservedAt,
      topVideos: packagedTopVideos,
      topics: packagedTopics,
      stats: { channels: 13, videos: 680, withViews: 677, averageViews: 90_388.15214180207 },
    };
  }
  const withViews = data.videos.filter((v) => v.views != null);
  const totalViews = withViews.reduce((sum, v) => sum + (v.views ?? 0), 0);
  const topics = topicRules.map((rule) => {
    const matches = data.videos.filter((v) => rule.terms.some((term) => v.title.toLocaleLowerCase("pt-BR").includes(term)));
    const scored = matches.filter((v) => v.views != null);
    return { label: rule.label, count: matches.length, averageViews: scored.length ? scored.reduce((sum, v) => sum + (v.views ?? 0), 0) / scored.length : 0 };
  }).filter((topic) => topic.count).sort((a, b) => b.averageViews - a.averageViews);
  return { ...data, topVideos: data.videos.slice(0, 15), topics, stats: { channels: data.channels.length, videos: data.videos.length, withViews: withViews.length, averageViews: withViews.length ? totalViews / withViews.length : 0 } };
}
