export type PreviousVideoObservation = { observedAt?: string | null; views?: number | null };

export type OpportunityVideoInput = {
  id: string | null;
  channel: string;
  title: string;
  originalTitle: string;
  url: string | null;
  thumbnail: string | null;
  thumbnailUrl: string | null;
  views: number | null;
  likes?: number | null;
  comments?: number | null;
  isLive?: boolean | null;
  durationSeconds: number | null;
  publishedAt: string | null;
  publishedText: string | null;
  observedAt: string | null;
  previousObservations?: PreviousVideoObservation[] | null;
};

export type OpportunityBreakdown = {
  outlierExplosion: number;
  audienceScale: number;
  activeTraction: number;
  relativeEngagement: number;
  replicabilityAndValidity: number;
};

export type EditorialPillar = "ai_applied" | "growth_systems" | "news";

export type RankedOpportunityVideo = OpportunityVideoInput & {
  opportunityScore: number;
  breakdown: OpportunityBreakdown;
  channelMedianViews: number;
  relativePerformanceMultiple: number;
  recentViewsPerDay: number;
  engagementMultiple: number | null;
  formatLabel: string;
  topicLabel: string;
  editorialPillar: EditorialPillar;
  editorialPillarLabel: string;
  rationale: string;
};

type ChannelEngagementStats = { medianViews: number; medianLikeRate: number; medianCommentRate: number };

const DAY_MS = 24 * 60 * 60 * 1_000;
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const normalized = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

export const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const excludedTerms = [
  "signo", "zodiaco", "nicolas maduro", "jiu-jitsu", "futebol", "apartamento", "tatame", "fofoca",
  "i bought a", "comprei um", "comprei uma", "my mansion", "minha mansao", "porque eu sumi",
  "por que eu sumi", "day in the life", "meu apartamento", "my new car", "meu carro novo",
  "billion bet", "multi-billion", "brutally honest money debate",
  "podcast", "entrevista", "interview", "cortes do", "corte do", "mesa cast", "mesacast", "ao vivo", "live stream",
];

const eligibleThemeRegex =
  /\b(ia|ai|inteligencia artificial|claude|chatgpt|gpt|gemini|openai|anthropic|agente|agentes|agent|agents|automacao|automation|cursor|lovable|saas|software|apps?|codigo|code|notebooklm|n8n|higgsfield|grok|llm|mcp|skills?|sistema|sistemas|system|produtiv|productivity|foco|disciplina|rotina|carreira|career|trabalho|profissional|aprender|aprendizado|estud|learn|knowledge|dinheiro|money|negocio|negocios|business|vendas?|sales|renda|income|fatur|lucro|profit|rich|wealth|millionaire|milionario|online|lancamento|release|noticia|news)\b|\$|r\$/i;

const transferableMethodRegex =
  /\b(como |how to|give me|ways to|laziest|simplest|copy|strategy|tutorial|passo a passo|step-by-step|step by step|criei|construi|sistema|framework|metodo|method|clonar|clone|aprenda|course|curso|full workflow|guia|guide|rules|regras|tricks|hacks|truques|best online business)\b/i;

const carlosCoreStackRegex =
  /\b(claude|chatgpt|gpt|gemini|google|flow|notebooklm|antigravity|lovable|n8n|cursor|sistema|system|segundo cerebro|second brain|negocio|business|money|dinheiro|vendas|sales|foco|produtiv)\b/i;

const expensiveToolRegex = /\b(higgsfield|runway|sora pro|heygen|elevenlabs|kling|midjourney)\b/i;

const pureNewsRegex =
  /\b(just dropped|just released|all updates explained|lancou|acabou de lancar|new update|novidades do|chegou o|noticia|news|release)\b/i;

const aiTerms = [
  " inteligencia artificial", " ia ", " ia:", "com ia", "usando ia", "de ia", " ai ", "chatgpt", "claude", "gemini", "openai",
  "agente", "agent", "automacao", "automation", "cursor", "lovable", "higgsfield", "notebooklm", "n8n", "mcp", "skill",
];

const newsTerms = [
  "noticia", "news", "lancamento", "release", "lancou", "anunciou", "novidade",
  "novo ", "nova ", "mudou", "acabou", "chegou", "estreia", "atualizacao", "explained", "dropped",
];

const pillarLabels: Record<EditorialPillar, string> = {
  ai_applied: "IA aplicada a resultados",
  growth_systems: "Produtividade, carreira e sistemas",
  news: "Notícia relevante",
};

