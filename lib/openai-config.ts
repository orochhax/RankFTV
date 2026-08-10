export const openAIReasoningEfforts = ["none", "low", "medium", "high", "xhigh", "max"] as const;

export const OPENAI_ROADMAP_DEFAULT_MAX_OUTPUT_TOKENS = 120_000;
export const OPENAI_ROADMAP_MIN_OUTPUT_TOKENS = 30_000;
export const OPENAI_ROADMAP_PROVIDER_MAX_OUTPUT_TOKENS = 128_000;

export type OpenAIReasoningEffort = (typeof openAIReasoningEfforts)[number];

export function openAIReasoningEffort(
  value: string | undefined,
  fallback: OpenAIReasoningEffort = "medium",
): OpenAIReasoningEffort {
  const normalized = value?.trim().toLowerCase();
  return openAIReasoningEfforts.includes(normalized as OpenAIReasoningEffort)
    ? (normalized as OpenAIReasoningEffort)
    : fallback;
}

export function openAIRoadmapMaxOutputTokens(value: string | undefined): number {
  const normalized = value?.trim();
  if (!normalized || !/^\d+$/.test(normalized)) return OPENAI_ROADMAP_DEFAULT_MAX_OUTPUT_TOKENS;

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) return OPENAI_ROADMAP_DEFAULT_MAX_OUTPUT_TOKENS;

  return Math.min(
    OPENAI_ROADMAP_PROVIDER_MAX_OUTPUT_TOKENS,
    Math.max(OPENAI_ROADMAP_MIN_OUTPUT_TOKENS, parsed),
  );
}
