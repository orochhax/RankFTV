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

export function clampYoutubeScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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
