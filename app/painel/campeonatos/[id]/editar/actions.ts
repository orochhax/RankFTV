"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GeneroCategoria } from "@/lib/mock/types";

export type CategoriaEditInput = {
  id?: string; // existe → update; undefined → insert
  nome: string;
  genero: GeneroCategoria;
  valorInscricao: number;
  maxDuplas?: number;
  _delete?: boolean; // true → deletar categoria existente
};

export type UpdateChampionshipInput = {
  nome: string;
  descricao: string;
  regulamento: string;
  regulamentoPdfUrl?: string | null;
  dataInicio: string;
  dataFim: string;
  inscricoesInicio?: string;
  inscricoesFim?: string;
  cidade: string;
  estado: string;
  local: string;
  status: "rascunho" | "inscricoes_abertas" | "em_andamento" | "encerrado";
  categorias: CategoriaEditInput[];
};

export async function updateChampionship(
  champId: string,
  input: UpdateChampionshipInput,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  // Confirma que o usuário é o organizador
  const { data: champ } = await supabase
    .from("championships")
    .select("organizador_id")
    .eq("id", champId)
    .single();
  if (!champ || champ.organizador_id !== user.id)
    return { ok: false, error: "Sem permissão." };

  const nome = input.nome?.trim();
  if (!nome) return { ok: false, error: "Dê um nome ao campeonato." };
  if (!input.dataInicio || !input.dataFim)
    return { ok: false, error: "Informe as datas de início e fim." };
  if (input.dataFim < input.dataInicio)
    return { ok: false, error: "A data de fim não pode ser antes do início." };
  if (!input.cidade?.trim() || !input.estado?.trim())
    return { ok: false, error: "Informe a cidade e o estado." };

  const categorias = (input.categorias ?? []).filter((c) => c.nome?.trim());
  const ativas = categorias.filter((c) => !c._delete);
  if (ativas.length === 0)
    return { ok: false, error: "Adicione pelo menos uma categoria." };

  // Atualiza dados principais
  const { error: champErr } = await supabase
    .from("championships")
    .update({
      nome,
      descricao:            input.descricao?.trim() ?? "",
      regulamento:          input.regulamento?.trim() ?? "",
      regulamento_pdf_url:  input.regulamentoPdfUrl ?? null,
      data_inicio:          input.dataInicio,
      data_fim:          input.dataFim,
      inscricoes_inicio: input.inscricoesInicio || null,
      inscricoes_fim:    input.inscricoesFim    || null,
      cidade:            input.cidade.trim(),
      estado:            input.estado.trim().toUpperCase().slice(0, 2),
      local:             input.local?.trim() ?? "",
      status:            input.status,
    })
    .eq("id", champId);

  if (champErr) return { ok: false, error: "Erro ao atualizar campeonato." };

  // Categorias: delete, update, insert
  const toDelete = categorias.filter((c) => c._delete && c.id);
  const toUpdate = categorias.filter((c) => !c._delete && c.id);
  const toInsert = categorias.filter((c) => !c._delete && !c.id);

  if (toDelete.length > 0) {
    await supabase
      .from("championship_categories")
      .delete()
      .in("id", toDelete.map((c) => c.id!));
  }

  for (const cat of toUpdate) {
    await supabase
      .from("championship_categories")
      .update({
        nome:             cat.nome.trim(),
        genero:           cat.genero,
        valor_inscricao:  Math.max(0, Math.round(Number(cat.valorInscricao) || 0)),
        max_duplas:       cat.maxDuplas && cat.maxDuplas > 0 ? cat.maxDuplas : null,
      })
      .eq("id", cat.id!);
  }

  if (toInsert.length > 0) {
    await supabase.from("championship_categories").insert(
      toInsert.map((c) => ({
        championship_id:  champId,
        nome:             c.nome.trim(),
        genero:           c.genero,
        valor_inscricao:  Math.max(0, Math.round(Number(c.valorInscricao) || 0)),
        corte_rating_min: 0,
        corte_rating_max: 9999,
        max_duplas:       c.maxDuplas && c.maxDuplas > 0 ? c.maxDuplas : null,
      })),
    );
  }

  revalidatePath(`/painel/campeonatos/${champId}`);
  revalidatePath(`/campeonatos/${champId}`);
  revalidatePath("/campeonatos");
  redirect(`/painel/campeonatos/${champId}`);
}
