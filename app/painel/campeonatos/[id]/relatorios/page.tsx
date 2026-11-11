import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { PageContainer } from "@/components/shell/PageContainer";
import { loadChampionshipFinancialCockpitData } from "@/lib/financial-data-loader";
import { CentralFinanceiraClient } from "@/components/painel/CentralFinanceiraClient";

export default async function RelatoriosCampeonatoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/painel/campeonatos/${id}/relatorios`);

  const camp = await getDbChampionshipById(id);
  if (!camp || camp.organizadorId !== user.id) notFound();

  const data = await loadChampionshipFinancialCockpitData(camp, user.id, supabase);

  return (
    <PageContainer width="wide" className="py-8">
      <CentralFinanceiraClient {...data} initialTab="relatorios" />
    </PageContainer>
  );
}
