"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getArenaId(handle: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: arena } = await supabase
    .from("arenas")
    .select("id")
    .eq("handle", handle)
    .eq("dono_id", user.id)
    .maybeSingle();

  if (!arena) throw new Error("Arena não encontrada");
  return { supabase, arenaId: arena.id };
}

// "" ou inválido → null (sem limite semanal)
function parseAulasSemana(raw: FormDataEntryValue | null): number | null {
  const n = parseInt((raw as string) ?? "", 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function addPlan(formData: FormData) {
  const handle   = formData.get("handle") as string;
  const tipo     = formData.get("tipo") as string;
  const nome     = (formData.get("nome") as string).trim();
  const descricao = (formData.get("descricao") as string | null)?.trim() || null;
  const valor    = parseFloat(formData.get("valor") as string);
  const aulasSemana = tipo === "mensalidade" ? parseAulasSemana(formData.get("aulas_por_semana")) : null;

  const { supabase, arenaId } = await getArenaId(handle);

  await supabase.from("arena_plans").insert({
    arena_id: arenaId, tipo, nome, descricao, valor,
    aulas_por_semana: aulasSemana,
  });

  revalidatePath(`/arena/planos`);
  revalidatePath(`/arenas/${handle}`);
}

export async function togglePlan(planId: string, ativo: boolean, handle: string) {
  const { supabase } = await getArenaId(handle);
  await supabase.from("arena_plans").update({ ativo }).eq("id", planId);
  revalidatePath(`/arena/planos`);
  revalidatePath(`/arenas/${handle}`);
}

export async function deletePlan(planId: string, handle: string) {
  const { supabase } = await getArenaId(handle);
  await supabase.from("arena_plans").delete().eq("id", planId);
  revalidatePath(`/arena/planos`);
  revalidatePath(`/arenas/${handle}`);
}

export async function updatePlan(formData: FormData) {
  const handle    = formData.get("handle") as string;
  const planId    = formData.get("planId") as string;
  const nome      = (formData.get("nome") as string).trim();
  const descricao = (formData.get("descricao") as string | null)?.trim() || null;
  const valor     = parseFloat(formData.get("valor") as string);
  const tipo      = formData.get("tipo") as string;

  const { supabase } = await getArenaId(handle);
  await supabase.from("arena_plans").update({
    nome, descricao, valor,
    ...(tipo === "mensalidade"
      ? { aulas_por_semana: parseAulasSemana(formData.get("aulas_por_semana")) }
      : {}),
  }).eq("id", planId);

  revalidatePath(`/arena/planos`);
  revalidatePath(`/arenas/${handle}`);
}

export async function updatePlanPaymentConfig(formData: FormData) {
  const handle        = formData.get("handle") as string;
  const planId        = formData.get("planId") as string;
  const aceitaCredito = formData.get("aceita_credito") === "true";
  const aceitaDebito  = formData.get("aceita_debito") === "true";
  const diaVencimento = parseInt(formData.get("dia_vencimento") as string, 10) || 10;

  const { supabase } = await getArenaId(handle);
  await supabase.from("arena_plans").update({
    aceita_credito:  aceitaCredito,
    aceita_debito:   aceitaDebito,
    dia_vencimento:  diaVencimento,
  }).eq("id", planId);

  revalidatePath(`/arena/planos`);
  revalidatePath(`/arenas/${handle}`);
}