const topicRules = [
  { label: "Negócios e monetização", terms: ["dinheiro", "money", "business", "negocio", "vendas", "venda", "renda", "cliente", "clientes", "fatur", "faturei", "lucro", "lucrar", "monetiz", "agencia", "saas", "r$", "$", "vender", "riqueza", "milionario", "online"] },
  { label: "Agentes e automação", terms: ["agent", "agente", "automacao", "automation", "workflow", "mcp", "n8n"] },
  { label: "Ferramentas de IA", terms: ["chatgpt", "claude", "gemini", "openai", "cursor", "lovable", "higgsfield", "ia ", "ai "] },
  { label: "Sistemas e produtividade", terms: ["sistema", "system", "produt", "foco", "prioridad", "rotina", "tempo", "organiz", "procrast"] },
  { label: "Aprendizado e carreira", terms: ["aprend", "learn", "knowledge", "estud", "carreira", "trabalho", "profissional", "conhecimento", "skill"] },
  { label: "Notícias e opinião", terms: ["noticia", "news", "lancamento", "release", "mudou", "acabou", "novo "] },
];

const titleHasAny = (title: string, terms: string[]) => terms.some((term) => title.includes(term));

const videoTopics = (video: OpportunityVideoInput) => {
  const title = ` ${normalized(video.originalTitle || video.title)} `;
  return topicRules.filter((rule) => titleHasAny(title, rule.terms)).map((rule) => rule.label);
};

const isLongTutorial = (title: string) =>
  titleHasAny(title, ["curso", "course", "tutorial", "aula", "passo a passo", "guia completo", "full course", "knowledge"]);

const isShortOrInvalidDuration = (durationSeconds: number | null, title: string) => {
  if (durationSeconds != null && durationSeconds > 0 && durationSeconds <= 180) return true;
  return (durationSeconds ?? 0) > 45 * 60 && !isLongTutorial(title);
};

export const isEligibleOpportunityVideo = (video: OpportunityVideoInput) => {
  if (video.views == null || video.views < 0 || Boolean(video.isLive)) return false;
  const rawTitle = normalized(video.originalTitle || video.title);
  const paddedTitle = ` ${rawTitle} `;
  if (isShortOrInvalidDuration(video.durationSeconds, paddedTitle)) return false;
  return !titleHasAny(paddedTitle, excludedTerms) && eligibleThemeRegex.test(rawTitle);
};

const unitDayMultipliers: Array<[string, number]> = [
  ["min", 0], ["h", 0], ["d", 1], ["sem", 7], ["week", 7], ["mes", 30], ["month", 30], ["ano", 365], ["year", 365],
];

const parseRelativeAgeDays = (text: string | null) => {
  if (!text) return null;
  const value = normalized(text).trim();
  if (["hoje", "today", "ontem", "yesterday"].includes(value)) return 1;
  const match = value.match(/(\d+)\s*([a-z]+)/);
  if (!match) return null;
  const found = unitDayMultipliers.find(([prefix]) => match[2].startsWith(prefix));
  if (!found) return null;
  return Math.max(1, Number(match[1]) * (found[1] || 1));
};

const videoAgeDays = (video: OpportunityVideoInput, now: Date) => {
  if (video.publishedAt) {
    const published = new Date(video.publishedAt);
    if (!Number.isNaN(published.getTime())) {
      return Math.max(1, (now.getTime() - published.getTime()) / DAY_MS);
    }
  }
  return parseRelativeAgeDays(video.publishedText) ?? 90;
};

const editorialPillarFor = (video: OpportunityVideoInput): EditorialPillar => {
  const title = ` ${normalized(video.originalTitle || video.title)} `;
  const channelAndTitle = `${title} ${normalized(video.channel)} `;
  if (titleHasAny(title, newsTerms) && !transferableMethodRegex.test(title)) return "news";
  if (titleHasAny(channelAndTitle, aiTerms) || /\$|r\$|money|dinheiro/.test(title)) return "ai_applied";
  return "growth_systems";
};

const formatLabel = (video: OpportunityVideoInput) => {
  const title = ` ${normalized(video.originalTitle || video.title)} `;
  if (transferableMethodRegex.test(title)) return "Tutorial aplicável";
  if (titleHasAny(title, ["testei", "usei", "criei", "construi", "dias", "semana", "meses"])) return "Experimento demonstrável";
  if (titleHasAny(title, newsTerms)) return "Notícia explicada";
  return "Tese explicativa";
};

const isLongFormForStats = (video: OpportunityVideoInput): video is OpportunityVideoInput & { views: number } =>
  video.views != null && !video.isLive && (video.durationSeconds == null || video.durationSeconds > 180);

