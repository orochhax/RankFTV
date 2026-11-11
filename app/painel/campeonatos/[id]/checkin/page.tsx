import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Users, UserCheck, UserRoundCheck, UserX, Armchair } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CheckinClient } from "@/components/checkin/CheckinClient";
import { PresenceItem } from "@/components/checkin/PresenceItem";
import { PairPresenceItem } from "@/components/checkin/PairPresenceItem";
import { CheckinTabs, AthleteFilters } from "@/components/checkin/CheckinFilters";
import { PlateiaCheckin, type CheckinItem } from "@/components/plateia/PlateiaCheckin";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { SectionHeader } from "@/components/shell/SectionHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { Surface } from "@/components/shell/Surface";
import { getCheckinDirectory, type CheckinDirectoryItem } from "@/lib/checkin-directory";

const PAGE_SIZE = 50;

function filterAthletes(
  items: CheckinDirectoryItem[],
  filtro: string,
  cat: string,
  query: string,
): CheckinDirectoryItem[] {
  return items.filter((item) => {
    if (cat !== "todas" && item.categoryId !== cat) return false;
    if (filtro === "confirmadas" && !item.members.every((m) => m.checkedIn)) return false;
    if (filtro === "pendentes" && !item.members.some((m) => !m.checkedIn)) return false;
    if (query) {
      const match = item.members.some((m) =>
        m.name.toLowerCase().includes(query) || m.username.toLowerCase().includes(query),
      );
      if (!match) return false;
    }
    return true;
  });
}

function checkinHref(championshipId: string, tab: string, filter: string, cat: string, query: string, page: number) {
  const params = new URLSearchParams();
  if (tab !== "atletas") params.set("tab", tab);
  if (filter !== "todos") params.set("filtro", filter);
  if (cat !== "todas") params.set("cat", cat);
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const qStr = params.toString();
  return `/painel/campeonatos/${championshipId}/checkin${qStr ? `?${qStr}` : ""}`;
}

