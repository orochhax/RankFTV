"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { scanOperationalAlerts } from "@/lib/operational-alerts";
import {
  currentCeoUser,
  resolveOperationalAlert,
  saveOperationalAlertSettings,
} from "@/lib/operational-alerts-admin";

const checkbox = z.string().optional().transform((value) => value === "on");
const settingsSchema = z.object({
  enabled: checkbox,
  paymentPendingEnabled: checkbox,
  webhookFailedEnabled: checkbox,
  assistedRefundEnabled: checkbox,
  payoutRejectedEnabled: checkbox,
  emailQueueEnabled: checkbox,
  paymentPendingMinutes: z.coerce.number().int().min(5).max(1440).catch(30),
  emailQueueMinutes: z.coerce.number().int().min(5).max(1440).catch(15),
  emailQueueBacklogThreshold: z.coerce.number().int().min(1).max(500).catch(10),
});

export async function salvarConfiguracaoAlertas(formData: FormData) {
  if (!(await currentCeoUser())) return;
  const settings = settingsSchema.parse({
    enabled: formData.get("enabled"),
    paymentPendingEnabled: formData.get("payment_pending_enabled"),
    webhookFailedEnabled: formData.get("webhook_failed_enabled"),
    assistedRefundEnabled: formData.get("assisted_refund_enabled"),
    payoutRejectedEnabled: formData.get("payout_rejected_enabled"),
    emailQueueEnabled: formData.get("email_queue_enabled"),
    paymentPendingMinutes: formData.get("payment_pending_minutes"),
    emailQueueMinutes: formData.get("email_queue_minutes"),
    emailQueueBacklogThreshold: formData.get("email_queue_backlog_threshold"),
  });

  await saveOperationalAlertSettings({
    enabled: settings.enabled,
    payment_pending_enabled: settings.paymentPendingEnabled,
    webhook_failed_enabled: settings.webhookFailedEnabled,
    assisted_refund_enabled: settings.assistedRefundEnabled,
    payout_rejected_enabled: settings.payoutRejectedEnabled,
    email_queue_enabled: settings.emailQueueEnabled,
    payment_pending_minutes: settings.paymentPendingMinutes,
    email_queue_minutes: settings.emailQueueMinutes,
    email_queue_backlog_threshold: settings.emailQueueBacklogThreshold,
  });
  revalidatePath("/admin/alertas");
}

export async function resolverAlerta(formData: FormData) {
  const user = await currentCeoUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return;
  await resolveOperationalAlert(id, user.id);
  revalidatePath("/admin/alertas");
}

export async function verificarAlertas() {
  if (!(await currentCeoUser())) return;
  await scanOperationalAlerts();
  revalidatePath("/admin/alertas");
}
