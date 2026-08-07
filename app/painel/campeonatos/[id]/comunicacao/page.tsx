import { Megaphone } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ComunicacaoClient, type Recipient } from "@/components/painel/ComunicacaoClient";
import { EmptyState } from "@/components/shell/EmptyState";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";

export default async function ComunicacaoPage({
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

  const { data } = await supabase.rpc("organizer_championship_recipients", {
    p_championship_id: id,
    p_user_ids: null,
  });
  const recipients: Recipient[] = ((data ?? []) as Array<{
    user_id: string;
    nome: string;
    email: string;
    genero: "masculino" | "feminino" | "mista";
  }>)
    .map((recipient) => ({
      userId: recipient.user_id,
      nome: recipient.nome,
      email: recipient.email,
      genero: recipient.genero,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <PageContainer width="form" className="space-y-6 py-8">
      <PageHeader
        title="Comunicação"
        description="Envie um comunicado por notificação e e-mail para os atletas inscritos."
      />

      {recipients.length === 0 ? (
        <EmptyState icon={Megaphone} title="Nenhum atleta inscrito com pagamento confirmado ainda" />
      ) : (
        <ComunicacaoClient champId={id} recipients={recipients} />
      )}
    </PageContainer>
  );
}