const buildChannelStats = (videos: OpportunityVideoInput[]) => {
  const grouped = new Map<string, { views: number[]; likeRates: number[]; commentRates: number[] }>();
  for (const video of videos) {
    if (!isLongFormForStats(video)) continue;
    const entry = grouped.get(video.channel) ?? { views: [], likeRates: [], commentRates: [] };
    entry.views.push(video.views);
    if (video.views > 100 && video.likes != null) entry.likeRates.push(video.likes / video.views);
    if (video.views > 100 && video.comments != null) entry.commentRates.push(video.comments / video.views);
    grouped.set(video.channel, entry);
  }
  const stats = new Map<string, ChannelEngagementStats>();
  for (const [channel, data] of grouped.entries()) {
    stats.set(channel, {
      medianViews: Math.max(1, median(data.views)),
      medianLikeRate: median(data.likeRates) || 0.04,
      medianCommentRate: median(data.commentRates) || 0.002,
    });
  }
  return stats;
};

const computeRecentVelocity = (video: OpportunityVideoInput, lifetimeViewsPerDay: number) => {
  const firstObs = video.previousObservations?.[0];
  if (!firstObs?.observedAt || !video.observedAt || firstObs.views == null || video.views == null) {
    return lifetimeViewsPerDay;
  }
  const dtDays = (new Date(video.observedAt).getTime() - new Date(firstObs.observedAt).getTime()) / DAY_MS;
  const dViews = video.views - firstObs.views;
  return dtDays >= 0.5 && dViews >= 0 ? dViews / dtDays : lifetimeViewsPerDay;
};

const scoreOutlierLayer = (mult: number, medianViews: number, ageDays: number) => {
  const scaleBoost = medianViews >= 200_000 ? 2.5 : medianViews >= 50_000 ? 1.45 : 1.0;
  const ageBoost = ageDays <= 7 ? 1.5 : ageDays <= 14 ? 1.35 : ageDays <= 30 ? 1.15 : 1.0;
  return clamp(Math.round(Math.min(32, Math.log2(Math.max(1, mult * scaleBoost * ageBoost)) * 6.8)), 0, 32);
};

const scoreEngagementLayer = (video: OpportunityVideoInput, stats: ChannelEngagementStats) => {
  const views = video.views ?? 0;
  if (views <= 0 || (video.likes == null && video.comments == null)) return { relativeEngagement: 5, engagementMultiple: null };
  const likeRatio = video.likes != null ? (video.likes / views) / Math.min(stats.medianLikeRate, 0.032) : 1.0;
  const commentRatio = video.comments != null ? (video.comments / views) / Math.min(stats.medianCommentRate, 0.0012) : 1.0;
  const rawChannelCommentRatio = video.comments != null ? (video.comments / views) / stats.medianCommentRate : null;
  const engagementMultiple = rawChannelCommentRatio != null ? Number(Math.max(rawChannelCommentRatio, commentRatio).toFixed(2)) : null;
  const engIndex = commentRatio * 0.65 + likeRatio * 0.35;
  const relativeEngagement = clamp(Math.round(Math.min(10, Math.max(2, 5.5 + Math.log2(Math.max(0.25, engIndex)) * 2.8))), 1, 10);
  return { relativeEngagement, engagementMultiple };
};

const scoreReplicabilityLayer = (video: OpportunityVideoInput, ageDays: number) => {
  const rawTitle = normalized(video.originalTitle || video.title);
  const isTransferable = transferableMethodRegex.test(rawTitle);
  const inCoreStack = carlosCoreStackRegex.test(rawTitle);
  let rep = (isTransferable ? 8.5 : 6.0) + (inCoreStack ? 1.5 : 0);
  if (expensiveToolRegex.test(rawTitle) && !inCoreStack) rep -= 3.5;
  if (pureNewsRegex.test(rawTitle) && !isTransferable && ageDays > 25) {
    rep -= Math.min(6, (ageDays - 25) * 0.15);
  }
  return clamp(Math.round(rep), 1, 10);
};

const computeBreakdown = (
  video: OpportunityVideoInput,
  stats: ChannelEngagementStats,
  ageDays: number,
  recentViewsPerDay: number,
): { breakdown: OpportunityBreakdown; engagementMultiple: number | null } => {
  const views = video.views ?? 0;
  const outlierExplosion = scoreOutlierLayer(views / stats.medianViews, stats.medianViews, ageDays);
  const audienceScale = clamp(Math.round(Math.min(26, Math.max(0, (Math.log10(Math.max(1, views)) - 3.7) * 10.2))), 0, 26);
  const activeVelocity = recentViewsPerDay * 0.6 + (views / ageDays) * 0.4;
  const activeTraction = clamp(Math.round(Math.min(22, Math.max(0, (Math.log10(Math.max(1, activeVelocity)) - 1.8) * 6.8))), 0, 22);
  const { relativeEngagement, engagementMultiple } = scoreEngagementLayer(video, stats);
  const replicabilityAndValidity = scoreReplicabilityLayer(video, ageDays);
  return {
    breakdown: { outlierExplosion, audienceScale, activeTraction, relativeEngagement, replicabilityAndValidity },
    engagementMultiple,
  };
};

