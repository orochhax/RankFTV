"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string };

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

export async function cadastrarArenaEtapa1(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/arenas/cadastro");

  const nome = ((formData.get("nome") as string) ?? "").trim();
  const cidade = ((formData.get("cidade") as string) ?? "").trim();
  const estado = ((formData.get("estado") as string) ?? "").trim();
  const descricao = ((formData.get("descricao") as string) ?? "").trim();
  const telefone = ((formData.get("telefone") as string) ?? "").replace(/\D/g, "");
  const numQuadras = parseInt((formData.get("num_quadras") as string) ?? "1", 10);
  const turmaTitulo = ((formData.get("turma_titulo") as string) ?? "").trim();
  const turmaHora = ((formData.get("turma_horario") as string) ?? "").trim();

  if (!nome) return { error: "Informe o nome da sua arena." };
  if (!cidade) return { error: "Informe a cidade da sua arena." };
  if (!estado) return { error: "Informe o estado (UF)." };
  if (!telefone || telefone.length < 10) return { error: "Informe o WhatsApp da arena (com DDD)." };

  let handle = slugify(nome);
  const { data: existente } = await supabase
    .from("arenas")
    .select("handle")
    .eq("handle", handle)
    .maybeSingle();

  if (existente) {
    handle = `${handle}-${Math.floor(Math.random() * 900 + 100)}`;
  }

  const { data: arena, error: arenaErr } = await supabase
    .from("arenas")
    .insert({
      dono_id: user.id,
      nome,
      handle,
      cidade,
      estado,
      descricao: descricao ? `${descricao} · ${numQuadras} quadra(s)` : `${numQuadras} quadra(s) de areia`,
    })
    .select("id, handle")
    .single();

  if (arenaErr || !arena) {
    return { error: "Erro ao registrar a arena. Tente novamente." };
  }

  // Criação da conta financeira preliminar
  await supabase.from("arena_accounts").insert({
    arena_id: arena.id,
    user_id: user.id,
    cpf_cnpj: "00000000000",
    telefone,
    chave_pix: null,
    habilitado: true,
  });

  // Se o organizador já preencheu uma turma inicial
  if (turmaTitulo) {
    await supabase.from("arena_classes").insert({
      arena_id: arena.id,
      titulo: turmaTitulo,
      hora_inicio: turmaHora || "19:00",
      hora_fim: null,
      horario: turmaHora || "19:00",
      dias_semana: [1, 3],
      nivel: null,
      publico: "misto",
      ativo: true,
    });
  }

  redirect(`/arenas/cadastro/plano?handle=${arena.handle}`);
}
