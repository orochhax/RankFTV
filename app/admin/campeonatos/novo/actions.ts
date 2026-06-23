"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  status: "inscricoes_abertas" | "em_andamento" | "encerrado";
};

async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null;
  return user;
}

// Cria um campeonato "vitrine" — só informativo, sem categoria/quiz/PIX.
// O organizador é o próprio admin (precisa de um auth.users válido pela FK),
// mas a página pública não mostra inscrição porque is_vitrine = true.
export async function criarCampeonatoVitrine(
  input: CriarVitrineInput,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const user = await getAdminUser();
  if (!user) return { ok: false, error: "Sem permissão." };

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

  const statusValido =
    input.status === "em_andamento" || input.status === "encerrado"
      ? input.status
      : "inscricoes_abertas";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("championships")
    .insert({
      organizador_id: user.id,
      nome,
      descricao: input.descricao?.trim() ?? "",
      regulamento: input.regulamento?.trim() ?? "",
      data_inicio: input.dataInicio,
      data_fim: input.dataFim,
      cidade: input.cidade.trim(),
      estado: input.estado.trim().toUpperCase().slice(0, 2),
      local: input.local?.trim() ?? "",
      banner_url: input.bannerUrl?.trim() || null,
      status: statusValido,
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
