"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/supabase/roles";

export type CriarVitrineInput = {
  nome: string;
  descricao: string;
  regulamento: string;
  dataInicio: string;
  dataFim: string;
  cidade: string;
  estado: string;
  local: string;
  bannerUrl?: string;
  bannerPositionX?: number;
  bannerPositionY?: number;
  status: "inscricoes_abertas" | "em_andamento" | "encerrado";
};

export type AtualizarVitrineInput = CriarVitrineInput & { id: string };

// Garante um número finito dentro de 0–100; fora disso vira null (centro).
function clampPercent(v: number | undefined): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.min(100, Math.max(0, v));
}

async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return (await isAdminUser(supabase)) ? user : null;
}

type CamposValidos = {
  nome: string;
  status: "inscricoes_abertas" | "em_andamento" | "encerrado";
  cidade: string;
  estado: string;
};

// Validações comuns a criar/atualizar. Retorna os campos já normalizados ou
// um erro pronto pra devolver ao form.
function validarCampos(input: CriarVitrineInput): { ok: true; campos: CamposValidos } | { ok: false; error: string } {
  const nome = input.nome?.trim();
  if (!nome) return { ok: false, error: "Dê um nome ao campeonato." };
  if (!input.dataInicio || !input.dataFim) {
    return { ok: false, error: "Informe as datas de início e fim." };
  }
  if (input.dataFim < input.dataInicio) {
    return { ok: false, error: "A data de fim não pode ser antes do início." };
  }
  if (!input.cidade?.trim() || !input.estado?.trim()) {
    return { ok: false, error: "Informe a cidade e o estado." };
  }

  const status =
    input.status === "em_andamento" || input.status === "encerrado"
      ? input.status
      : "inscricoes_abertas";

  return {
    ok: true,
    campos: { nome, status, cidade: input.cidade.trim(), estado: input.estado.trim().toUpperCase().slice(0, 2) },
  };
}

// Cria um campeonato "vitrine" — só informativo, sem categoria/quiz/PIX.
// O organizador é o próprio admin (precisa de um auth.users válido pela FK),
// mas a página pública não mostra inscrição porque is_vitrine = true.
export async function criarCampeonatoVitrine(
  input: CriarVitrineInput,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const user = await getAdminUser();
  if (!user) return { ok: false, error: "Sem permissão." };

  const validado = validarCampos(input);
  if (!validado.ok) return { ok: false, error: validado.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("championships")
    .insert({
      organizador_id: user.id,
      nome: validado.campos.nome,
      descricao: input.descricao?.trim() ?? "",
      regulamento: input.regulamento?.trim() ?? "",
      data_inicio: input.dataInicio,
      data_fim: input.dataFim,
      cidade: validado.campos.cidade,
      estado: validado.campos.estado,
      local: input.local?.trim() ?? "",
      banner_url: input.bannerUrl?.trim() || null,
      banner_position_x: input.bannerUrl ? clampPercent(input.bannerPositionX) : null,
      banner_position_y: input.bannerUrl ? clampPercent(input.bannerPositionY) : null,
      status: validado.campos.status,
      is_vitrine: true,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Não foi possível criar o campeonato." };
  }

  revalidatePath("/");
  revalidatePath("/campeonatos");
  revalidatePath("/admin/campeonatos");
  return { ok: true, id: data.id };
}

// Atualiza um campeonato "vitrine" existente. Só mexe em linhas com
// is_vitrine = true — nunca em campeonatos reais de organizador (esses têm
// categoria/preço/inscrição e são editados pelo próprio painel dele).
export async function atualizarCampeonatoVitrine(
  input: AtualizarVitrineInput,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getAdminUser();
  if (!user) return { ok: false, error: "Sem permissão." };
  if (!input.id) return { ok: false, error: "Campeonato não informado." };

  const validado = validarCampos(input);
  if (!validado.ok) return { ok: false, error: validado.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("championships")
    .update({
      nome: validado.campos.nome,
      descricao: input.descricao?.trim() ?? "",
      regulamento: input.regulamento?.trim() ?? "",
      data_inicio: input.dataInicio,
      data_fim: input.dataFim,
      cidade: validado.campos.cidade,
      estado: validado.campos.estado,
      local: input.local?.trim() ?? "",
      banner_url: input.bannerUrl?.trim() || null,
      banner_position_x: input.bannerUrl ? clampPercent(input.bannerPositionX) : null,
      banner_position_y: input.bannerUrl ? clampPercent(input.bannerPositionY) : null,
      status: validado.campos.status,
    })
    .eq("id", input.id)
    .eq("is_vitrine", true)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Campeonato vitrine não encontrado." };

  revalidatePath("/");
  revalidatePath("/campeonatos");
  revalidatePath(`/campeonatos/${input.id}`);
  revalidatePath("/admin/campeonatos");
  return { ok: true };
}
