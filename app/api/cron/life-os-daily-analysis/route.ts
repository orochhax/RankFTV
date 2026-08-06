import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDailyLifeAnalysis } from "@/lib/daily-life-analysis-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function findPerformanceOwnerId(supabase: ReturnType<typeof createAdminClient>): Promise<{ id: string | null; error: string | null }> {
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLocaleLowerCase("pt-BR");
  if (!ownerEmail) return { id: null, error: "ADMIN_EMAIL nao configurado." };

  const perPage = 1_000;
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) return { id: null, error: error.message };
    const owner = data.users.find((user) => user.email?.trim().toLocaleLowerCase("pt-BR") === ownerEmail);
    if (owner) return { id: owner.id, error: null };
    if (data.users.length < perPage) break;
  }

  const { data: ceos, error: ceoError } = await supabase.from("profiles").select("id").eq("role", "ceo").limit(2);
  if (ceoError) return { id: null, error: ceoError.message };
  if (ceos?.length === 1) return { id: ceos[0].id, error: null };
  return { id: null, error: ceos?.length ? "Existe mais de uma conta CEO; atualize ADMIN_EMAIL." : "A conta definida em ADMIN_EMAIL nao foi encontrada." };
}

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const owner = await findPerformanceOwnerId(supabase);
  if (!owner.id) return NextResponse.json({ error: owner.error }, { status: 500 });
  const { data: performanceProfile, error: profileError } = await supabase
    .from("perf_profile")
    .select("timezone")
    .eq("user_id", owner.id)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const results: { userId: string; state: string; mode?: string; error?: string }[] = [];
  try {
    const result = await generateDailyLifeAnalysis({
      supabase,
      userId: owner.id,
      timezone: performanceProfile?.timezone ?? "America/Bahia",
    });
    results.push({ userId: owner.id, state: result.state, mode: result.analysis.generation.mode });
  } catch (generationError) {
    results.push({
      userId: owner.id,
      state: "failed",
      error: generationError instanceof Error ? generationError.message.slice(0, 200) : "Unknown error",
    });
  }

  return NextResponse.json({
    ok: results.every((result) => result.state !== "failed"),
    processed: results.length,
    generated: results.filter((result) => result.state === "generated" || result.state === "updated").length,
    skipped: results.filter((result) => result.state === "skipped").length,
    failed: results.filter((result) => result.state === "failed").length,
    results,
  });
}
