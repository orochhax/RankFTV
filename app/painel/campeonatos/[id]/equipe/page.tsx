import { notFound, redirect } from "next/navigation";
import { Users, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { EquipeClient, type StaffMember } from "@/components/painel/EquipeClient";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/shell/StatCard";

type StaffRow = {
  id: string;
  user_id: string;
  status: string;
  can_qrcode: boolean;
  can_inscricoes: boolean;
  can_chaveamento: boolean;
};

export default async function EquipePage({
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

  const { data: rawStaff } = await supabase
    .from("championship_staff")
    .select("id, user_id, status, can_qrcode, can_inscricoes, can_chaveamento")
    .eq("championship_id", id)
    .order("created_at");

  const staff: StaffRow[] = (rawStaff ?? []) as StaffRow[];

  // Busca perfis em batch
  const userIds = staff.map((s) => s.user_id);
  let profileMap: Record<string, { nome: string; username: string }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nome, username")
      .in("id", userIds);
    profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  }

  const members: StaffMember[] = staff.map((s) => ({
    id:             s.id,
    userId:         s.user_id,
    nome:           profileMap[s.user_id]?.nome     ?? "Atleta",
    username:       profileMap[s.user_id]?.username ?? "",
    status:         s.status as StaffMember["status"],
    canQrcode:      s.can_qrcode,
    canInscricoes:  s.can_inscricoes,
    canChaveamento: s.can_chaveamento,
  }));

  return (
    <PageContainer width="form" className="space-y-6 py-8">
      <PageHeader title="Equipe" description="Gerencie a equipe de staff deste campeonato." />

      <div className="grid grid-cols-2 gap-4 sm:max-w-xs">
        <StatCard label="Total" value={members.length} icon={Users} />
        <StatCard label="Ativos" value={members.filter((m) => m.status === "aceito").length} icon={UserCheck} tone="success" />
      </div>

      <EquipeClient champId={id} members={members} />
    </PageContainer>
  );
}
