import { NextRequest, NextResponse } from "next/server";
import { scanOperationalAlerts } from "@/lib/operational-alerts";
import { reportOperationalEvent } from "@/lib/observability";
import { isCronAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

async function run(request: NextRequest) {
  if (!isCronAuthorized(request.headers)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await scanOperationalAlerts()) });
  } catch (error) {
    await reportOperationalEvent({
      level: "critical",
      event: "cron.operational_alerts_failed",
      message: "Operational alert scan failed",
      requestId: request.headers.get("x-request-id"),
      error,
      alert: true,
    });
    return NextResponse.json({ ok: false, error: "Operational alert scan failed" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
