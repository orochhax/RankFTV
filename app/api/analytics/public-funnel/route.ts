import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isPublicFunnelEvent, validOptionalUuid } from "@/lib/public-funnel";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!(await checkRateLimit(`public-funnel:${getClientIp(request.headers)}`, 120, 60))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (
    !body || !isPublicFunnelEvent(body.event) ||
    typeof body.sessionId !== "string" || !UUID.test(body.sessionId) ||
    !validOptionalUuid(body.championshipId) || !validOptionalUuid(body.categoryId)
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const occurredAt = typeof body.occurredAt === "string" && !Number.isNaN(Date.parse(body.occurredAt))
    ? new Date(body.occurredAt).toISOString()
    : new Date().toISOString();
  const { error } = await createAdminClient().from("public_funnel_events").insert({
    session_id: body.sessionId,
    event_name: body.event,
    championship_id: body.championshipId ?? null,
    category_id: body.categoryId ?? null,
    experience_version: body.experienceVersion === "discovery_v2" ? "discovery_v2" : "legacy",
    occurred_at: occurredAt,
  });
  return NextResponse.json({ ok: !error }, { status: error ? 503 : 202 });
}
