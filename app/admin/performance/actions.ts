"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/performance";

type Res = { ok: boolean; error?: string };

// Só o CEO (ADMIN_EMAIL) mexe no painel de performance.
async function requireCeo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null;
  return { supabase, user };
}

function reval() {
  revalidatePath("/admin/performance");
}

// ── Perfil base (+ peso atual de hoje, se informado) ──────────────────────────
export async function salvarPerfil(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const num = (k: string) => {
    const v = parseFloat(formData.get(k) as string);
    return Number.isFinite(v) ? v : null;
  };
  const str = (k: string) => {
    const v = (formData.get(k) as string)?.trim();
    return v ? v : null;
  };

  const { error } = await supabase.from("perf_profile").upsert(
    {
      user_id:         user.id,
      altura_cm:       num("altura_cm"),
      data_nascimento: str("data_nascimento"),
      lado:            str("lado"),
      pe_dominante:    str("pe_dominante"),
      peso_meta:       num("peso_meta"),
      rating_meta:     num("rating_meta"),
      treinos_semana_meta: num("treinos_semana_meta"),
      updated_at:      new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };

  // Peso atual → registra (ou atualiza) o de hoje.
  const peso = num("peso_atual");
  if (peso != null && peso > 0) {
    const { error: pErr } = await supabase.from("perf_weight").upsert(
      { user_id: user.id, data: hojeISO(), peso_kg: peso },
      { onConflict: "user_id,data" },
    );
    if (pErr) return { ok: false, error: pErr.message };
  }

  reval();
  return { ok: true };
}

// ── Hábitos (metas do dia) ────────────────────────────────────────────────────
const SUGERIDOS = [
  { label: "Sono",        tipo: "numerico", alvo: 8,  unidade: "h" },
  { label: "Treino",      tipo: "numerico", alvo: 60, unidade: "min" },
  { label: "Hidratação",  tipo: "numerico", alvo: 3,  unidade: "L" },
  { label: "Refeições no plano", tipo: "numerico", alvo: 5, unidade: "ref" },
  { label: "Alongamento", tipo: "binario",  alvo: null, unidade: null },
] as const;

export async function criarHabitosSugeridos(): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const rows = SUGERIDOS.map((h, i) => ({
    user_id: user.id, label: h.label, tipo: h.tipo,
    alvo: h.alvo, unidade: h.unidade, ordem: i,
  }));
  const { error } = await supabase.from("perf_habit").insert(rows);
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

export async function criarHabito(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const label = (formData.get("label") as string)?.trim();
  if (!label) return { ok: false, error: "Dê um nome ao hábito." };
  const tipo = (formData.get("tipo") as string) === "numerico" ? "numerico" : "binario";
  const alvo = tipo === "numerico" ? parseFloat(formData.get("alvo") as string) : null;
  const unidade = tipo === "numerico" ? ((formData.get("unidade") as string)?.trim() || null) : null;
  if (tipo === "numerico" && (!alvo || alvo <= 0)) {
    return { ok: false, error: "Defina um alvo maior que zero." };
  }

  const { data: maxRow } = await supabase
    .from("perf_habit").select("ordem")
    .eq("user_id", user.id).order("ordem", { ascending: false }).limit(1).maybeSingle();
  const ordem = (maxRow?.ordem ?? -1) + 1;

  const { error } = await supabase.from("perf_habit").insert({
    user_id: user.id, label, tipo, alvo, unidade, ordem,
  });
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

export async function editarHabito(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const id = formData.get("id") as string;
  const label = (formData.get("label") as string)?.trim();
  if (!id || !label) return { ok: false, error: "Dados inválidos." };
  const tipo = (formData.get("tipo") as string) === "numerico" ? "numerico" : "binario";
  const alvo = tipo === "numerico" ? parseFloat(formData.get("alvo") as string) : null;
  const unidade = tipo === "numerico" ? ((formData.get("unidade") as string)?.trim() || null) : null;
  if (tipo === "numerico" && (!alvo || alvo <= 0)) {
    return { ok: false, error: "Defina um alvo maior que zero." };
  }

  const { error } = await supabase
    .from("perf_habit")
    .update({ label, tipo, alvo, unidade })
    .eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

export async function removerHabito(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;
  // Desativa (não apaga) pra preservar o histórico dos logs já registrados.
  const { error } = await supabase
    .from("perf_habit").update({ ativo: false })
    .eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

// ── Peso ─────────────────────────────────────────────────────────────────────
export async function registrarPeso(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const pesoKg = parseFloat(formData.get("peso_kg") as string);
  if (!Number.isFinite(pesoKg) || pesoKg <= 0) return { ok: false, error: "Peso inválido." };
  const data = (formData.get("data") as string)?.trim() || hojeISO();

  const { error } = await supabase.from("perf_weight").upsert(
    { user_id: user.id, data, peso_kg: pesoKg },
    { onConflict: "user_id,data" },
  );
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

export async function definirMetaPeso(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const meta = parseFloat(formData.get("peso_meta") as string);
  if (!Number.isFinite(meta) || meta <= 0) return { ok: false, error: "Meta inválida." };

  const { error } = await supabase.from("perf_profile").upsert(
    { user_id: user.id, peso_meta: meta, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

// ── Relatório semanal ────────────────────────────────────────────────────────
export async function salvarRelatorio(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const semana_inicio = (formData.get("semana_inicio") as string)?.trim();
  if (!semana_inicio) return { ok: false, error: "Semana inválida." };

  const notaRaw = parseInt(formData.get("nota") as string ?? "");
  const nota = Number.isInteger(notaRaw) && notaRaw >= 0 && notaRaw <= 10 ? notaRaw : null;

  const str = (k: string) => { const v = (formData.get(k) as string)?.trim(); return v || undefined; };
  const num = (k: string) => { const v = parseFloat(formData.get(k) as string ?? ""); return Number.isFinite(v) ? v : undefined; };

  const respostasRaw: Record<string, unknown> = {
    aderencia_semana: num("aderencia_semana"),
    dias_registrados: num("dias_registrados"),
    melhor_habito:    str("melhor_habito"),
    habito_fraco:     str("habito_fraco"),
    o_que_foi_bem:    str("o_que_foi_bem"),
    o_que_melhorar:   str("o_que_melhorar"),
    foco_proxima:     str("foco_proxima"),
  };
  const respostas: Record<string, unknown> = Object.fromEntries(
    Object.entries(respostasRaw).filter(([, v]) => v !== undefined),
  );

  const { error } = await supabase.from("perf_weekly_report").upsert(
    { user_id: user.id, semana_inicio, nota, respostas, updated_at: new Date().toISOString() },
    { onConflict: "user_id,semana_inicio" },
  );
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

// ── Futevôlei: rating ────────────────────────────────────────────────────────
export async function registrarRating(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const rating = parseFloat(formData.get("rating") as string);
  if (!Number.isFinite(rating) || rating < 0) return { ok: false, error: "Rating inválido." };
  const data = (formData.get("data") as string)?.trim() || hojeISO();

  const { error } = await supabase.from("perf_rating").insert({ user_id: user.id, data, rating });
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

export async function definirMetaRating(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const meta = parseFloat(formData.get("rating_meta") as string);
  if (!Number.isFinite(meta) || meta < 0) return { ok: false, error: "Meta inválida." };

  const { error } = await supabase.from("perf_profile").upsert(
    { user_id: user.id, rating_meta: meta, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

// ── Futevôlei: jogos ─────────────────────────────────────────────────────────
export async function adicionarJogo(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const resultado = formData.get("resultado") as string;
  if (resultado !== "vitoria" && resultado !== "derrota") {
    return { ok: false, error: "Resultado inválido." };
  }
  const str = (k: string) => (formData.get(k) as string)?.trim() || null;

  const { error } = await supabase.from("perf_match").insert({
    user_id:    user.id,
    data:       str("data") ?? hojeISO(),
    parceiro:   str("parceiro"),
    adversario: str("adversario"),
    resultado,
    placar:     str("placar"),
    obs:        str("obs"),
  });
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

export async function removerJogo(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("perf_match")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

// ── Treinos ──────────────────────────────────────────────────────────────────
export async function registrarTreino(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const tipo = formData.get("tipo") as string;
  if (!["tecnico", "fisico", "jogo"].includes(tipo)) return { ok: false, error: "Tipo inválido." };
  const duracaoRaw = parseInt(formData.get("duracao_min") as string ?? "");
  const duracao_min = Number.isInteger(duracaoRaw) && duracaoRaw > 0 ? duracaoRaw : null;
  const str = (k: string) => (formData.get(k) as string)?.trim() || null;

  const { error } = await supabase.from("perf_training").insert({
    user_id: user.id, data: str("data") ?? hojeISO(), tipo, duracao_min, obs: str("obs"),
  });
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

export async function removerTreino(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;
  const { error } = await supabase.from("perf_training").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

export async function definirMetaTreinos(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const meta = parseInt(formData.get("treinos_semana_meta") as string ?? "");
  if (!Number.isInteger(meta) || meta < 1 || meta > 14) return { ok: false, error: "Meta inválida (1–14)." };

  const { error } = await supabase.from("perf_profile").upsert(
    { user_id: user.id, treinos_semana_meta: meta, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

// ── Testes físicos ────────────────────────────────────────────────────────────
export async function registrarTeste(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const tipo_teste = (formData.get("tipo_teste") as string)?.trim();
  if (!tipo_teste) return { ok: false, error: "Nome do teste obrigatório." };
  const valor = parseFloat(formData.get("valor") as string ?? "");
  if (!Number.isFinite(valor)) return { ok: false, error: "Valor inválido." };
  const str = (k: string) => (formData.get(k) as string)?.trim() || null;

  const { error } = await supabase.from("perf_test").insert({
    user_id: user.id, data: str("data") ?? hojeISO(), tipo_teste, valor, unidade: str("unidade"),
  });
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

export async function removerTeste(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;
  const { error } = await supabase.from("perf_test").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

// ── Registro diário ──────────────────────────────────────────────────────────
export async function registrarHabito(
  habitId: string,
  valor: number,
  dataISO?: string,
): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const data = dataISO ?? hojeISO();
  const { error } = await supabase.from("perf_habit_log").upsert(
    { user_id: user.id, habit_id: habitId, data, valor },
    { onConflict: "habit_id,data" },
  );
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}
