import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { CuponsManager } from "@/components/painel/CuponsManager";
import { ComercialTabsHeader } from "@/components/painel/ComercialTabsHeader";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";

export default async function CuponsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const camp = await getDbChampionshipById(id);
  if (!camp) notFound();
  if (camp.organizadorId !== user.id) notFound();
  const champId = camp.id;

  const { data: cupons } = await supabase
    .from("coupons")
    .select("id, codigo, tipo_desconto, valor_desconto, aplica_em, quantidade_maxima, usos_atuais, data_fim, ativo")
    .eq("championship_id", champId)
    .order("created_at", { ascending: false });

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <ComercialTabsHeader champId={camp.slug ?? champId} active="cupons" />
      <PageHeader
        title="Cupons de desconto"
        description="Códigos que os compradores aplicam na inscrição de atleta ou no ingresso de plateia."
      />
      <CuponsManager champId={champId} cupons={cupons ?? []} />
    </PageContainer>
  );
}
