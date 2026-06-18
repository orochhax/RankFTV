import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EditarCampeonatoForm } from "@/components/painel/EditarCampeonatoForm";
import type { GeneroCategoria } from "@/lib/mock/types";

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
      cidade, estado, local, status, organizador_id,
      championship_categories (
        id, nome, genero, valor_inscricao, max_duplas
      )
    `)
    .eq("id", id)
    .single();

  if (!champ) notFound();
  if (champ.organizador_id !== user.id) notFound();

  const initial = {
    nome:             champ.nome,
    descricao:        champ.descricao ?? "",
    regulamento:      champ.regulamento ?? "",
    dataInicio:       champ.data_inicio,
    dataFim:          champ.data_fim,
    inscricoesInicio: champ.inscricoes_inicio ?? "",
    inscricoesFim:    champ.inscricoes_fim ?? "",
    cidade:           champ.cidade,
    estado:           champ.estado,
    local:            champ.local ?? "",
    status:              champ.status as "rascunho" | "inscricoes_abertas" | "em_andamento" | "encerrado",
    regulamentoPdfUrl:   (champ as unknown as { regulamento_pdf_url?: string | null }).regulamento_pdf_url ?? null,
    categorias: ((champ.championship_categories as unknown as Array<{
      id: string; nome: string; genero: string;
      valor_inscricao: number; max_duplas: number | null;
    }>) ?? []).map((c) => ({
      id:             c.id,
      nome:           c.nome,
      genero:         c.genero as GeneroCategoria,
      valorInscricao: c.valor_inscricao,
      maxDuplas:      c.max_duplas ?? undefined,
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
        <div className="mx-auto max-w-2xl">
          <EditarCampeonatoForm champId={id} initial={initial} />
        </div>
      </div>
    </div>
  );
}
