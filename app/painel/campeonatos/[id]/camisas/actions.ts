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
