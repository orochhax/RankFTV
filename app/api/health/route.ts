import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function checkDatabase() {
  const startedAt = Date.now();
  const query = createAdminClient().from("championships").select("id").limit(1);
  const result = await Promise.race([
    query,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("database_timeout")), 3_000)
    ),
  ]);
  if (result.error) throw new Error("database_unavailable");
  return Date.now() - startedAt;
}

export async function GET() {
  const startedAt = Date.now();
  try {
    const databaseLatencyMs = await checkDatabase();
    return NextResponse.json(
      {
        status: "ok",
        service: "rankftv",
        release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? process.env.APP_VERSION ?? "local",
        checks: { database: "ok" },
        databaseLatencyMs,
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        status: "unhealthy",
        service: "rankftv",
        checks: { database: "unavailable" },
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
}
