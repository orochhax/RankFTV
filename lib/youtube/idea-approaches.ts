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

export const IDEA_APPROACH_LABELS: Record<YoutubeIdeaApproachKey, string> = {
  noticia_explicacao: "Notícia e explicação",
  tutorial_aplicacao: "Tutorial e aplicação",
  transformacao_beneficio: "Transformação e benefício",
  experimento_historia: "Experimento, história ou vlog",
};