export default async function CheckinPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    filtro?: string;
    cat?: string;
    page?: string;
    q?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const activeTab = query.tab === "plateia" ? "plateia" : "atletas";
  const filtro = query.filtro;
  const filtroAtivo =
    filtro === "confirmadas" ? "confirmadas" :
    filtro === "pendentes" ? "pendentes" :
    "todos";
  const catAtiva = query.cat ?? "todas";
  const search = String(query.q ?? "").trim().toLowerCase();
  const requestedPage = Number.parseInt(String(query.page ?? "1"), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const camp = await getDbChampionshipById(id);
  if (!camp) notFound();
  if (camp.organizadorId !== user.id) notFound();

  const [allList, spectatorRes] = await Promise.all([
    getCheckinDirectory(camp.id, user.id),
    supabase
      .from("spectator_tickets")
      .select("id, comprador_nome, tipo_nome, code, quantidade, checked_in")
      .eq("championship_id", camp.id)
      .eq("status_pagamento", "pago")
      .order("comprador_nome", { ascending: true })
      .limit(1000),
  ]);

  if (!allList) notFound();

  // Métricas Atletas
  const totalAtletas = allList.reduce((sum, item) => sum + item.members.length, 0);
  const confirmadosAtletas = allList.reduce(
    (sum, item) => sum + item.members.filter((member) => member.checkedIn).length,
    0,
  );
  const pendentesAtletas = totalAtletas - confirmadosAtletas;
  const duplas = allList.filter((item) => item.kind === "pair" && item.members.length === 2);
  const duplasConfirmadas = duplas.filter((item) => item.members.every((member) => member.checkedIn)).length;
  const duplasPendentes = duplas.length - duplasConfirmadas;

  // Métricas Plateia
  const spectatorTickets = (spectatorRes.data ?? []) as CheckinItem[];
  const totalPlateiaIngressos = spectatorTickets.reduce((sum, t) => sum + (Number(t.quantidade) || 1), 0);
  const plateiaPresentes = spectatorTickets
    .filter((t) => t.checked_in)
    .reduce((sum, t) => sum + (Number(t.quantidade) || 1), 0);
  const plateiaPendentes = totalPlateiaIngressos - plateiaPresentes;

  // Filtragem e paginação de Atletas
  const filteredAthletes = filterAthletes(allList, filtroAtivo, catAtiva, search);
  const filteredTotal = filteredAthletes.length;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  if (activeTab === "atletas" && page > totalPages) {
    redirect(checkinHref(id, activeTab, filtroAtivo, catAtiva, search, totalPages));
  }
  const listaAtletas = filteredAthletes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Filtragem de Plateia se tab=plateia
  const filteredSpectators = search
    ? spectatorTickets.filter(
        (t) =>
          t.comprador_nome.toLowerCase().includes(search) ||
          (t.code && t.code.toLowerCase().includes(search)),
      )
    : spectatorTickets;

  return (
    <PageContainer width="wide" className="space-y-6 pb-32 pt-8 lg:pb-8">
      <PageHeader
        title="Inscrições & Check-in"
        description="Central unificada de inscrições, credenciamento e controle de presença de atletas e plateia."
      />

      {/* Métricas unificadas em 3 colunas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricGroup
          title="Atletas"
          icon={Users}
          items={[
            { label: "Total de atletas", value: totalAtletas, tone: "text-brand-ink" },
            { label: "Atletas pendentes", value: pendentesAtletas, tone: pendentesAtletas > 0 ? "text-warning" : "text-ink" },
            { label: "Atletas confirmados", value: confirmadosAtletas, tone: "text-success" },
          ]}
        />
        <MetricGroup
          title="Duplas"
          icon={UserRoundCheck}
          items={[
            { label: "Duplas totais", value: duplas.length, tone: "text-brand-ink" },
            { label: "Duplas pendentes", value: duplasPendentes, tone: duplasPendentes > 0 ? "text-warning" : "text-ink" },
            { label: "Duplas confirmadas", value: duplasConfirmadas, tone: "text-success" },
          ]}
        />
        <MetricGroup
          title="Plateia & Camarotes"
          icon={Armchair}
          items={[
            { label: "Ingressos pagos", value: totalPlateiaIngressos, tone: "text-brand-ink" },
            { label: "Pendentes", value: plateiaPendentes, tone: plateiaPendentes > 0 ? "text-warning" : "text-ink" },
            { label: "Presentes", value: plateiaPresentes, tone: "text-success" },
          ]}
        />
      </div>

      {/* Mesa Split: Scanner QR fixo à esquerda + Credenciamento & Lista à direita */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4 lg:sticky lg:top-6">
          <Surface padding="md">
            <CheckinClient championshipId={id} />
          </Surface>
        </div>

        {/* Abas e Listagem Unificada */}
        <section className="min-w-0 space-y-4">
          <SectionHeader title="Lista de presença & Credenciamento" />

          <CheckinTabs
            championshipId={id}
            activeTab={activeTab}
            totalDuplas={duplas.length}
            totalPlateia={totalPlateiaIngressos}
          />

          {activeTab === "atletas" ? (
            <div className="space-y-4">
              <AthleteFilters
                championshipId={id}
                categories={camp.categorias.map((c) => ({ id: c.id, nome: c.nome }))}
                activeCategory={catAtiva}
                activeStatus={filtroAtivo}
                activeQuery={query.q ?? ""}
              />

              {totalAtletas === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Nenhuma credencial emitida ainda"
                  description="As credenciais de atletas são geradas após o pagamento da inscrição."
                  className="mt-3"
                />
              ) : listaAtletas.length === 0 ? (
                <EmptyState
                  icon={filtroAtivo === "confirmadas" ? UserCheck : UserX}
                  title={
                    filtroAtivo === "confirmadas"
                      ? "Nenhuma dupla confirmada para os filtros selecionados"
                      : search
                        ? "Nenhum atleta encontrado para essa busca"
                        : "Todos os atletas já estão confirmados!"
                  }
                  className="mt-3"
                />
              ) : (
                <Surface padding="none" className="overflow-hidden">
                  <ol className="divide-y divide-border">
                    {listaAtletas.map((item) => {
                      if (item.kind === "pair") {
                        return (
                          <PairPresenceItem
                            key={item.id}
                            members={item.members}
                            categoryName={item.categoryName}
                          />
                        );
                      }
                      const member = item.members[0];
                      if (!member) return null;
                      return member.checkedIn && member.checkinAt ? (
                        <PresenceItem
                          key={item.id}
                          nome={member.name}
                          username={member.username}
                          checkinAt={member.checkinAt}
                          scannerNome={member.scannerName}
                        />
                      ) : (
                        <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2">
                            <span className="text-xs font-bold text-ink-muted">?</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-ink">{member.name}</p>
                            {member.username && (
                              <p className="text-xs text-ink-muted">@{member.username}</p>
                            )}
                          </div>
                          <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-muted">
                            Pendente
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </Surface>
              )}

              {filteredTotal > 0 && totalPages > 1 && (
                <nav className="mt-4 flex items-center justify-between border-t border-border pt-4" aria-label="Paginação do check-in de atletas">
                  <span className="text-sm text-ink-muted">Página {page} de {totalPages} ({filteredTotal} duplas)</span>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={checkinHref(id, activeTab, filtroAtivo, catAtiva, search, page - 1)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-ink hover:bg-surface-2"
                      >
                        <ChevronLeft className="size-4" /> Anterior
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={checkinHref(id, activeTab, filtroAtivo, catAtiva, search, page + 1)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-ink hover:bg-surface-2"
                      >
                        Próxima <ChevronRight className="size-4" />
                      </Link>
                    )}
                  </div>
                </nav>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <PlateiaCheckin champId={id} itens={filteredSpectators} initialSearch={query.q ?? ""} />
            </div>
          )}
        </section>
      </div>
    </PageContainer>
  );
}

function MetricGroup({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{ label: string; value: number; tone: string }>;
}) {
  return (
    <Surface padding="none" className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Icon className="size-4" />
        </span>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border">
        {items.map((item) => (
          <div key={item.label} className="min-w-0 px-3 py-4 text-center sm:px-4">
            <p className={`text-2xl font-bold ${item.tone}`}>{item.value}</p>
            <p className="mt-1 text-[11px] leading-tight text-ink-muted sm:text-xs">{item.label}</p>
          </div>
        ))}
      </div>
    </Surface>
  );
}
