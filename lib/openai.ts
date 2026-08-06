import "server-only";

import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");
  client ??= new OpenAI({ apiKey, maxRetries: 2, timeout: 240_000 });
  return client;
}
