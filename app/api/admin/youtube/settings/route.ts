import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasYoutubeOwnerAccess } from "@/lib/youtube/access";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const schema = z.object({
  aiProvider: z.enum(["none", "openai"]),
  aiModel: z.string().max(100),
  researchTimes: z.array(time).min(1).max(3),
  keywords: z.array(z.string().min(1).max(100)).max(50),
  maxItemsPerSource: z.number().int().min(5).max(100),
  maxAiAnalysesPerRun: z.number().int().min(0).max(50),
  monthlyBudgetUsd: z.number().min(0).max(10_000),
  editorialProfile: z.string().max(5000),
});

export async function PUT(request: Request) {
  if (!(await hasYoutubeOwnerAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Configurações inválidas" }, { status: 400 });
  }
  const value = parsed.data;
  const { error } = await createAdminClient().from("yt_app_settings").update({
    ai_provider: value.aiProvider,
    ai_model: value.aiModel,
    research_times: value.researchTimes,
    keywords: value.keywords,
    max_items_per_source: value.maxItemsPerSource,
    max_ai_analyses_per_run: value.maxAiAnalysesPerRun,
    monthly_budget_usd_micros: Math.round(value.monthlyBudgetUsd * 1_000_000),
    editorial_profile: value.editorialProfile,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) return NextResponse.json({ error: "Falha ao salvar configurações" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
