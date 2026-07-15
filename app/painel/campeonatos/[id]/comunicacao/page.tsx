import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ComunicacaoClient, type Recipient } from "@/components/painel/ComunicacaoClient";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { Megaphone } from "lucide-react";

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

  // Busca todas as inscrições pagas com dupla e categoria
  const { data: regs } = await supabase
    .from("registrations")
    .select(`
      teams(
        atleta1_id,
        atleta2_id,
        championship_categories(genero)
      )
    `)
    .eq("championship_id", id)
    .eq("status_pagamento", "pago");

  // Coleta IDs únicos de atletas
  type TeamRow = {
    atleta1_id: string;
    atleta2_id: string;
    championship_categories: { genero: string } | null;
  };

  const atletaGeneroMap: Record<string, "masculino" | "feminino" | "mista"> = {};
  for (const reg of regs ?? []) {
    const team = reg.teams as unknown as TeamRow | null;
    if (!team) continue;
    const genero = (team.championship_categories?.genero ?? "mista") as "masculino" | "feminino" | "mista";
    atletaGeneroMap[team.atleta1_id] = genero;
    atletaGeneroMap[team.atleta2_id] = genero;
  }

  const atletaIds = Object.keys(atletaGeneroMap);

  let recipients: Recipient[] = [];
  if (atletaIds.length > 0) {
    // Busca perfis (nome) e emails (via admin)
    const admin = createAdminClient();
    const [profilesRes, { data: { users: allAuthUsers } }] = await Promise.all([
      supabase.from("profiles").select("id, nome").in("id", atletaIds),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    const profileMap = Object.fromEntries(
      (profilesRes.data ?? []).map((p) => [p.id, p.nome as string]),
    );
    const emailMap = Object.fromEntries(
      allAuthUsers
        .filter((u) => atletaIds.includes(u.id))
        .map((u) => [u.id, u.email ?? ""]),
    );

    recipients = atletaIds
      .filter((uid) => emailMap[uid])
      .map((uid) => ({
        userId: uid,
        nome: profileMap[uid] ?? "Atleta",
        email: emailMap[uid],
        genero: atletaGeneroMap[uid],
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  return (
    <PageContainer width="form" className="space-y-6 py-8">
      <PageHeader title="Comunicação" description="Envie um comunicado por notificação e e-mail para os atletas inscritos." />

      {recipients.length === 0 ? (
        <EmptyState icon={Megaphone} title="Nenhum atleta inscrito com pagamento confirmado ainda" />
      ) : (
        <ComunicacaoClient champId={id} recipients={recipients} />
      )}
    </PageContainer>
  );
}
