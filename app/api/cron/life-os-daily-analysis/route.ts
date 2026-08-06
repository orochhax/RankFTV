import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDailyLifeAnalysis } from "@/lib/daily-life-analysis-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: profiles, error } = await supabase
    .from("perf_profile")
    .select("user_id, timezone")
    .order("created_at", { ascending: true })
    .limit(25);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { userId: string; state: string; mode?: string; error?: string }[] = [];
  for (const profile of profiles ?? []) {
    try {
      const result = await generateDailyLifeAnalysis({
        supabase,
        userId: profile.user_id,
        timezone: profile.timezone ?? "America/Bahia",
      });
      results.push({ userId: profile.user_id, state: result.state, mode: result.analysis.generation.mode });
    } catch (generationError) {
      results.push({
        userId: profile.user_id,
        state: "failed",
        error: generationError instanceof Error ? generationError.message.slice(0, 200) : "Unknown error",
      });
    }
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
