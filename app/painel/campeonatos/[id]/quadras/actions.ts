"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function atualizarOperacaoPartida(formData: FormData) {
  const championshipId = String(formData.get("championship_id") ?? "");
  const matchId = String(formData.get("match_id") ?? "");
  const courtLabel = String(formData.get("court_label") ?? "").trim().slice(0, 40);
  const scheduledAt = String(formData.get("scheduled_at") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(championshipId) || !/^[0-9a-f-]{36}$/i.test(matchId) || !["scheduled", "called", "in_progress", "finished"].includes(status)) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: championship } = await supabase.from("championships").select("organizador_id").eq("id", championshipId).maybeSingle();
  if (!championship || championship.organizador_id !== user.id) return;
  const now = new Date().toISOString();
  await supabase.from("bracket_matches").update({
    court_label: courtLabel || null,
    scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    operational_status: status,
    called_at: status === "called" ? now : undefined,
    started_at: status === "in_progress" ? now : undefined,
    finished_at: status === "finished" ? now : undefined,
    updated_at: now,
  }).eq("id", matchId).eq("championship_id", championshipId);
  revalidatePath(`/painel/campeonatos/${championshipId}/quadras`);
  revalidatePath(`/campeonatos/${championshipId}/ao-vivo`);
}
