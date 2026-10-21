import "server-only";

import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient } from "@/lib/openai";

const score = z.number().min(0).max(100);

const contentAnalysisSchema = z.object({
  summaryPtBr: z.string().min(20),
  whyItMatters: z.string().min(20),
  reliability: z.enum(["confirmed", "rumor", "interpretation", "insufficient"]),
  relevanceScore: score,
  noveltyScore: score,
  urgencyScore: score,
  confidenceScore: score,
  evidenceType: z.enum(["quantitative", "qualitative", "mixed"]),
  components: z.object({
    novelty: score,
    impact: score,
    audience: score,
    momentum: score,
    lowCompetition: score,
    brazilRelevance: score,
    demonstrability: score,
    urgency: score,
  }),
  factors: z.array(z.object({
    label: z.string(),
    score,
    reason: z.string(),
  })).min(3).max(8),
  idea: z.object({
    title: z.string().min(10),
    alternateTitles: z.array(z.string().min(10)).length(3),
    summary: z.string().min(20),
    rationale: z.string().min(20),
    angle: z.enum(["explicacao", "tutorial", "demonstracao", "analise", "comparacao", "opiniao", "teste", "noticia"]),
    format: z.enum(["longo", "shorts", "ambos"]),
    outline: z.array(z.string()).min(3).max(8),
    hook: z.string().min(10),
    priority: z.enum(["agora", "proximos_dias", "atemporal"]),
  }),
});

export type YoutubeContentAnalysis = z.infer<typeof contentAnalysisSchema>;

export type YoutubeAiInput = {
  title: string;
  summary: string | null;
  url: string;
  sourceName: string;
  publishedAt: string | null;
  language: string;
  category: string;
  editorialProfile: string;
};

const instructions = `Você é um analista editorial para um canal brasileiro de YouTube sobre inteligência artificial.
Trabalhe SOMENTE com os dados da fonte fornecida. Não invente confirmações, números, crescimento, concorrência ou fatos ausentes.
Diferencie fato confirmado, rumor, interpretação e evidência insuficiente. Se não houver métrica observável, use evidenceType=qualitative e declare isso nos fatores.
Produza texto em português brasileiro, títulos atraentes sem clickbait enganoso e uma ideia original. A pontuação é uma estimativa editorial, não probabilidade de viralização.`;

export async function analyseYoutubeContent(input: YoutubeAiInput, model: string) {
  const response = await getOpenAIClient().responses.create({
    model,
    instructions,
    input: JSON.stringify({
      titulo: input.title,
      resumoDaFonte: input.summary,
      urlOriginal: input.url,
      fonte: input.sourceName,
      publicadoEm: input.publishedAt,
      idioma: input.language,
      categoria: input.category,
      perfilEditorial: input.editorialProfile || "Ainda não definido; não presuma público, duração ou estilo.",
    }),
    text: { format: zodTextFormat(contentAnalysisSchema, "youtube_content_analysis") },
    max_output_tokens: 3200,
    store: false,
  }, { timeout: 90_000, maxRetries: 1 });

  const data = contentAnalysisSchema.parse(JSON.parse(response.output_text));
  return {
    data,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  };
}
