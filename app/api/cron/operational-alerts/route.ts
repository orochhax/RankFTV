import { NextRequest, NextResponse } from "next/server";
import { scanOperationalAlerts } from "@/lib/operational-alerts";
import { isCronAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

async function run(request: NextRequest) {
  if (!isCronAuthorized(request.headers)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await scanOperationalAlerts()) });
}

export const GET = run;
export const POST = run;
