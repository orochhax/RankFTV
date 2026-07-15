import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CuponsManager } from "@/components/painel/CuponsManager";
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

  const { data: champ } = await supabase
    .from("championships")
    .select("nome, organizador_id")
    .eq("id", id)
    .maybeSingle();
  if (!champ) notFound();
  if (champ.organizador_id !== user.id) notFound();

  const { data: cupons } = await supabase
    .from("coupons")
    .select("id, codigo, tipo_desconto, valor_desconto, aplica_em, quantidade_maxima, usos_atuais, data_fim, ativo")
    .eq("championship_id", id)
    .order("created_at", { ascending: false });

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader
        title="Cupons de desconto"
        description="Códigos que os compradores aplicam na inscrição de atleta ou no ingresso de plateia."
      />
      <CuponsManager champId={id} cupons={cupons ?? []} />
    </PageContainer>
  );
}
