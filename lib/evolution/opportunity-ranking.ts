export type OpportunityVideoInput = {
  id: string | null;
  channel: string;
  title: string;
  originalTitle: string;
  url: string | null;
  thumbnail: string | null;
  thumbnailUrl: string | null;
  views: number | null;
  durationSeconds: number | null;
  publishedAt: string | null;
  publishedText: string | null;
  observedAt: string | null;
};

export type OpportunityBreakdown = {
  relativePerformance: number;
  editorialFit: number;
  adaptability: number;
  freshness: number;
  crossChannelValidation: number;
  packaging: number;
};

export type RankedOpportunityVideo = OpportunityVideoInput & {
  opportunityScore: number;
  breakdown: OpportunityBreakdown;
  channelMedianViews: number;
  relativePerformanceMultiple: number;
  formatLabel: string;
  topicLabel: string;
  rationale: string;
};

const DAY_MS = 24 * 60 * 60 * 1_000;

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

export const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const editorialGroups = [
  {
    label: "IA aplicada",
    terms: [" inteligencia artificial", " ia ", " ai ", "chatgpt", "claude", "gemini", "openai", "agente", "agent", "automacao", "automation"],
  },
  {
    label: "Sistemas e execução",
    terms: ["sistema", "foco", "prioridad", "disciplina", "produt", "procrast", "rotina", "habito", "tempo", "organiz", "execucao"],
  },
  {
    label: "Aprendizado e carreira",
    terms: ["aprend", "estud", "carreira", "trabalho", "profissional", "habilidade", "skill", "conhecimento"],
  },
  {
    label: "Negócios e criação",
    terms: ["negocio", "business", "dinheiro", "money", "venda", "renda", "conteudo", "canal", "marca pessoal", "cliente"],
  },
  {
    label: "Desenvolvimento pessoal",
    terms: ["meta", "objetivo", "performance", "sucesso", "atencao", "cerebro", "dopamina", "autossabot", "ansiedade", "vida"],
  },
];

const irrelevantTerms = [
  "signo",
  "zodiaco",
  "nicolas maduro",
  "jiu-jitsu",
  "futebol",
  "apartamento",
  "tatame",
  "fofoca",
];

const tutorialTerms = [
  "como ",
  "tutorial",
  "passo a passo",
  "guia",
  "curso",
  "aprenda",
  "usei",
  "testei",
  "criei",
  "construi",
  "metodo",
  "sistema",
  "estrategia",
  "framework",
  "workflow",
  "hacks",
  "truques",
];

const excludedFormatTerms = [
  "podcast",
  "entrevista",
  "interview",
  "cortes do",
  "corte do",
  "mesa cast",
  "mesacast",
  "ao vivo",
  "live stream",
];

const topicRules = [
  { label: "Agentes e automação", terms: ["agent", "agente", "automacao", "workflow", "mcp", "n8n"] },
  { label: "Ferramentas de IA", terms: ["chatgpt", "claude", "gemini", "openai", "cursor", "lovable", "ia ", "ai "] },
  { label: "Sistemas e produtividade", terms: ["sistema", "produt", "foco", "prioridad", "rotina", "tempo", "organiz", "procrast"] },
  { label: "Aprendizado e carreira", terms: ["aprend", "estud", "carreira", "trabalho", "profissional", "conhecimento"] },
  { label: "Negócios e dinheiro", terms: ["negocio", "business", "dinheiro", "money", "venda", "renda", "cliente"] },
  { label: "Conteúdo e marca", terms: ["conteudo", "youtube", "canal", "marca pessoal", "video"] },
  { label: "Desenvolvimento pessoal", terms: ["disciplina", "habito", "meta", "objetivo", "sucesso", "vida", "ansiedade", "cerebro"] },
  { label: "Notícias e opinião", terms: ["noticia", "news", "lancamento", "release", "mudou", "acabou", "novo "] },
];

const titleHasAny = (title: string, terms: string[]) =>
  terms.some((term) => title.includes(term));

const videoTopics = (video: OpportunityVideoInput) => {
  const title = ` ${normalized(video.originalTitle || video.title)} `;
  return topicRules
    .filter((rule) => titleHasAny(title, rule.terms))
    .map((rule) => rule.label);
};

