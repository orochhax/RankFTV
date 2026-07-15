import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LotesManager, type GrupoLote } from "@/components/painel/LotesManager";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";

export default async function LotesPage({
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
    .select("nome, organizador_id, inscricoes_fim")
    .eq("id", id)
    .maybeSingle();
  if (!champ) notFound();
  if (champ.organizador_id !== user.id) notFound();

  const [{ data: categorias }, { data: tipos }] = await Promise.all([
    supabase
      .from("championship_categories")
      .select("id, nome, genero, valor_inscricao")
      .eq("championship_id", id),
    supabase
      .from("spectator_ticket_types")
      .select("id, nome, valor")
      .eq("championship_id", id)
      .eq("ativo", true),
  ]);

  const categoriaIds = (categorias ?? []).map((c) => c.id);
  const tipoIds      = (tipos ?? []).map((t) => t.id);

  const [{ data: lotesCategoria }, { data: lotesTipo }] = await Promise.all([
    categoriaIds.length > 0
      ? supabase
          .from("pricing_tiers")
          .select("id, category_id, ticket_type_id, nome, valor, ordem, quantidade_maxima, vendidos, data_fim, ativo")
          .in("category_id", categoriaIds)
      : Promise.resolve({ data: [] as never[] }),
    tipoIds.length > 0
      ? supabase
          .from("pricing_tiers")
          .select("id, category_id, ticket_type_id, nome, valor, ordem, quantidade_maxima, vendidos, data_fim, ativo")
          .in("ticket_type_id", tipoIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const lotes = [...(lotesCategoria ?? []), ...(lotesTipo ?? [])];

  const lotesPorCategoria = new Map<string, typeof lotes>();
  const lotesPorTipo = new Map<string, typeof lotes>();
  for (const l of lotes ?? []) {
    if (l.category_id) {
      if (!lotesPorCategoria.has(l.category_id)) lotesPorCategoria.set(l.category_id, []);
      lotesPorCategoria.get(l.category_id)!.push(l);
    } else if (l.ticket_type_id) {
      if (!lotesPorTipo.has(l.ticket_type_id)) lotesPorTipo.set(l.ticket_type_id, []);
      lotesPorTipo.get(l.ticket_type_id)!.push(l);
    }
  }

  const grupos: GrupoLote[] = [
    ...(categorias ?? []).map((c) => ({
      entidade:   "category" as const,
      entidadeId: c.id,
      label:      `Categoria ${c.nome}`,
      valorBase:  Number(c.valor_inscricao),
      lotes:      lotesPorCategoria.get(c.id) ?? [],
    })),
    ...(tipos ?? []).map((t) => ({
      entidade:   "ticket_type" as const,
      entidadeId: t.id,
      label:      `Plateia — ${t.nome}`,
      valorBase:  Number(t.valor),
      lotes:      lotesPorTipo.get(t.id) ?? [],
    })),
  ];

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader
        title="Lotes / preço escalonado"
        description="Configure preços que sobem por data ou por quantidade vendida, pra categoria de atleta e pra ingresso de plateia."
      />
      <LotesManager champId={id} grupos={grupos} inscricoesFim={champ.inscricoes_fim} />
    </PageContainer>
  );
}
