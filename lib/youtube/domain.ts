export const YOUTUBE_SCORE_KEYS = [
  "novelty",
  "impact",
  "audience",
  "momentum",
  "lowCompetition",
  "brazilRelevance",
  "demonstrability",
  "urgency",
] as const;

export type YoutubeScoreKey = (typeof YOUTUBE_SCORE_KEYS)[number];
export type YoutubeScoreComponents = Record<YoutubeScoreKey, number>;
export type YoutubeScoreWeights = Record<YoutubeScoreKey, number>;

export const DEFAULT_YOUTUBE_WEIGHTS: YoutubeScoreWeights = {
  novelty: 20,
  impact: 20,
  audience: 15,
  momentum: 10,
  lowCompetition: 5,
  brazilRelevance: 15,
  demonstrability: 5,
  urgency: 10,
};

export const IDEA_SCORE_PILLARS = [
  { key: "competitorProof", label: "Prova nos concorrentes", weight: 30 },
  { key: "transformationAndMoney", label: "Transformação, sistemas e negócios", weight: 25 },
  { key: "stackReplicability", label: "Execução na stack (≤ R$ 200)", weight: 20 },
  { key: "timingAndDurability", label: "Timing e durabilidade", weight: 15 },
  { key: "brazilGap", label: "Ponte Gringa → Brasil", weight: 10 },
] as const;

const DAY_MS = 24 * 60 * 60 * 1_000;

const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

const corporateOnlyNewsRegex =
  /\b(fabricacao de chips|semicondutores|uso justo no treinamento|cinco valores|orchestra bio|modelos de mundo|direitos autorais|processo judicial|regulacao europeia)\b/i;

const actionableToolNewsRegex =
  /\b(claude|chatgpt|gemini|flow|notebooklm|antigravity|skills?|agentes?|cursor|lovable|n8n|grokbot|slides|motion|video com ia|design|codigo)\b/i;

export function clampYoutubeScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const computeAgeDecay = (ageDays: number) => {
  if (ageDays > 14) return 15 + (ageDays - 14) * 1.2;
  if (ageDays > 7) return 5 + (ageDays - 7) * 1.4;
  return ageDays > 2 ? (ageDays - 2) * 1.0 : 0;
};

export function computeLiveNewsOpportunityScore(
  item: {
    title: string;
    summary_pt_br?: string | null;
    why_it_matters?: string | null;
    opportunity_score: number | null;
    published_at: string | null;
    collected_at: string;
  },
  now = new Date(),
): number | null {
  if (item.opportunity_score == null) return null;
  const text = normalizeText([item.title, item.summary_pt_br, item.why_it_matters].filter(Boolean).join(" "));
  const isCorporateOnly = corporateOnlyNewsRegex.test(text) && !/\b(tutorial|passo a passo|como usar|teste pratico)\b/i.test(text);
  const baseScore = isCorporateOnly ? Math.min(item.opportunity_score, 64) : item.opportunity_score;
  const refDateMs = Date.parse(item.published_at ?? item.collected_at);
  const ageDays = Number.isFinite(refDateMs) ? Math.max(0, (now.getTime() - refDateMs) / DAY_MS) : 0;
  const toolBonus = !isCorporateOnly && actionableToolNewsRegex.test(text) && ageDays <= 4 ? 2 : 0;
  return clampYoutubeScore(Math.max(35, Math.min(98, baseScore + toolBonus - computeAgeDecay(ageDays))));
}

export function scoreYoutubeOpportunity(
  components: YoutubeScoreComponents,
  inputWeights: Partial<YoutubeScoreWeights>,
) {
  const weights = { ...DEFAULT_YOUTUBE_WEIGHTS, ...inputWeights };
  const totalWeight = YOUTUBE_SCORE_KEYS.reduce((sum, key) => sum + Math.max(0, weights[key]), 0);
  const normalized = totalWeight === 0
    ? DEFAULT_YOUTUBE_WEIGHTS
    : Object.fromEntries(
        YOUTUBE_SCORE_KEYS.map((key) => [key, (Math.max(0, weights[key]) / totalWeight) * 100]),
      ) as YoutubeScoreWeights;
  const total = YOUTUBE_SCORE_KEYS.reduce(
    (sum, key) => sum + clampYoutubeScore(components[key]) * normalized[key],
    0,
  );
  return clampYoutubeScore(total / 100);
}

export function youtubeLocalDateTime(now: Date, timezone = "America/Bahia") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

export function dueYoutubeScheduleKey(
  now: Date,
  times: string[],
  existingKeys: Set<string>,
  timezone = "America/Bahia",
  windowMinutes = 20,
) {
  const local = youtubeLocalDateTime(now, timezone);
  const minutes = (input: string) => {
    const [hour, minute] = input.split(":").map(Number);
    return hour * 60 + minute;
  };
  const current = minutes(local.time);
  const due = times
    .filter((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    .map((time) => ({ time, delta: current - minutes(time) }))
    .filter(({ delta }) => delta >= 0 && delta < windowMinutes)
    .sort((a, b) => a.delta - b.delta)[0];
  if (!due) return null;
  const key = `${local.date}@${due.time}`;
  return existingKeys.has(key) ? null : key;
}
