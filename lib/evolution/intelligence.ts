import fs from "node:fs/promises";
import path from "node:path";
import packagedSnapshot from "./intelligence-snapshot.json";
import {
  rankOpportunityVideos,
  type OpportunityVideoInput,
  type RankedOpportunityVideo,
} from "./opportunity-ranking";

export type CompetitorVideo = OpportunityVideoInput;
type Channel = { name: string; id: string | null; url: string | null; folder: string };
type Topic = { label: string; count: number; averageViews: number };
type Stats = { channels: number; videos: number; withViews: number; averageViews: number };
type Snapshot = { observedAt: string | null; channels: Channel[]; videos: CompetitorVideo[] };
type EditorialIntelligence = Snapshot & {
  topVideos: RankedOpportunityVideo[];
  topics: Topic[];
  stats: Stats;
};

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
  "Q-0OjiENI0E": "Como configurar o Claude para pequenos negócios (31 habilidades)",
  SjlKBdgWrZ4: "Como editar vídeos com Claude Code (cortes e motion)",
  iJiBJAJRRkk: "O método de Shorts sem rosto com IA de US$ 30 mil/mês que ninguém comenta (fluxo completo)",
  Y9sYXgGxohw: "Claude Cowork: tutorial completo para iniciantes (o fim do SaaS?)",
  f53vJbPomCs: "Como criar um agente de IA com RAG no N8N: tutorial passo a passo",
  SNo_recKZyY: "Como usar o Claude Cowork: guia completo de automação de fluxos em 2026",
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
  const normalizedValue = value.trim().toLocaleLowerCase("en-US");
  if (normalizedValue === "today") return "hoje";
  if (normalizedValue === "yesterday") return "ontem";
  const match = normalizedValue.match(/^(?:(?:streamed|premiered)\s+)?(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago$/);
  if (!match) return value;
  const amount = Number(match[1]);
  const unit = relativeTimeUnits[match[2]];
  return `há ${integerFormat.format(amount)} ${amount === 1 ? unit[0] : unit[1]}`;
};

export const formatEditorialViews = (value: number | null) => {
  if (value == null) return "—";
  if (value >= 1_000_000) return `${decimalFormat.format(value / 1_000_000)} milhões`;
  if (value >= 1_000) return `${decimalFormat.format(value / 1_000)} mil`;
  return integerFormat.format(value);
};

export const formatEditorialDuration = (seconds: number | null) =>
  seconds == null
    ? "duração não informada"
    : `${Math.floor(seconds / 60)}min${seconds % 60 ? ` ${seconds % 60}s` : ""}`;

export const formatEditorialMultiple = (value: number) =>
  `${decimalFormat.format(value)}×`;

const normalizeForMatch = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

const topicRules = [
  { label: "Negócios e dinheiro", terms: ["money", "dinheiro", "business", "negocio", "vendas", "renda", "price", "preco", "cliente"] },
  { label: "Ferramentas práticas", terms: ["como", "tutorial", "usei", "testei", "ferramenta", "tool", "app", "passo a passo"] },
  { label: "Modelos e lançamentos", terms: ["openai", "claude", "gemini", "gpt", "modelo", "model", "lancamento", "release"] },
  { label: "Agentes e automação", terms: ["agent", "agente", "automacao", "automation", "workflow", "mcp", "n8n"] },
  { label: "Notícias e opinião", terms: ["news", "noticia", "why", "por que", "opiniao", "mercado", "mudou", "acabou"] },
];

const normalizeCollectedViews = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

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
      try {
        files = await fs.readdir(dataRoot, { withFileTypes: true });
      } catch {
        continue;
      }
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
        const publishedAt = video.publishedAt
          ?? video.published_at
          ?? video.publishDate
          ?? video.uploaded_at
          ?? video.uploadedAt
          ?? null;
        const publishedText = localizePublishedText(
          video.publishedText
          ?? (publishedAt
            ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(publishedAt))
            : null),
        );
        const id = video.id ?? null;
        const originalTitle = video.title ?? observation.title ?? "Sem título";
        videos.push({
          id,
          channel: channelName,
          title: editorialTitle(id, originalTitle),
          originalTitle,
          url: video.url ?? (id ? `https://www.youtube.com/watch?v=${id}` : null),
          thumbnail: item.thumbnail?.sourceUrl
            ?? item.thumbnail?.source_url
            ?? observation.thumbnail?.source_url
            ?? video.thumbnails?.at(-1)?.url
            ?? null,
          thumbnailUrl: id
            ? `/api/admin/youtube/research?asset=thumbnail&channel=${encodeURIComponent(entry.name)}&video=${encodeURIComponent(id)}`
            : null,
          views: normalizeCollectedViews(typeof video.views === "number" ? video.views : observation.views),
          durationSeconds: typeof video.durationSeconds === "number"
            ? video.durationSeconds
            : typeof video.duration_seconds === "number"
              ? video.duration_seconds
              : null,
          publishedAt,
          publishedText,
          observedAt: item.observedAt ?? observation.observed_at ?? null,
        });
      }
      channels.push({ name: channelName, id: channelId, url: channelUrl, folder: entry.name });
    }
    videos.sort((a, b) => (b.views ?? -1) - (a.views ?? -1));
    return {
      channels: channels.sort((a, b) => a.name.localeCompare(b.name)),
      videos,
      observedAt: videos.map((video) => video.observedAt).filter(Boolean).sort().at(-1) ?? null,
    };
  } catch {
    return empty;
  }
}

const buildTopics = (videos: CompetitorVideo[]) =>
  topicRules
    .map((rule) => {
      const matches = videos.filter((video) => {
        const title = normalizeForMatch(video.originalTitle || video.title);
        return rule.terms.some((term) => title.includes(term));
      });
      const scored = matches.filter((video) => video.views != null);
      return {
        label: rule.label,
        count: matches.length,
        averageViews: scored.length
          ? scored.reduce((sum, video) => sum + (video.views ?? 0), 0) / scored.length
          : 0,
      };
    })
    .filter((topic) => topic.count)
    .sort((a, b) => b.averageViews - a.averageViews);

const packaged = packagedSnapshot as EditorialIntelligence;

export async function getEditorialIntelligence(): Promise<EditorialIntelligence> {
  const data = await readCompetitorFiles();
  if (!data.videos.length) return packaged;

  const withViews = data.videos.filter((video) => video.views != null);
  const totalViews = withViews.reduce((sum, video) => sum + (video.views ?? 0), 0);
  return {
    ...data,
    topVideos: rankOpportunityVideos(data.videos, { limit: 15, perChannel: 3 }),
    topics: buildTopics(data.videos),
    stats: {
      channels: data.channels.length,
      videos: data.videos.length,
      withViews: withViews.length,
      averageViews: withViews.length ? totalViews / withViews.length : 0,
    },
  };
}

export async function buildEditorialIntelligenceSnapshot(): Promise<EditorialIntelligence> {
  return getEditorialIntelligence();
}
