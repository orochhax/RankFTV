import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyPages } from "@/lib/supabase/pages";
import { EditarCampeonatoForm } from "@/components/painel/EditarCampeonatoForm";
import { ExcluirCampeonatoButton } from "@/components/painel/ExcluirCampeonatoButton";
import type { GeneroCategoria } from "@/lib/types";

export default async function EditarCampeonatoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: champ } = await supabase
    .from("championships")
    .select(`
      id, nome, descricao, regulamento, regulamento_pdf_url,
      data_inicio, data_fim,
      inscricoes_inicio, inscricoes_fim,
      prevenda_inicio, prevenda_fim,
      banner_url,
      cidade, estado, local, live_url, page_id, status, organizador_id,
      championship_categories (
        id, nome, genero, valor_inscricao, max_duplas
      )
    `)
    .eq("id", id)
    .single();

  if (!champ) notFound();
  if (champ.organizador_id !== user.id) notFound();

  const minhasPages = await getMyPages(user.id);

  const c = champ as unknown as Record<string, unknown>;

  const initial = {
    nome:             champ.nome,
    descricao:        champ.descricao ?? "",
    regulamento:      champ.regulamento ?? "",
    dataInicio:       champ.data_inicio,
    dataFim:          champ.data_fim,
    inscricoesInicio: champ.inscricoes_inicio ?? "",
    inscricoesFim:    champ.inscricoes_fim ?? "",
    prevendaInicio:   (c.prevenda_inicio as string | null) ?? "",
    prevendaFim:      (c.prevenda_fim    as string | null) ?? "",
    bannerUrl:        (c.banner_url      as string | null) ?? "",
    cidade:           champ.cidade,
    estado:           champ.estado,
    local:            champ.local ?? "",
    liveUrl:          (c.live_url  as string | null) ?? "",
    pageId:           (c.page_id   as string | null) ?? null,
    status:              champ.status as "rascunho" | "inscricoes_abertas" | "em_andamento" | "encerrado",
    regulamentoPdfUrl:   (c.regulamento_pdf_url as string | null) ?? null,
    categorias: ((champ.championship_categories as unknown as Array<{
      id: string; nome: string; genero: string;
      valor_inscricao: number; max_duplas: number | null;
    }>) ?? []).map((cat) => ({
      id:             cat.id,
      nome:           cat.nome,
      genero:         cat.genero as GeneroCategoria,
      valorInscricao: cat.valor_inscricao,
      maxDuplas:      cat.max_duplas ?? undefined,
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0f0f13] px-6 pb-14 pt-6">
        <div className="mx-auto max-w-2xl space-y-3">
          <Link
            href={`/painel/campeonatos/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {champ.nome}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Editar campeonato</h1>
        </div>
      </div>

      <div className="relative -mt-6 rounded-t-3xl bg-gray-50 px-6 pb-8 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl space-y-10">
          <EditarCampeonatoForm champId={id} initial={initial} minhasPages={minhasPages} />

          {/* Zona de exclusão */}
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5">
            <h3 className="mb-1 text-sm font-semibold text-red-700">Zona de perigo</h3>
            <p className="mb-4 text-xs text-red-600">
              Excluir apaga o campeonato permanentemente — inscrições, chaveamento e resultados
              não poderão mais ser acessados pelos atletas.
            </p>
            <ExcluirCampeonatoButton champId={id} champNome={champ.nome} />
          </div>
        </div>
      </div>
    </div>
  );
}
