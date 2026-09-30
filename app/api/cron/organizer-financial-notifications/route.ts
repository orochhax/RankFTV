import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { processPendingOrganizerFinancialNotifications } from "@/lib/organizer-financial-notifications";

export const dynamic = "force-dynamic";
async function run(request: NextRequest) {
  if (!isCronAuthorized(request.headers)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await processPendingOrganizerFinancialNotifications(50)) });
}
export const GET = run;
export const POST = run;
