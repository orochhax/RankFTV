import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isPublicFunnelEvent, validOptionalUuid } from "@/lib/public-funnel";
import { hasInvalidContentLength, readBoundedRequestBody } from "@/lib/bounded-request-body";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!(await checkRateLimit(`public-funnel:${getClientIp(request.headers)}`, 120, 60))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  const maxBytes = 4096;
  if (hasInvalidContentLength(request, maxBytes)) return NextResponse.json({ ok: false }, { status: 413 });
  const bytes = await readBoundedRequestBody(request, maxBytes);
  if (bytes === null) return NextResponse.json({ ok: false }, { status: 413 });
  const body = bytes.length > 0
    ? await Promise.resolve().then(() => JSON.parse(new TextDecoder().decode(bytes))).catch(() => null) as Record<string, unknown> | null
    : null;
  if (
    !body || !isPublicFunnelEvent(body.event) ||
    typeof body.sessionId !== "string" || !UUID.test(body.sessionId) ||
    !validOptionalUuid(body.championshipId) || !validOptionalUuid(body.categoryId)
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  // Client timestamps are intentionally ignored so event ordering remains server-controlled.
  const occurredAt = new Date().toISOString();
  const admin = createAdminClient();
  if (body.championshipId) {
    const { data } = await admin.from("championships").select("id").eq("id", body.championshipId).maybeSingle();
    if (!data) return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (body.categoryId) {
    let query = admin.from("championship_categories").select("id, championship_id").eq("id", body.categoryId);
    if (body.championshipId) query = query.eq("championship_id", body.championshipId);
    const { data } = await query.maybeSingle();
    if (!data) return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { error } = await admin.from("public_funnel_events").insert({
    session_id: body.sessionId,
    event_name: body.event,
    championship_id: body.championshipId ?? null,
    category_id: body.categoryId ?? null,
    experience_version: body.experienceVersion === "discovery_v2" ? "discovery_v2" : "legacy",
    occurred_at: occurredAt,
  });
  if (error?.code === "23505") return NextResponse.json({ ok: true, duplicate: true }, { status: 202 });
  return NextResponse.json({ ok: !error }, { status: error ? 503 : 202 });
}
