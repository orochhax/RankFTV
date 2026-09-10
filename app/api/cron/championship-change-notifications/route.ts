import { NextRequest, NextResponse } from "next/server";
import { processPendingChampionshipNoticeDeliveries } from "@/lib/championship-notices";
import { isCronAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

async function run(request: NextRequest) {
  if (!isCronAuthorized(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await processPendingChampionshipNoticeDeliveries({ limit: 50 })) });
}

export const GET = run;
export const POST = run;
