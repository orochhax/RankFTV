"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function removerVinculoCampeonato(champId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: camp } = await supabase
    .from("championships")
    .select("organizador_id")
    .eq("id", champId)
    .single();
  if (!camp || camp.organizador_id !== user.id) throw new Error("Sem permissão");

  await supabase
    .from("championships")
    .update({ page_id: null })
    .eq("id", champId);

  revalidatePath(`/painel/campeonatos/${champId}/vinculacoes`);
  revalidatePath(`/painel/campeonatos/${champId}`);
}
