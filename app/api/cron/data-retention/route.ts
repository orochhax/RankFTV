import { NextRequest, NextResponse } from "next/server";
import { reportOperationalEvent } from "@/lib/observability";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestId = req.headers.get("x-request-id");
  const { data, error } = await createAdminClient().rpc("purge_rankftv_operational_data");
  if (error) {
    await reportOperationalEvent({
      level: "error",
      event: "cron.data_retention_failed",
      message: "Operational data retention failed",
      requestId,
      error,
      alert: true,
    });
    return NextResponse.json({ ok: false, error: "Retention failed" }, { status: 500 });
  }

  await reportOperationalEvent({
    level: "info",
    event: "cron.data_retention_completed",
    requestId,
    context: { deleted: data },
  });
  return NextResponse.json({ ok: true, deleted: data });
}
