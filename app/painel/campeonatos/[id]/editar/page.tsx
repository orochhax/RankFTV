import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditarCampeonatoForm } from "@/components/painel/EditarCampeonatoForm";
import { ExcluirCampeonatoButton } from "@/components/painel/ExcluirCampeonatoButton";
import { ChampBannerForm } from "@/components/painel/ChampBannerForm";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
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
      cidade, estado, local, live_url, status, organizador_id,
      usa_motor_categoria,
      championship_categories (
        id, nome, genero, valor_inscricao, max_duplas
      )
    `)
    .eq("id", id)
    .single();

  if (!champ) notFound();
  if (champ.organizador_id !== user.id) notFound();

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
    cidade:           champ.cidade,
    estado:           champ.estado,
    local:            champ.local ?? "",
    liveUrl:          (c.live_url  as string | null) ?? "",
    status:              champ.status as "rascunho" | "inscricoes_abertas" | "em_andamento" | "encerrado",
    regulamentoPdfUrl:   (c.regulamento_pdf_url as string | null) ?? null,
    usaMotorCategoria:   (c.usa_motor_categoria as boolean | null) ?? true,
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
    <PageContainer width="form" className="space-y-8 py-8">
      <PageHeader title="Editar campeonato" />

      <div className="space-y-2">
        <p className="text-sm font-semibold text-ink">Banner do campeonato</p>
        <ChampBannerForm
          champId={id}
          initialBannerUrl={(c.banner_url as string | null) ?? null}
          bannerFrom="from-blue-500"
          bannerTo="to-cyan-400"
        />
      </div>

      <EditarCampeonatoForm champId={id} initial={initial} />

      {/* Zona de exclusão */}
      <div className="rounded-card-lg border border-danger/20 bg-danger-bg p-5">
        <h3 className="mb-1 text-sm font-semibold text-danger">Zona de perigo</h3>
        <p className="mb-4 text-xs text-danger/80">
          Excluir apaga o campeonato permanentemente — inscrições, chaveamento e resultados
          não poderão mais ser acessados pelos atletas.
        </p>
        <ExcluirCampeonatoButton champId={id} champNome={champ.nome} />
      </div>
    </PageContainer>
  );
}
