"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GeneroCategoria } from "@/lib/types";
import { resolverFaixaRating } from "@/lib/motor-categoria";
import { categoryLevelRecommendationEnabled } from "@/lib/release-flags";
import { buildChampionshipChangeNotice } from "@/lib/championship-notices-core";
import {
  prepareChampionshipNoticeRecipients,
  processPendingChampionshipNoticeDeliveries,
} from "@/lib/championship-notices";
import { championshipIdSchema, championshipUpdateSchema } from "@/lib/championship-update-schema";

export async function atualizarBannerCampeonato(
  champId: string,
  bannerUrl: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: champ } = await supabase
    .from("championships").select("organizador_id").eq("id", champId).single();
  if (!champ || champ.organizador_id !== user.id)
    return { ok: false, error: "Sem permissão." };

  const { error } = await supabase
    .from("championships")
    .update({ banner_url: bannerUrl })
    .eq("id", champId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/painel/campeonatos/${champId}`);
  revalidatePath(`/painel/campeonatos/${champId}/editar`);
  revalidatePath(`/campeonatos/${champId}`);
  revalidatePath("/campeonatos");
  return { ok: true };
}

export async function excluirCampeonato(
  champId: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsedChampId = championshipIdSchema.safeParse(champId);
  if (!parsedChampId.success) {
    return { ok: false, error: "Campeonato inválido." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { error: deleteError } = await supabase.rpc("delete_championship_transaction", {
    p_championship_id: parsedChampId.data,
  });
  if (deleteError) {
    if (deleteError.message.includes("CHAMPIONSHIP_HAS_PURCHASE_HISTORY")) {
      return {
        ok: false,
        error: "Este campeonato possui inscrição ou compra iniciada e não pode ser apagado. Preserve o histórico e trate cancelamentos ou reembolsos pelo fluxo correto.",
      };
    }
    if (deleteError.code === "42501") {
      return { ok: false, error: "Sem permissão para excluir este campeonato." };
    }
    return { ok: false, error: "Não foi possível excluir o campeonato. Nenhum dado foi apagado." };
  }

  revalidatePath("/campeonatos");
  revalidatePath("/painel");
  redirect("/painel");
}

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
  prevendaInicio?: string;
  prevendaFim?: string;
  cidade: string;
  estado: string;
  local: string;
  liveUrl?: string | null;
  status: "rascunho" | "inscricoes_abertas" | "em_andamento" | "encerrado";
  usaMotorCategoria: boolean;
  categorias: CategoriaEditInput[];
};

export async function updateChampionship(
  champId: string,
  rawInput: UpdateChampionshipInput,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = championshipUpdateSchema.safeParse({ champId, input: rawInput });
  if (!parsed.success) {
    return { ok: false, error: "Os dados do campeonato são inválidos. Revise os campos e tente novamente." };
  }
  const input = parsed.data.input;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  // Confirma que o usuário é o organizador
  const { data: champ } = await supabase
    .from("championships")
    .select("organizador_id, nome, data_inicio, data_fim, cidade, estado, local")
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
  if (!input.inscricoesInicio || !input.inscricoesFim)
    return { ok: false, error: "Informe a abertura e o encerramento das inscrições." };
  if (input.inscricoesFim < input.inscricoesInicio)
    return { ok: false, error: "O encerramento das inscrições não pode ser antes da abertura." };
  if ((input.prevendaInicio && !input.prevendaFim) || (!input.prevendaInicio && input.prevendaFim))
    return { ok: false, error: "Preencha as duas datas da pré-venda, ou deixe as duas em branco." };
  if (input.prevendaInicio && input.prevendaFim && input.prevendaFim < input.prevendaInicio)
    return { ok: false, error: "A data de fim da pré-venda não pode ser antes do início." };
  if (!input.cidade?.trim() || !input.estado?.trim())
    return { ok: false, error: "Informe a cidade e o estado." };

  const categorias = (input.categorias ?? []).filter((c) => c.nome?.trim());
  const ativas = categorias.filter((c) => !c._delete);
  if (ativas.length === 0)
    return { ok: false, error: "Adicione pelo menos uma categoria." };

  const toDelete = categorias.filter((c) => c._delete && c.id);
  const toUpdate = categorias.filter((c) => !c._delete && c.id);
  const toInsert = categorias.filter((c) => !c._delete && !c.id);

  const changeNotice = buildChampionshipChangeNotice(
    { dataInicio: champ.data_inicio, dataFim: champ.data_fim, cidade: champ.cidade, estado: champ.estado, local: champ.local },
    { dataInicio: input.dataInicio, dataFim: input.dataFim, cidade: input.cidade.trim(), estado: input.estado.trim().toUpperCase().slice(0, 2), local: input.local?.trim() ?? "" },
    randomUUID(),
  );
  let preparedNotice = { deliveries: [], notificationUserIds: [] } as Awaited<
    ReturnType<typeof prepareChampionshipNoticeRecipients>
  >;
  if (changeNotice) {
    const { data: recipients, error: recipientsError } = await supabase.rpc(
      "organizer_championship_recipients",
      { p_championship_id: champId, p_user_ids: null },
    );
    if (recipientsError) {
      return { ok: false, error: "Não foi possível identificar os atletas que precisam receber o aviso. Nenhuma alteração foi aplicada." };
    }
    try {
      preparedNotice = await prepareChampionshipNoticeRecipients({
        championshipId: champId,
        authenticatedRecipients: ((recipients ?? []) as Array<{ user_id: string; email: string; nome: string }>).map(
          (recipient) => ({ userId: recipient.user_id, email: recipient.email, nome: recipient.nome }),
        ),
      });
    } catch {
      return { ok: false, error: "Não foi possível preparar os avisos aos atletas. Nenhuma alteração foi aplicada." };
    }
  }

  const categoryOperations = [
    ...toDelete.map((category) => ({ operation: "delete", id: category.id })),
    ...toUpdate.map((category) => {
      const faixa = resolverFaixaRating(category.nome);
      return {
        operation: "update",
        id: category.id,
        nome: category.nome.trim(),
        genero: category.genero,
        valor_inscricao: Math.max(0, Math.round(Number(category.valorInscricao) || 0)),
        max_duplas: category.maxDuplas && category.maxDuplas > 0 ? category.maxDuplas : null,
        corte_rating_min: faixa?.min ?? 0,
        corte_rating_max: faixa?.max ?? 9999,
      };
    }),
    ...toInsert.map((category) => {
      const faixa = resolverFaixaRating(category.nome);
      return {
        operation: "insert",
        nome: category.nome.trim(),
        genero: category.genero,
        valor_inscricao: Math.max(0, Math.round(Number(category.valorInscricao) || 0)),
        max_duplas: category.maxDuplas && category.maxDuplas > 0 ? category.maxDuplas : null,
        corte_rating_min: faixa?.min ?? 0,
        corte_rating_max: faixa?.max ?? 9999,
      };
    }),
  ];

  const { data: noticeId, error: transactionError } = await supabase.rpc(
    "update_championship_transaction",
    {
      p_championship_id: champId,
      p_championship: {
        nome,
        descricao: input.descricao?.trim() ?? "",
        regulamento: input.regulamento?.trim() ?? "",
        regulamento_pdf_url: input.regulamentoPdfUrl ?? null,
        data_inicio: input.dataInicio,
        data_fim: input.dataFim,
        inscricoes_inicio: input.inscricoesInicio || null,
        inscricoes_fim: input.inscricoesFim || null,
        prevenda_inicio: input.prevendaInicio || null,
        prevenda_fim: input.prevendaFim || null,
        cidade: input.cidade.trim(),
        estado: input.estado.trim().toUpperCase().slice(0, 2),
        local: input.local?.trim() ?? "",
        live_url: input.liveUrl?.trim() || null,
        status: input.status,
        usa_motor_categoria: categoryLevelRecommendationEnabled(input.usaMotorCategoria),
      },
      p_category_operations: categoryOperations,
      p_notice: changeNotice
        ? {
            kind: changeNotice.kind,
            title: changeNotice.title,
            message: changeNotice.message,
            dedupe_key: changeNotice.dedupeKey,
          }
        : null,
      p_deliveries: preparedNotice.deliveries,
      p_notification_user_ids: preparedNotice.notificationUserIds,
    },
  );

  if (transactionError) {
    if (
      transactionError.code === "23503"
      || transactionError.message.includes("CATEGORY_HAS_DEPENDENCIES")
      || transactionError.message.includes("championship_categories_has_history")
    ) {
      return {
        ok: false,
        error: "Essa categoria possui inscrições ou chaveamento e não pode ser excluída. A exclusão não cancela compras nem gera reembolso.",
      };
    }
    if (transactionError.message.includes("CATEGORY_WRITE_FAILED")) {
      return { ok: false, error: "Uma categoria mudou enquanto você editava. Atualize a página e tente novamente. Nenhuma alteração foi aplicada." };
    }
    return { ok: false, error: "Não foi possível salvar o campeonato. Nenhuma alteração foi aplicada." };
  }

  if (noticeId) {
    await processPendingChampionshipNoticeDeliveries({ noticeId, limit: 50 });
  }

  revalidatePath(`/painel/campeonatos/${champId}`);
  revalidatePath(`/campeonatos/${champId}`);
  revalidatePath("/campeonatos");
  redirect(`/painel/campeonatos/${champId}`);
}
