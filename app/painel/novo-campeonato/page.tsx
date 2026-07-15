import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NovoCampeonatoSection } from "@/components/painel/NovoCampeonatoSection";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";

export default async function NovoCampeonatoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fpainel%2Fnovo-campeonato");

  const { data: conta } = await supabase
    .from("organizer_accounts")
    .select("habilitado")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conta?.habilitado) redirect("/perfil/ativar-organizador?next=%2Fpainel%2Fnovo-campeonato");

  return (
    <PageContainer width="form" className="space-y-6 py-8">
      <PageHeader
        title="Criar campeonato"
        description="Escolha o que vai vender e preencha os dados. Dá pra salvar como rascunho e publicar depois."
      />
      <NovoCampeonatoSection />
    </PageContainer>
  );
}
