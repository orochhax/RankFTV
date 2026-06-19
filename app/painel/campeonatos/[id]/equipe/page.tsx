import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { EquipeClient, type StaffMember } from "@/components/painel/EquipeClient";

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
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link
            href={`/painel/campeonatos/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {camp.nome}
          </Link>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Equipe</h1>
            <p className="mt-1 text-sm text-white/40">
              Gerencie a equipe de staff deste campeonato
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs text-white/50">Total</p>
              <p className="mt-1 text-2xl font-bold text-white">{members.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs text-white/50">Ativos</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {members.filter((m) => m.status === "aceito").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl">
          <EquipeClient champId={id} members={members} />
        </div>
      </div>
    </div>
  );
}
