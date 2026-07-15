import { notFound, redirect } from "next/navigation";
import { Shirt, Users, CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { CamisasClient } from "@/components/camisas/CamisasClient";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/shell/StatCard";
import { EmptyState } from "@/components/shell/EmptyState";

/* ─── tipos exportados para o client ─── */

export type AthleteShirt = {
  athleteId:    string;
  nome:         string;
  tamanho:      string | null;
  produced:     boolean;
  retiradoPor:  string | null;
  dataRetirada: string | null;
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

  /* ── status de produção e entrega ── */
  const { data: prodRows } = await supabase
    .from("shirt_production")
    .select("athlete_id, produced, retirado_por, data_retirada")
    .eq("championship_id", id);

  const prodMap = Object.fromEntries(
    (prodRows ?? []).map((r) => [
      r.athlete_id,
      {
        produced:     r.produced     as boolean,
        retiradoPor:  r.retirado_por  as string | null,
        dataRetirada: r.data_retirada as string | null,
      },
    ]),
  );

  /* ── monta lista ── */
  const athletes: AthleteShirt[] = athleteIds
    .map((aid) => ({
      athleteId:    aid,
      nome:         profileMap[aid]?.nome ?? "Atleta",
      tamanho:      profileMap[aid]?.tamanho_camisa ?? null,
      produced:     prodMap[aid]?.produced     ?? false,
      retiradoPor:  prodMap[aid]?.retiradoPor  ?? null,
      dataRetirada: prodMap[aid]?.dataRetirada ?? null,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const totalProduced = athletes.filter((a) => a.produced).length;
  const semTamanho    = athletes.filter((a) => !a.tamanho).length;

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader title="Camisas / Kit" description="Painel de produção e entrega por tamanho." />

      {athletes.length > 0 && (
        <div className="grid grid-cols-3 gap-4 sm:max-w-xl">
          <StatCard label="Total de atletas" value={athletes.length} icon={Users} />
          <StatCard label="Prontas" value={`${totalProduced} / ${athletes.length}`} icon={CheckCircle2} tone="success" />
          <StatCard label="Sem tamanho" value={semTamanho} icon={AlertTriangle} tone={semTamanho > 0 ? "warning" : "default"} />
        </div>
      )}

      {athletes.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title="Nenhum inscrito confirmado"
          description="A lista de camisas aparece assim que as primeiras inscrições forem confirmadas."
          actionLabel="Ver inscrições"
          actionHref={`/painel/campeonatos/${id}/inscricoes`}
        />
      ) : (
        <CamisasClient champId={id} campNome={camp.nome} athletes={athletes} />
      )}
    </PageContainer>
  );
}