const isLongTutorial = (title: string) =>
  titleHasAny(title, ["curso", "tutorial", "aula", "passo a passo", "guia completo", "full course"]);

export const isEligibleOpportunityVideo = (video: OpportunityVideoInput) => {
  if (video.views == null || video.views < 0) return false;
  const title = ` ${normalized(video.originalTitle || video.title)} `;
  if (titleHasAny(title, irrelevantTerms)) return false;
  if (!editorialGroups.some((group) => titleHasAny(title, group.terms))) return false;
  if (titleHasAny(title, excludedFormatTerms)) return false;
  if ((video.durationSeconds ?? 0) > 45 * 60 && !isLongTutorial(title)) return false;
  return true;
};

const relativePerformanceScore = (multiple: number) =>
  clamp(50 + 15 * Math.log2(Math.max(multiple, 0.05)));

const editorialFitScore = (video: OpportunityVideoInput) => {
  const title = ` ${normalized(video.originalTitle || video.title)} `;
  const matched = editorialGroups.filter((group) => titleHasAny(title, group.terms));
  if (!matched.length) return 0;
  const hasAppliedAngle = titleHasAny(title, tutorialTerms);
  const groupBreadth = Math.min(3, matched.length);
  return clamp(55 + (groupBreadth - 1) * 14 + (hasAppliedAngle ? 17 : 0));
};

const adaptabilityScore = (video: OpportunityVideoInput) => {
  const title = ` ${normalized(video.originalTitle || video.title)} `;
  let score = 58;
  if (titleHasAny(title, tutorialTerms)) score += 25;
  if (titleHasAny(title, ["explic", "por que", "o que", "verdade", "erro", "regra", "licao"])) score += 12;
  if (titleHasAny(title, ["celebridade", "reagindo", "react", "vlog", "minha casa", "meu carro"])) score -= 22;
  if ((video.durationSeconds ?? 0) > 30 * 60) score -= 10;
  return clamp(score);
};

const parseRelativeAgeDays = (text: string | null) => {
  if (!text) return null;
  const value = normalized(text).trim();
  if (value === "hoje" || value === "today") return 0;
  if (value === "ontem" || value === "yesterday") return 1;
  const match = value.match(/(\d+)\s*(min(?:uto)?s?|h(?:ora)?s?|dia?s?|sem(?:ana)?s?|mes(?:es)?|ano?s?|minute?s?|hour?s?|day?s?|week?s?|month?s?|year?s?)/);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit.startsWith("min") || unit.startsWith("h") || unit.startsWith("hour")) return 0;
  if (unit.startsWith("d") || unit.startsWith("day")) return amount;
  if (unit.startsWith("sem") || unit.startsWith("week")) return amount * 7;
  if (unit.startsWith("mes") || unit.startsWith("month")) return amount * 30;
  if (unit.startsWith("ano") || unit.startsWith("year")) return amount * 365;
  return null;
};

const videoAgeDays = (video: OpportunityVideoInput, now: Date) => {
  if (video.publishedAt) {
    const published = new Date(video.publishedAt);
    if (!Number.isNaN(published.getTime())) return Math.max(0, (now.getTime() - published.getTime()) / DAY_MS);
  }
  return parseRelativeAgeDays(video.publishedText);
};

const freshnessScore = (ageDays: number | null) => {
  if (ageDays == null) return 35;
  if (ageDays <= 7) return 100;
  if (ageDays <= 30) return 90;
  if (ageDays <= 90) return 75;
  if (ageDays <= 180) return 58;
  if (ageDays <= 270) return 44;
  if (ageDays <= 370) return 30;
  return 10;
};

const packagingScore = (video: OpportunityVideoInput) => {
  const title = normalized(video.originalTitle || video.title);
  let score = 20;
  if (/\d|r\$|us\$|\$|%/.test(title)) score += 20;
  if (titleHasAny(title, ["como ", "por que", "o que", "qual ", "?", "how ", "why "])) score += 18;
  if (titleHasAny(title, ["segredo", "verdade", "erro", "ninguem", "parei", "acabou", "melhor", "pior", "unica", "nunca", "sem "])) score += 19;
  if (titleHasAny(title, ["passo a passo", "resultado", "faturei", "ganhei", "em 7 dias", "em 30 dias", "horas", "minutos"])) score += 18;
  if (title.length >= 32 && title.length <= 95) score += 15;
  if (video.thumbnail || video.thumbnailUrl) score += 8;
  return clamp(score);
};

