"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole, isCeo } from "@/lib/supabase/roles";
import { scanOperationalAlerts } from "@/lib/operational-alerts";

async function requireCeo() {
  const supabase = await createClient();
  const [{ data: { user } }, role] = await Promise.all([supabase.auth.getUser(), getUserRole(supabase)]);
  return user && isCeo(role) ? user : null;
}

export async function salvarConfiguracaoAlertas(formData: FormData) {
  if (!(await requireCeo())) return;
  const minutes = Math.min(1440, Math.max(5, Number(formData.get("payment_pending_minutes")) || 30));
  await createAdminClient().from("operational_alert_settings").update({ enabled: formData.get("enabled") === "on", payment_pending_enabled: formData.get("payment_pending_enabled") === "on", webhook_failed_enabled: formData.get("webhook_failed_enabled") === "on", assisted_refund_enabled: formData.get("assisted_refund_enabled") === "on", payout_rejected_enabled: formData.get("payout_rejected_enabled") === "on", payment_pending_minutes: minutes, updated_at: new Date().toISOString() }).eq("id", 1);
  revalidatePath("/admin/alertas");
}

export async function resolverAlerta(formData: FormData) {
  const user = await requireCeo();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await createAdminClient().from("operational_alerts").update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user.id }).eq("id", id);
  revalidatePath("/admin/alertas");
}

export async function verificarAlertas() {
  if (!(await requireCeo())) return;
  await scanOperationalAlerts();
  revalidatePath("/admin/alertas");
}
