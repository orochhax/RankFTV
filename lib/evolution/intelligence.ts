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

const packagedObservedAt = "2026-10-23T00:48:33.029Z";
const packagedRows: Array<[string, string, string, number, number, string]> = [
  ["G4PUkK6u66k", "Joel Jota", "Por Que a SAÚDE MENTAL Vai Piorar nos Próximos Anos? (ANA BEATRIZ BARBOSA) | JOTA JOTA PODCAST #261", 4_499_908, 6697, "13 de jan. de 2026"],
  ["vbZquVH5bcs", "Joel Jota", "Como Controlar a Ansiedade e Parar de Se Autossabotar (AUGUSTO CURY) | JOTA JOTA PODCAST #256", 2_816_806, 7887, "9 de dez. de 2025"],
  ["6KB9h-FcD8Q", "Iman Gadzhi", "Laziest Way to Make Money Online In 2026 ($100/day+)", 2_600_000, 1670, "1 year ago"],
  ["CpthJwmTFxg", "Joel Jota", "Como a SAÚDE MENTAL Sustenta o SUCESSO da Família (DRA. ANDRÉA VERMONT) | JOTA JOTA PODCAST #268", 2_439_111, 7928, "3 de mar. de 2026"],
  ["wtDDjBOfTZo", "Iman Gadzhi", "Me dê 26 minutos e eu te darei 10.000 horas de conhecimento sobre o Claude", 1_700_000, 1587, "há 2 meses"],
  ["_67MWD7XW9Q", "Iman Gadzhi", "A maneira mais preguiçosa de ganhar dinheiro com IA (US$ 373/dia+)", 1_600_000, 1566, "há 1 ano"],
  ["DZoeGR_tatA", "Iman Gadzhi", "5 Maneiras Comprovadas de Ganhar Dinheiro com IA (Sem Experiência)", 1_500_000, 2191, "há 3 meses"],
  ["8Rf0xna31xg", "Sanji Nai-Chien", "How a Faceless Channel Made $39K With Claude + ChatGPT", 1_500_000, 1430, "há 1 mês"],
  ["jYdE1f_bK38", "Joel Jota", "O Que Ninguém Te Conta Sobre Sucesso (FLAVIO AUGUSTO) | JOTA JOTA PODCAST #251", 1_311_912, 7305, "4 de nov. de 2025"],
  ["FYK45gaDhMQ", "Joel Jota", "O Que Você Precisa Entender Sobre SAÚDE MENTAL e BURNOUT | TEMPO DE MESA", 1_268_607, 5980, "1 de set. de 2026"],
  ["-pp851qDmOY", "Money Talk With Leon", "A Maneira MAIS SIMPLES de Ganhar Dinheiro Online com Claude AI em 2027", 918_000, 894, "há 1 mês"],
  ["Fys4oHlXQmQ", "AI Master", "FULL Claude Course for Beginners in 2026! (Become a PRO!)", 832_000, 6293, "3 months ago"],
  ["FvRbRWKSzwY", "Ernesto Reis", "O Nível Mais Assustador de DISCIPLINA que Você Já Viu", 779_466, 1196, "28 de jan. de 2026"],
  ["zWEV2aE4RMg", "AI Master", "30 ChatGPT Hacks You Need to Know in 2026 (Become a PRO!)", 778_000, 1384, "1 year ago"],
  ["bcM9dP_uXJU", "AI Master", "How to Build an AI Agent with Claude Code (Claude AI Agent Tutorial)", 774_000, 1328, "3 months ago"],
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
  { label: "Notícias e opinião", count: 44, averageViews: 178_948.25 },
  { label: "Negócios e dinheiro", count: 95, averageViews: 170_512.56842105262 },
  { label: "Ferramentas práticas", count: 224, averageViews: 112_172.99551569506 },
  { label: "Modelos e lançamentos", count: 267, averageViews: 92_961.19101123596 },
  { label: "Agentes e automação", count: 72, averageViews: 58_065.27777777778 },
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

const editorialTerms = [" ia ", "ai ", "chatgpt", "claude", "gemini", "openai", "agente", "automação", "inteligência artificial", "foco", "disciplina", "produtiv", "procrast", "estud", "aprend", "tempo", "prioridad", "hábito", "habito", "rotina", "carreira", "trabalho", "negócio", "negocio", "dinheiro", "sistema", "organiz", "objetivo", "meta", "performance", "sucesso", "atenção", "atencao", "cérebro", "cerebro", "dopamina", "conteúdo", "conteudo", "criativ", "marca pessoal", "burnout", "autossabot"];
const irrelevantTerms = ["signo", "zodíaco", "zodiaco", "nicólas maduro", "nicolás maduro", "jiu-jitsu", "futebol", "apartamento", "tatame"];
const isEditoriallyRelevant = (video: CompetitorVideo) => {
  const title = ` ${video.title.toLocaleLowerCase("pt-BR")} `;
  return editorialTerms.some((term) => title.includes(term)) && !irrelevantTerms.some((term) => title.includes(term));
};

const normalizeCollectedViews = (channel: string, value: unknown) => {
  if (typeof value !== "number") return null;
  const hasRoundedThousandsBug = channel === "Pedro Cooke" && value >= 1_000_000 && value % 1_000_000 === 0;
  return hasRoundedThousandsBug ? value / 1_000 : value;
};

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
          views: normalizeCollectedViews(channelName, typeof video.views === "number" ? video.views : observation.views),
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
      stats: { channels: 18, videos: 997, withViews: 994, averageViews: 113_214.68309859154 },
    };
  }
  const withViews = data.videos.filter((v) => v.views != null);
  const totalViews = withViews.reduce((sum, v) => sum + (v.views ?? 0), 0);
  const topics = topicRules.map((rule) => {
    const matches = data.videos.filter((v) => rule.terms.some((term) => v.title.toLocaleLowerCase("pt-BR").includes(term)));
    const scored = matches.filter((v) => v.views != null);
    return { label: rule.label, count: matches.length, averageViews: scored.length ? scored.reduce((sum, v) => sum + (v.views ?? 0), 0) / scored.length : 0 };
  }).filter((topic) => topic.count).sort((a, b) => b.averageViews - a.averageViews);
  return { ...data, topVideos: data.videos.filter(isEditoriallyRelevant).slice(0, 15), topics, stats: { channels: data.channels.length, videos: data.videos.length, withViews: withViews.length, averageViews: withViews.length ? totalViews / withViews.length : 0 } };
}
