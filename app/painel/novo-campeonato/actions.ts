"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GeneroCategoria } from "@/lib/mock/types";

export type CategoriaInput = {
  nome: string;
  genero: GeneroCategoria;
  valorInscricao: number;
  maxDuplas?: number;
};

export type CreateChampionshipInput = {
  nome: string;
  descricao: string;
  regulamento: string;
  regulamentoPdfUrl?: string;
  dataInicio: string;
  dataFim: string;
  inscricoesInicio?: string;
  inscricoesFim?: string;
  cidade: string;
  estado: string;
  local: string;
  status: "rascunho" | "inscricoes_abertas";
  categorias: CategoriaInput[];
};

// Gradientes de banner — escolhe um aleatório por enquanto (upload de imagem
// real fica pra quando ligarmos o Storage).
const GRADIENTS: [string, string][] = [
  ["from-blue-500", "to-cyan-400"],
  ["from-emerald-500", "to-teal-400"],
  ["from-orange-500", "to-amber-400"],
  ["from-violet-500", "to-purple-400"],
  ["from-rose-500", "to-pink-400"],
  ["from-indigo-500", "to-blue-400"],
];

export async function createChampionship(
  input: CreateChampionshipInput,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Você precisa estar logado para criar um campeonato." };
  }

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

  const categorias = (input.categorias ?? []).filter((c) => c.nome?.trim());
  if (categorias.length === 0) {
    return { ok: false, error: "Adicione pelo menos uma categoria." };
  }

  const [bannerFrom, bannerTo] =
    GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];

  const { data: champ, error } = await supabase
    .from("championships")
    .insert({
      organizador_id: user.id,
      nome,
      descricao:            input.descricao?.trim() ?? "",
      regulamento:          input.regulamento?.trim() ?? "",
      regulamento_pdf_url:  input.regulamentoPdfUrl ?? null,
      data_inicio:          input.dataInicio,
      data_fim:             input.dataFim,
      inscricoes_inicio:    input.inscricoesInicio || null,
      inscricoes_fim:       input.inscricoesFim || null,
      cidade: input.cidade.trim(),
      estado: input.estado.trim().toUpperCase().slice(0, 2),
      local: input.local?.trim() ?? "",
      status: input.status === "inscricoes_abertas" ? "inscricoes_abertas" : "rascunho",
      banner_from: bannerFrom,
      banner_to: bannerTo,
    })
    .select("id")
    .single();

  if (error || !champ) {
    return { ok: false, error: "Não foi possível criar o campeonato. Tente de novo." };
  }

  const rows = categorias.map((c) => ({
    championship_id:  champ.id,
    nome:             c.nome.trim(),
    genero:           c.genero,
    valor_inscricao:  Math.max(0, Math.round(Number(c.valorInscricao) || 0)),
    corte_rating_min: 0,
    corte_rating_max: 9999,
    max_duplas:       c.maxDuplas && c.maxDuplas > 0 ? c.maxDuplas : null,
  }));

  const { error: catErr } = await supabase
    .from("championship_categories")
    .insert(rows);

  if (catErr) {
    // Evita campeonato órfão sem categorias se a segunda inserção falhar.
    await supabase.from("championships").delete().eq("id", champ.id);
    return { ok: false, error: "Não foi possível salvar as categorias. Tente de novo." };
  }

  revalidatePath("/painel");
  revalidatePath("/campeonatos");
  return { ok: true, id: champ.id };
}
