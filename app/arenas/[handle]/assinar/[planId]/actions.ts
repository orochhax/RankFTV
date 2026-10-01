"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { arenaRecurringPaymentsEnabled } from "@/lib/release-flags";
import { createClient } from "@/lib/supabase/server";

export type AssinarResult =
  | { ok: true }
  | { ok: false; error: string };

/** Nenhum dado de cartão é recebido pelo RankFTV neste fluxo. */
export async function assinarPlano(): Promise<AssinarResult> {
  if (!arenaRecurringPaymentsEnabled()) {
    return {
      ok: false,
      error: "Novas assinaturas pagas estão pausadas enquanto a Arena está em beta.",
    };
  }

  return {
    ok: false,
    error: "Assinaturas recorrentes estão em homologação. Consulte a arena para combinar a matrícula.",
  };
}

// ── Plano gratuito (valor = 0) ────────────────────────────────────────────────

export async function assinarGratuito(planId: string): Promise<AssinarResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };
  const admin = createAdminClient();

  const { data: plan } = await supabase
    .from("arena_plans")
    .select("id, arena_id, valor, tipo, ativo")
    .eq("id", planId)
    .eq("tipo", "mensalidade")
    .eq("ativo", true)
    .single();

  if (!plan) return { ok: false, error: "Plano não encontrado." };
  if (Number(plan.valor) !== 0) return { ok: false, error: "Este plano não é gratuito." };

  const { data: existing } = await supabase
    .from("arena_students")
    .select("id, status")
    .eq("arena_id", plan.arena_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.status === "ativo") return { ok: true };

  if (existing) {
    await admin
      .from("arena_students")
      .update({ plan_id: plan.id, status: "ativo", valor_mensalidade: 0 })
      .eq("id", existing.id);
  } else {
    const { error } = await admin
      .from("arena_students")
      .insert({
        arena_id: plan.arena_id,
        user_id: user.id,
        plan_id: plan.id,
        status: "ativo",
        valor_mensalidade: 0,
      });
    if (error) return { ok: false, error: "Erro ao criar vínculo com a arena." };
  }

  return { ok: true };
}

// ── Onboarding pós-pagamento ──────────────────────────────────────────────────

export type OnboardingInput = {
  nome: string;
  dataNascimento: string;
  genero: string;
  experiencia: string;
  esportes: string;
  frequencia: string;
  autoavaliacao: string;
};

export type OnboardingResult =
  | { ok: true }
  | { ok: false; error: string };

export async function salvarOnboardingAtleta(input: OnboardingInput): Promise<OnboardingResult> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  let rating = 800;
  if (input.experiencia === "menos1") rating += 100;
  if (input.experiencia === "1a3") rating += 350;
  if (input.experiencia === "mais3") rating += 600;
  if (input.autoavaliacao === "intermediario") rating += 200;
  if (input.autoavaliacao === "avancado") rating += 500;
  if (input.frequencia === "3-4") rating += 100;
  if (input.frequencia === "5+") rating += 150;

  const esportes: string[] = JSON.parse(input.esportes || "[]");
  if (esportes.includes("volei") || esportes.includes("futebol")) rating += 100;

  const [{ error }, { error: privateError }] = await Promise.all([
    admin
      .from("profiles")
      .update({ nome: input.nome.trim(), genero: input.genero || null, rating })
      .eq("id", user.id),
    supabase
      .from("profiles_private")
      .upsert(
        { user_id: user.id, data_nascimento: input.dataNascimento || null },
        { onConflict: "user_id" },
      ),
  ]);

  if (error || privateError) return { ok: false, error: "Erro ao salvar perfil." };
  return { ok: true };
}
