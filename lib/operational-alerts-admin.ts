import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole, isCeo } from "@/lib/supabase/roles";
import { createClient } from "@/lib/supabase/server";

export async function currentCeoUser() {
  const supabase = await createClient();
  const [{ data: { user } }, role] = await Promise.all([
    supabase.auth.getUser(),
    getUserRole(supabase),
  ]);
  if (!user || !isCeo(role)) return null;
  return user;
}

export async function loadOperationalAlertsAdminData() {
  const admin = createAdminClient();
  const [{ data: settings, error: settingsError }, { data: alerts, error: alertsError }] = await Promise.all([
    admin.from("operational_alert_settings").select("*").eq("id", 1).maybeSingle(),
    admin.from("operational_alerts")
      .select("id, kind, severity, title, entity_type, entity_id, detected_at")
      .eq("status", "open")
      .order("detected_at", { ascending: false })
      .limit(200),
  ]);
  if (settingsError || alertsError) throw new Error("operational_alerts_admin_load_failed");
  return { settings, alerts: alerts ?? [] };
}

export async function saveOperationalAlertSettings(values: {
  enabled: boolean;
  payment_pending_enabled: boolean;
  webhook_failed_enabled: boolean;
  assisted_refund_enabled: boolean;
  payout_rejected_enabled: boolean;
  email_queue_enabled: boolean;
  payment_pending_minutes: number;
  email_queue_minutes: number;
  email_queue_backlog_threshold: number;
}) {
  const { error } = await createAdminClient().from("operational_alert_settings").update({
    ...values,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) throw new Error("operational_alert_settings_update_failed");
}

export async function resolveOperationalAlert(id: string, userId: string) {
  const { error } = await createAdminClient().from("operational_alerts").update({
    status: "resolved",
    resolved_at: new Date().toISOString(),
    resolved_by: userId,
  }).eq("id", id);
  if (error) throw new Error("operational_alert_resolution_failed");
}
