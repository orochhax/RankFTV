import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NovoCampeonatoSection } from "@/components/painel/NovoCampeonatoSection";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";

export default async function NovoCampeonatoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fpainel%2Fnovo-campeonato");

  // Qualquer usuário logado pode criar um campeonato como rascunho sem atrito prévio.
  // A verificação de identidade (KYC) e chave Pix só são exigidas no painel do evento
  // ou antes de publicar categorias/ingressos pagos.

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