const rationaleFor = (params: {
  multiple: number;
  recentViewsPerDay: number;
  engagementMultiple: number | null;
  breakdown: OpportunityBreakdown;
  topic: string;
}) => {
  const perf = `${params.multiple.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}× a mediana do canal`;
  const velocity = `${Math.round(params.recentViewsPerDay).toLocaleString("pt-BR")} views/dia de tração ativa`;
  const eng = params.engagementMultiple && params.engagementMultiple >= 1.3
    ? `; ${params.engagementMultiple.toLocaleString("pt-BR")}× mais comentários que o normal`
    : "";
  const rep = params.breakdown.replicabilityAndValidity;
  const stackNote = rep >= 9
    ? "alta replicabilidade na sua stack (≤ R$ 200)"
    : rep <= 5
      ? "exige ferramenta/créditos acima da stack básica"
      : "formato adaptável";
  return `${perf} · ${velocity}${eng}; ${stackNote}. Sinal: ${params.topic}.`;
};

const scoreSingleVideo = (
  video: OpportunityVideoInput,
  channelStats: Map<string, ChannelEngagementStats>,
  now: Date,
  enforceProductionFloor: boolean,
): RankedOpportunityVideo | null => {
  const stats = channelStats.get(video.channel) ?? {
    medianViews: Math.max(1, video.views ?? 1),
    medianLikeRate: 0.04,
    medianCommentRate: 0.002,
  };
  const relativePerformanceMultiple = (video.views ?? 0) / stats.medianViews;
  if (enforceProductionFloor && (relativePerformanceMultiple < 2.2 || (video.views ?? 0) < 10_000)) {
    return null;
  }
  const ageDays = videoAgeDays(video, now);
  const recentViewsPerDay = computeRecentVelocity(video, (video.views ?? 0) / ageDays);
  const { breakdown, engagementMultiple } = computeBreakdown(video, stats, ageDays, recentViewsPerDay);
  const opportunityScore = clamp(
    breakdown.outlierExplosion + breakdown.audienceScale + breakdown.activeTraction
    + breakdown.relativeEngagement + breakdown.replicabilityAndValidity,
    0,
    99,
  );
  const topicLabel = videoTopics(video)[0] ?? "Sinal editorial";
  const editorialPillar = editorialPillarFor(video);
  return {
    ...video,
    opportunityScore,
    breakdown,
    channelMedianViews: stats.medianViews,
    relativePerformanceMultiple,
    recentViewsPerDay: Math.round(recentViewsPerDay),
    engagementMultiple,
    formatLabel: formatLabel(video),
    topicLabel,
    editorialPillar,
    editorialPillarLabel: pillarLabels[editorialPillar],
    rationale: rationaleFor({ multiple: relativePerformanceMultiple, recentViewsPerDay, engagementMultiple, breakdown, topic: topicLabel }),
  };
};

export function rankOpportunityVideos(
  videos: OpportunityVideoInput[],
  options: { limit?: number; perChannel?: number; now?: Date } = {},
) {
  const limit = options.limit ?? 15;
  const perChannel = options.perChannel ?? 3;
  const now = options.now ?? new Date();
  const channelStats = buildChannelStats(videos);
  const enforceProductionFloor = videos.length > 50;

  const ranked = videos
    .filter(isEligibleOpportunityVideo)
    .map((video) => scoreSingleVideo(video, channelStats, now, enforceProductionFloor))
    .filter((item): item is RankedOpportunityVideo => item !== null)
    .sort((a, b) =>
      b.opportunityScore - a.opportunityScore
      || (b.views ?? 0) - (a.views ?? 0)
      || b.relativePerformanceMultiple - a.relativePerformanceMultiple,
    );

  const selected: RankedOpportunityVideo[] = [];
  const channelCounts = new Map<string, number>();
  for (const video of ranked) {
    const count = channelCounts.get(video.channel) ?? 0;
    if (count >= perChannel) continue;
    selected.push(video);
    channelCounts.set(video.channel, count + 1);
    if (selected.length === limit) break;
  }
  return selected;
}
