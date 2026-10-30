import { z } from "zod";

export const IDEA_APPROACH_KEYS = [
  "noticia_explicacao",
  "tutorial_aplicacao",
  "transformacao_beneficio",
  "experimento_historia",
] as const;

export const ideaApproachKeySchema = z.enum(IDEA_APPROACH_KEYS);

export const ideaApproachSchema = z.object({
  approachKey: ideaApproachKeySchema,
  title: z.string().min(10),
  explanation: z.string().min(20),
  promise: z.string().min(20),
  demonstration: z.string().min(20),
  whyItWorks: z.string().min(20),
  timeliness: z.string().min(10),
  longevity: z.string().min(10),
  requirementsSummary: z.string().min(10),
  score: z.number().int().min(0).max(100),
});

export const ideaApproachesSchema = z.array(ideaApproachSchema).length(4).superRefine((approaches, context) => {
  const keys = new Set(approaches.map((approach) => approach.approachKey));
  for (const key of IDEA_APPROACH_KEYS) {
    if (!keys.has(key)) {
      context.addIssue({
        code: "custom",
        message: `A abordagem ${key} é obrigatória.`,
      });
    }
  }
});

export type YoutubeIdeaApproachKey = z.infer<typeof ideaApproachKeySchema>;
export type YoutubeIdeaApproachInput = z.infer<typeof ideaApproachSchema>;
export type StoredIdeaApproachSummary = {
  idea_id: string;
  approach_key: YoutubeIdeaApproachKey;
  position: number;
  score: number;
  title: string;
  explanation: string;
};

export function selectBestIdeaApproach<T extends { score: number; position: number }>(approaches: readonly T[]): T | null {
  let best: T | null = null;
  for (const approach of approaches) {
    if (!best || approach.score > best.score || (approach.score === best.score && approach.position < best.position)) {
      best = approach;
    }
  }
  return best;
}

export function selectBestIdeaApproachesByIdea(approaches: readonly StoredIdeaApproachSummary[]) {
  const bestByIdea = new Map<string, StoredIdeaApproachSummary>();
  for (const approach of approaches) {
    const current = bestByIdea.get(approach.idea_id);
    if (!current || approach.score > current.score || (approach.score === current.score && approach.position < current.position)) {
      bestByIdea.set(approach.idea_id, approach);
    }
  }
  return bestByIdea;
}

export function bestIdeaApproachPresentation(approach: StoredIdeaApproachSummary | undefined, fallbackScore: number) {
  if (!approach) return { best_approach_key: null, best_approach_score: fallbackScore, best_approach_title: null, best_approach_explanation: null };
  return {
    best_approach_key: approach.approach_key,
    best_approach_score: approach.score,
    best_approach_title: approach.title,
    best_approach_explanation: approach.explanation,
  };
}

export const IDEA_APPROACH_LABELS: Record<YoutubeIdeaApproachKey, string> = {
  noticia_explicacao: "Notícia e explicação",
  tutorial_aplicacao: "Tutorial e aplicação",
  transformacao_beneficio: "Transformação e benefício",
  experimento_historia: "Experimento, história ou vlog",
};
