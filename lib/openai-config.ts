export const openAIReasoningEfforts = ["none", "low", "medium", "high", "xhigh", "max"] as const;

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
