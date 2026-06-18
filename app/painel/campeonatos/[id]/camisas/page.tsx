import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Shirt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { CamisasClient } from "@/components/camisas/CamisasClient";

/* ─── tipos exportados para o client ─── */

export type AthleteShirt = {
  athleteId: string;
  nome:      string;
  tamanho:   string | null;
  produced:  boolean;
};

/* ─── page ─── */

export default async function CamisasPage({
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

  /* ── inscrições pagas ── */
  const { data: rawRegs } = await supabase
    .from("registrations")
    .select("teams(atleta1_id, atleta2_id)")
    .eq("championship_id", id)
    .eq("status_pagamento", "pago");

  /* ── IDs únicos de atletas ── */
  const athleteIdSet = new Set<string>();
  for (const reg of rawRegs ?? []) {
    const team = reg.teams as unknown as { atleta1_id: string; atleta2_id: string | null } | null;
    if (!team) continue;
    athleteIdSet.add(team.atleta1_id);
    if (team.atleta2_id) athleteIdSet.add(team.atleta2_id);
  }
  const athleteIds = Array.from(athleteIdSet);

  /* ── perfis (nome + tamanho_camisa) ── */
  type ProfileRow = { id: string; nome: string; tamanho_camisa: string | null };
  let profileMap: Record<string, ProfileRow> = {};
  if (athleteIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nome, tamanho_camisa")
      .in("id", athleteIds);
    profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p as ProfileRow]));
  }

  /* ── status de produção ── */
  const { data: prodRows } = await supabase
    .from("shirt_production")
    .select("athlete_id, produced")
    .eq("championship_id", id);
  const producedMap = Object.fromEntries(
    (prodRows ?? []).map((r) => [r.athlete_id, r.produced as boolean]),
  );

  /* ── monta lista ── */
  const athletes: AthleteShirt[] = athleteIds
    .map((aid) => ({
      athleteId: aid,
      nome:      profileMap[aid]?.nome ?? "Atleta",
      tamanho:   profileMap[aid]?.tamanho_camisa ?? null,
      produced:  producedMap[aid] ?? false,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const totalProduced = athletes.filter((a) => a.produced).length;
  const semTamanho    = athletes.filter((a) => !a.tamanho).length;

  return (
    <div className="min-h-screen">

      {/* ── cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <Link
            href={`/painel/campeonatos/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {camp.nome}
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-white">Camisas / Kit</h1>

          {athletes.length === 0 ? (
            <p className="text-sm text-white/40">Nenhum inscrito confirmado ainda.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/50">Total de atletas</p>
                <p className="mt-1 text-2xl font-bold text-white">{athletes.length}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/50">Prontas</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {totalProduced}
                  <span className="ml-1 text-sm font-normal text-white/40">/ {athletes.length}</span>
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/50">Sem tamanho</p>
                <p className={`mt-1 text-2xl font-bold ${semTamanho > 0 ? "text-amber-400" : "text-white"}`}>
                  {semTamanho}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-4xl">
          {athletes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
                <Shirt className="size-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-600">Nenhum inscrito confirmado</p>
              <p className="max-w-xs text-xs text-gray-400">
                A lista de camisas aparece assim que as primeiras inscrições forem confirmadas.
              </p>
              <Link
                href={`/painel/campeonatos/${id}/inscricoes`}
                className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Ver inscrições →
              </Link>
            </div>
          ) : (
            <CamisasClient champId={id} campNome={camp.nome} athletes={athletes} />
          )}
        </div>
      </div>
    </div>
  );
}