const formatLabel = (video: OpportunityVideoInput) => {
  const title = ` ${normalized(video.originalTitle || video.title)} `;
  if (titleHasAny(title, ["tutorial", "passo a passo", "curso", "guia", "aprenda", "como "])) return "Tutorial aplicável";
  if (titleHasAny(title, ["testei", "usei", "criei", "construi", "dias", "semana", "meses"])) return "Experimento demonstrável";
  if (titleHasAny(title, ["lancamento", "novo ", "mudou", "acabou", "noticia"])) return "Notícia explicada";
  return "Tese explicativa";
};

const rationaleFor = (video: OpportunityVideoInput, multiple: number, topic: string, breakdown: OpportunityBreakdown) => {
  const performance = multiple >= 1
    ? `${multiple.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}× a mediana do próprio canal`
    : `${Math.round(multiple * 100)}% da mediana do próprio canal`;
  const strongest = [
    [breakdown.editorialFit, "forte aderência à linha do Carlos"],
    [breakdown.adaptability, "formato fácil de transformar em vídeo autoral"],
    [breakdown.freshness, "assunto recente"],
    [breakdown.crossChannelValidation, "tema validado em mais de um canal"],
  ] as Array<[number, string]>;
  strongest.sort((a, b) => b[0] - a[0]);
  return `${performance}; ${strongest[0][1]}. Sinal: ${topic}.`;
};

export function rankOpportunityVideos(
  videos: OpportunityVideoInput[],
  options: { limit?: number; perChannel?: number; now?: Date } = {},
) {
  const limit = options.limit ?? 15;
  const perChannel = options.perChannel ?? 3;
  const now = options.now ?? new Date();
  const medians = new Map<string, number>();

  for (const channel of new Set(videos.map((video) => video.channel))) {
    const views = videos
      .filter((video) => video.channel === channel && video.views != null)
      .map((video) => video.views as number);
    medians.set(channel, median(views));
  }

  const channelsByTopic = new Map<string, Set<string>>();
  for (const video of videos) {
    for (const topic of videoTopics(video)) {
      const channels = channelsByTopic.get(topic) ?? new Set<string>();
      channels.add(video.channel);
      channelsByTopic.set(topic, channels);
    }
  }

  const ranked = videos
    .filter(isEligibleOpportunityVideo)
    .map((video): RankedOpportunityVideo => {
      const channelMedianViews = Math.max(1, medians.get(video.channel) ?? 1);
      const relativePerformanceMultiple = (video.views ?? 0) / channelMedianViews;
      const topics = videoTopics(video);
      const topicLabel = topics[0] ?? "Sinal editorial";
      const corroboratingChannels = Math.max(
        1,
        ...topics.map((topic) => channelsByTopic.get(topic)?.size ?? 1),
      );
      const breakdown: OpportunityBreakdown = {
        relativePerformance: relativePerformanceScore(relativePerformanceMultiple),
        editorialFit: editorialFitScore(video),
        adaptability: adaptabilityScore(video),
        freshness: freshnessScore(videoAgeDays(video, now)),
        crossChannelValidation: clamp(((corroboratingChannels - 1) / 5) * 100),
        packaging: packagingScore(video),
      };
      const opportunityScore = Math.round(
        breakdown.relativePerformance * 0.35
        + breakdown.editorialFit * 0.2
        + breakdown.adaptability * 0.15
        + breakdown.freshness * 0.15
        + breakdown.crossChannelValidation * 0.1
        + breakdown.packaging * 0.05,
      );
      return {
        ...video,
        opportunityScore,
        breakdown,
        channelMedianViews,
        relativePerformanceMultiple,
        formatLabel: formatLabel(video),
        topicLabel,
        rationale: rationaleFor(video, relativePerformanceMultiple, topicLabel, breakdown),
      };
    })
    .sort((a, b) =>
      b.opportunityScore - a.opportunityScore
      || b.relativePerformanceMultiple - a.relativePerformanceMultiple
      || (b.views ?? 0) - (a.views ?? 0),
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
