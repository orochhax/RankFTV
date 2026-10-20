import { NextRequest, NextResponse } from "next/server";
import { getResend } from "@/lib/email/resend";
import { applyEmailProviderEvent, type EmailOperationalStatus } from "@/lib/email/operations";
import { reportOperationalEvent } from "@/lib/observability";
import { hasInvalidContentLength, readBoundedRequestBody } from "@/lib/bounded-request-body";

function webhookHeader(request: NextRequest, current: string, legacy: string): string {
  return request.headers.get(current) ?? request.headers.get(legacy) ?? "";
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Webhook indisponível." }, { status: 503 });
  const maxBytes = 256 * 1024;
  if (hasInvalidContentLength(request, maxBytes)) {
    return NextResponse.json({ error: "Payload muito grande." }, { status: 413 });
  }
  const bytes = await readBoundedRequestBody(request, maxBytes);
  if (bytes === null) return NextResponse.json({ error: "Payload muito grande." }, { status: 413 });
  if (bytes.length === 0) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const payload = new TextDecoder().decode(bytes);
  try {
    const event = getResend().webhooks.verify({
      payload,
      webhookSecret,
      headers: {
        id: webhookHeader(request, "webhook-id", "svix-id"),
        timestamp: webhookHeader(request, "webhook-timestamp", "svix-timestamp"),
        signature: webhookHeader(request, "webhook-signature", "svix-signature"),
      },
    });
    if (!event.type.startsWith("email.") || !("email_id" in event.data)) {
      return NextResponse.json({ received: true });
    }
    const statusMap: Record<string, EmailOperationalStatus | undefined> = {
      "email.sent": "accepted",
      "email.delivered": "delivered",
      "email.delivery_delayed": "delayed",
      "email.bounced": "bounced",
      "email.complained": "complained",
      "email.failed": "failed",
      "email.suppressed": "suppressed",
    };
    const status = statusMap[event.type];
    if (status) {
      const failureCategory =
        event.type === "email.bounced" ? event.data.bounce.type :
        event.type === "email.failed" ? event.data.failed.reason :
        event.type === "email.suppressed" ? event.data.suppressed.type : null;
      await applyEmailProviderEvent({
        providerMessageId: event.data.email_id,
        recipient: event.data.to[0] ?? null,
        status,
        occurredAt: event.created_at,
        failureCategory,
      });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    await reportOperationalEvent({
      level: "warn",
      event: "email.webhook_invalid",
      message: "Email provider webhook signature was rejected",
      error,
    });
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }
}
