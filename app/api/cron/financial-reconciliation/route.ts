import { NextRequest, NextResponse } from "next/server";
import { reconcileFinancialOutbox } from "@/lib/financial-reconciliation";
import { reportOperationalEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

async function run(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requestId = req.headers.get("x-request-id");
  try {
    const result = await reconcileFinancialOutbox(50);
    await reportOperationalEvent({
      level: result.failed > 0 ? "error" : "info",
      event: "cron.financial_reconciliation_completed",
      message: result.failed > 0 ? "Financial operations require attention" : undefined,
      requestId,
      context: result,
      alert: result.failed > 0,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    await reportOperationalEvent({
      level: "critical",
      event: "cron.financial_reconciliation_failed",
      message: "Financial reconciliation job failed",
      requestId,
      error,
      alert: true,
    });
    return NextResponse.json({ ok: false, error: "Financial reconciliation failed" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
