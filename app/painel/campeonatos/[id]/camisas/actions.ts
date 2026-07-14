"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// Defesa em profundidade: o RLS de shirt_production/notifications já restringe
// ao dono, mas a checagem explícita evita operar em campeonato alheio.
async function isOwner(supabase: SupabaseClient, champId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: champ } = await supabase
    .from("championships")
    .select("organizador_id")
    .eq("id", champId)
    .single();
  return !!champ && champ.organizador_id === user.id;
}

export async function toggleProduced(
  champId:   string,
  athleteId: string,
  produced:  boolean,
) {
  const supabase = await createClient();
  if (!(await isOwner(supabase, champId))) return;
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
  if (!(await isOwner(supabase, champId))) return;
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
  if (!(await isOwner(supabase, champId))) return;
  const { data: teams } = await supabase
    .from("teams")
    .select("atleta1_id, atleta2_id")
    .eq("championship_id", champId);
  const participantes = new Set(
    (teams ?? []).flatMap((team) => [team.atleta1_id, team.atleta2_id].filter(Boolean) as string[]),
  );
  const recipients = [...new Set(athleteIds)].filter((id) => participantes.has(id)).slice(0, 500);
  if (recipients.length === 0) return;
  const rows = recipients.map((uid) => ({
    user_id:         uid,
    championship_id: champId,
    tipo:            "camisa_pronta",
    titulo:          "Camisa pronta para retirada",
    mensagem:        `Sua camisa do campeonato ${campNome} já está pronta. Retire no local do evento.`,
  }));
  await createAdminClient().from("notifications").insert(rows);
  revalidatePath(`/painel/campeonatos/${champId}/camisas`);
}

export async function bulkMarkProduced(
  champId:    string,
  athleteIds: string[],
  produced:   boolean,
) {
  if (athleteIds.length === 0) return;
  const supabase = await createClient();
  if (!(await isOwner(supabase, champId))) return;
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
