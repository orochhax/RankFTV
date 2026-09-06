import { NextRequest, NextResponse } from "next/server";
import { processPendingChampionshipNoticeDeliveries } from "@/lib/championship-notices";

export const dynamic = "force-dynamic";

async function run(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await processPendingChampionshipNoticeDeliveries({ limit: 250 })) });
}

export const GET = run;
export const POST = run;
