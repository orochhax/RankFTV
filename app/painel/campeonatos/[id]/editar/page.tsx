import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { EditarCampeonatoForm } from "@/components/painel/EditarCampeonatoForm";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const resolved = await getDbChampionshipById(id);
  if (!resolved || resolved.organizadorId !== user.id) notFound();
  const champId = resolved.id;

  const { data: champ } = await supabase
    .from("championships")
    .select(
      `
      id, nome, descricao, regulamento, regulamento_pdf_url,
      data_inicio, data_fim, hora_inicio, hora_fim,
      inscricoes_inicio, inscricoes_fim, inscricoes_hora_inicio,
      prevenda_inicio, prevenda_fim, prevenda_hora_inicio,
      banner_url,
      cidade, estado, local, live_url, status, organizador_id,
      usa_motor_categoria, permite_troca_dupla, troca_dupla_data_limite,
      championship_categories (
        id, nome, genero, valor_inscricao, max_duplas
      )
    `,
    )
    .eq("id", champId)
    .single();

  if (!champ) notFound();

  const c = champ as unknown as Record<string, unknown>;

  const initial = {
    nome: champ.nome,
    descricao: champ.descricao ?? "",
    regulamento: champ.regulamento ?? "",
    dataInicio: champ.data_inicio,
    dataFim: champ.data_fim,
    horaInicio: (c.hora_inicio as string | null) ?? "",
    horaFim: (c.hora_fim as string | null) ?? "",
    inscricoesInicio: champ.inscricoes_inicio ?? "",
    inscricoesFim: champ.inscricoes_fim ?? "",
    inscricoesHoraInicio: (c.inscricoes_hora_inicio as string | null) ?? "",
    prevendaInicio: (c.prevenda_inicio as string | null) ?? "",
    prevendaFim: (c.prevenda_fim as string | null) ?? "",
    prevendaHoraInicio: (c.prevenda_hora_inicio as string | null) ?? "",
    cidade: champ.cidade,
    estado: champ.estado,
    local: champ.local ?? "",
    liveUrl: (c.live_url as string | null) ?? "",
    status: champ.status as
      | "rascunho"
      | "inscricoes_abertas"
      | "em_andamento"
      | "encerrado",
    regulamentoPdfUrl: (c.regulamento_pdf_url as string | null) ?? null,
    usaMotorCategoria: (c.usa_motor_categoria as boolean | null) ?? true,
    permiteTrocaDupla: (c.permite_troca_dupla as boolean | null) ?? true,
    prazoLimiteTrocaDupla: (c.troca_dupla_data_limite as string | null)
      ? new Date(c.troca_dupla_data_limite as string).toISOString().slice(0, 16)
      : "",
    categorias: (
      (champ.championship_categories as unknown as Array<{
        id: string;
        nome: string;
        genero: string;
        valor_inscricao: number;
        max_duplas: number | null;
      }>) ?? []
    ).map((cat) => ({
      id: cat.id,
      nome: cat.nome,
      genero: cat.genero as GeneroCategoria,
      valorInscricao: cat.valor_inscricao,
      maxDuplas: cat.max_duplas ?? undefined,
    })),
  };

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader
        title="Editar campeonato"
        description="Ajuste informações gerais, banner oficial, calendário, categorias e regras em abas organizadas."
      />

      <EditarCampeonatoForm
        champId={champId}
        initialBannerUrl={(c.banner_url as string | null) ?? null}
        initial={initial}
      />
    </PageContainer>
  );
}
