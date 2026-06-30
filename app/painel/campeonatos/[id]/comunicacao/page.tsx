import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ComunicacaoClient, type Recipient } from "@/components/painel/ComunicacaoClient";
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

  if (atletaIds.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
          <div className="mx-auto max-w-2xl space-y-4">
            <Link href={`/painel/campeonatos/${id}`} className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors">
              <ArrowLeft className="size-4" /> {camp.nome}
            </Link>
            <div className="flex items-center gap-2">
              <Megaphone className="size-6 text-blue-400" />
              <h1 className="text-2xl font-bold tracking-tight text-white">Comunicação</h1>
            </div>
          </div>
        </div>
        <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
          <div className="mx-auto max-w-2xl py-12 text-center">
            <p className="text-sm text-gray-400">Nenhum atleta inscrito com pagamento confirmado ainda.</p>
          </div>
        </div>
      </div>
    );
  }

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

  const recipients: Recipient[] = atletaIds
    .filter((uid) => emailMap[uid])
    .map((uid) => ({
      userId: uid,
      nome: profileMap[uid] ?? "Atleta",
      email: emailMap[uid],
      genero: atletaGeneroMap[uid],
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link href={`/painel/campeonatos/${id}`} className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors">
            <ArrowLeft className="size-4" /> {camp.nome}
          </Link>
          <div className="flex items-center gap-2">
            <Megaphone className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Comunicação</h1>
          </div>
          <p className="text-sm text-white/40">
            Envie um comunicado por notificação e e-mail para os atletas inscritos.
          </p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl">
          <ComunicacaoClient champId={id} recipients={recipients} />
        </div>
      </div>
    </div>
  );
}
