"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/lib/audit";
import type { Genero } from "@/lib/types";

export async function salvarQuestionario(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const genero = formData.get("genero") as Genero | null;
  if (genero !== "masculino" && genero !== "feminino" && genero !== "outro") {
    return { error: "Selecione seu gênero." };
  }

  const { data: perfilAtual } = await supabase
    .from("profiles")
    .select("genero")
    .eq("id", user.id)
    .single();
  const generoAnterior = perfilAtual?.genero ?? null;

  // Primeira definição (perfil ainda sem gênero) é onboarding normal, sem
  // restrição. Mudar um gênero que JÁ foi usado pra entrar numa categoria ou
  // aula restrita por gênero e paga precisa de um fluxo controlado — não dá
  // pra deixar autoatendimento silencioso depois que o gênero já valeu pra
  // acessar algo, senão vira um jeito de burlar categoria/aula de gênero
  // fechado ida e volta.
  if (generoAnterior && generoAnterior !== genero) {
    const admin = createAdminClient();

    // Consultas em duas etapas (sem filtro em recurso aninhado do PostgREST)
    // pra ficar fácil de auditar e não depender de sintaxe de embedded filter.
    const [{ data: minhasEquipes }, { data: minhasPresencas }] = await Promise.all([
      admin.from("teams").select("id").or(`atleta1_id.eq.${user.id},atleta2_id.eq.${user.id}`),
      admin.from("arena_attendance").select("class_id").eq("user_id", user.id).neq("status", "cancelado"),
    ]);

    let usouCategoriaFechadaPaga = false;
    const teamIds = (minhasEquipes ?? []).map((t) => t.id);
    if (teamIds.length > 0) {
      const { data: minhasInscricoesPagas } = await admin
        .from("registrations")
        .select("category_id")
        .in("team_id", teamIds)
        .eq("status_pagamento", "pago");
      const categoryIds = [...new Set((minhasInscricoesPagas ?? []).map((r) => r.category_id))];
      if (categoryIds.length > 0) {
        const { data: categorias } = await admin
          .from("championship_categories")
          .select("id, genero")
          .in("id", categoryIds);
        usouCategoriaFechadaPaga = (categorias ?? []).some((c) => c.genero !== "mista");
      }
    }

    let usouAulaRestrita = false;
    const classIds = [...new Set((minhasPresencas ?? []).map((a) => a.class_id))];
    if (classIds.length > 0) {
      const { data: aulas } = await admin
        .from("arena_classes")
        .select("id, publico")
        .in("id", classIds);
      usouAulaRestrita = (aulas ?? []).some((c) => c.publico !== "misto");
    }

    if (usouCategoriaFechadaPaga || usouAulaRestrita) {
      await registrarAuditoria({
        actorId: user.id,
        acao: "genero_mudanca_bloqueada_pos_uso",
        alvoTabela: "profiles",
        alvoId: user.id,
        detalhes: { generoAnterior, generoSolicitado: genero },
      });
      return {
        error:
          "Seu gênero já foi usado numa inscrição paga ou aula restrita por gênero. " +
          "Pra mudar agora, fale com o suporte — essa troca precisa de revisão manual.",
      };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ genero })
    .eq("id", user.id);

  if (error) return { error: "Erro ao salvar. Tente novamente." };

  if (generoAnterior && generoAnterior !== genero) {
    await registrarAuditoria({
      actorId: user.id,
      acao: "genero_alterado",
      alvoTabela: "profiles",
      alvoId: user.id,
      detalhes: { generoAnterior, generoNovo: genero },
    });
  }

  revalidatePath("/perfil");
  revalidatePath("/campeonatos", "layout");
  redirect("/perfil");
}
