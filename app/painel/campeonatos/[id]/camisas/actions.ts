"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleProduced(
  champId:   string,
  athleteId: string,
  produced:  boolean,
) {
  const supabase = await createClient();
  await supabase
    .from("shirt_production")
    .upsert(
      { championship_id: champId, athlete_id: athleteId, produced, updated_at: new Date().toISOString() },
      { onConflict: "championship_id,athlete_id" },
    );
  revalidatePath(`/painel/campeonatos/${champId}/camisas`);
}

export async function saveEntrega(
  champId:      string,
  athleteId:    string,
  retiradoPor:  string | null,
  dataRetirada: string | null,
) {
  const supabase = await createClient();
  const updates = {
    retirado_por:  retiradoPor  || null,
    data_retirada: dataRetirada || null,
    updated_at:    new Date().toISOString(),
  };
  // Tenta update; se nenhuma linha afetada, insere com produced=false
  const { data: updated } = await supabase
    .from("shirt_production")
    .update(updates)
    .eq("championship_id", champId)
    .eq("athlete_id", athleteId)
    .select("id");
  if (!updated || updated.length === 0) {
    await supabase.from("shirt_production").insert({
      championship_id: champId,
      athlete_id:      athleteId,
      produced:        false,
      ...updates,
    });
  }
  revalidatePath(`/painel/campeonatos/${champId}/camisas`);
}

export async function notifyAthletes(
  champId:    string,
  athleteIds: string[],
  campNome:   string,
) {
  if (athleteIds.length === 0) return;
  const supabase = await createClient();
  const rows = athleteIds.map((uid) => ({
    user_id:         uid,
    championship_id: champId,
    tipo:            "camisa_pronta",
    titulo:          "Camisa pronta para retirada",
    mensagem:        `Sua camisa do campeonato ${campNome} já está pronta. Retire no local do evento.`,
  }));
  await supabase.from("notifications").insert(rows);
  revalidatePath(`/painel/campeonatos/${champId}/camisas`);
}

export async function bulkMarkProduced(
  champId:    string,
  athleteIds: string[],
  produced:   boolean,
) {
  if (athleteIds.length === 0) return;
  const supabase = await createClient();
  const rows = athleteIds.map((id) => ({
    championship_id: champId,
    athlete_id:      id,
    produced,
    updated_at:      new Date().toISOString(),
  }));
  await supabase
    .from("shirt_production")
    .upsert(rows, { onConflict: "championship_id,athlete_id" });
  revalidatePath(`/painel/campeonatos/${champId}/camisas`);
}
