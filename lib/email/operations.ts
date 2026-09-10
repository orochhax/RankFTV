import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { emailRecipientDigest } from "@/lib/email/recipient-digest";

export type EmailOperationalStatus =
  | "queued" | "accepted" | "delivered" | "delayed"
  | "bounced" | "complained" | "failed" | "suppressed";

export async function createEmailOperationalEvent(input: {
  recipient: string;
  templateKey: string;
}): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("transactional_email_events")
    .insert({
      template_key: input.templateKey,
      recipient_hash: emailRecipientDigest(input.recipient),
      status: "queued",
    })
    .select("id")
    .maybeSingle();
  return data?.id ?? null;
}

export async function updateEmailOperationalEvent(input: {
  id: string | null;
  status: EmailOperationalStatus;
  providerMessageId?: string | null;
  failureCategory?: string | null;
}) {
  if (!input.id) return;
  const now = new Date().toISOString();
  const values: Record<string, unknown> = { status: input.status, last_event_at: now, updated_at: now };
  if (input.providerMessageId) values.provider_message_id = input.providerMessageId;
  if (input.status === "accepted") values.accepted_at = now;
  if (input.status === "delivered") values.delivered_at = now;
  if (input.failureCategory) values.failure_category = input.failureCategory.slice(0, 120);
  await createAdminClient().from("transactional_email_events").update(values).eq("id", input.id);
}

export async function applyEmailProviderEvent(input: {
  providerMessageId: string;
  recipient: string | null;
  status: EmailOperationalStatus;
  occurredAt: string;
  failureCategory?: string | null;
}) {
  const admin = createAdminClient();
  const values: Record<string, unknown> = {
    status: input.status,
    last_event_at: input.occurredAt,
    updated_at: new Date().toISOString(),
  };
  if (input.status === "delivered") values.delivered_at = input.occurredAt;
  if (input.failureCategory) values.failure_category = input.failureCategory.slice(0, 120);
  const { data } = await admin
    .from("transactional_email_events")
    .update(values)
    .eq("provider", "resend")
    .eq("provider_message_id", input.providerMessageId)
    .select("id")
    .maybeSingle();
  if (!data && input.recipient) {
    await admin.from("transactional_email_events").insert({
      provider: "resend",
      provider_message_id: input.providerMessageId,
      template_key: "provider_event",
      recipient_hash: emailRecipientDigest(input.recipient),
      ...values,
      requested_at: input.occurredAt,
    });
  }
}
