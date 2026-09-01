import { NextRequest, NextResponse } from "next/server";
import { reconcileFinancialOutbox } from "@/lib/financial-reconciliation";
import { reportOperationalEvent } from "@/lib/observability";
import { retryPendingAthleteTicketDeliveries } from "@/lib/athlete-ticket-delivery";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const credentialDeliveries = await retryPendingAthleteTicketDeliveries(createAdminClient(), 50);
    const hasFailures = result.failed > 0 || credentialDeliveries.failed > 0;
    await reportOperationalEvent({
      level: hasFailures ? "error" : "info",
      event: "cron.financial_reconciliation_completed",
      message: hasFailures ? "Financial reconciliation or credential delivery requires attention" : undefined,
      requestId,
      context: { ...result, credentialDeliveries },
      alert: hasFailures,
    });
    return NextResponse.json({ ok: true, ...result, credentialDeliveries });
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
