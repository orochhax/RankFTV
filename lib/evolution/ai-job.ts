export const activeAiJobStatuses = [
  "queued_analysis",
  "analyzing",
  "queued_apply",
  "applying",
] as const;

export type EvolutionAiJobStatus =
  | (typeof activeAiJobStatuses)[number]
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function summarizeAiJobResult(value: unknown) {
  const root = record(value);
  const review = record(root?.review);
  const youtube = record(root?.youtube);
  const items = Array.isArray(youtube?.items) ? youtube.items : [];
  const trends = Array.isArray(youtube?.trends) ? youtube.trends : [];
  const ideas = Array.isArray(youtube?.ideas) ? youtube.ideas : [];

  return {
    score: number(review?.score),
    verdict: text(review?.verdict),
    summary: text(review?.summary),
    actions: Array.isArray(review?.actions)
      ? review.actions.map(text).filter((item): item is string => Boolean(item)).slice(0, 6)
      : [],
    youtubeSummary: text(youtube?.summary),
    itemCount: items.length,
    trendCount: trends.length,
    ideas: ideas.slice(0, 5).flatMap((value) => {
      const idea = record(value);
      const title = text(idea?.title);
      const score = number(idea?.score);
      const state = text(idea?.state);
      return title && score !== null ? [{ title, score, state }] : [];
    }),
  };
}
