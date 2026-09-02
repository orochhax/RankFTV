import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Users, UserCheck, UserRoundCheck, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CheckinClient } from "@/components/checkin/CheckinClient";
import { PresenceItem } from "@/components/checkin/PresenceItem";
import { PairPresenceItem } from "@/components/checkin/PairPresenceItem";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { SectionHeader } from "@/components/shell/SectionHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { Surface } from "@/components/shell/Surface";
import { getCheckinDirectory } from "@/lib/checkin-directory";

const PAGE_SIZE = 50;

function checkinHref(championshipId: string, filter: string, page: number) {
  const params = new URLSearchParams();
  if (filter !== "todos") params.set("filtro", filter);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/painel/campeonatos/${championshipId}/checkin${query ? `?${query}` : ""}`;
}

export default async function CheckinPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filtro?: string; page?: string }>;
}) {
  const { id } = await params;
  const { filtro, page: pageParam } = await searchParams;
  const filtroAtivo =
    filtro === "confirmadas" ? "confirmadas" :
    filtro === "pendentes" ? "pendentes" :
    "todos";
  const requestedPage = Number.parseInt(String(pageParam ?? "1"), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const camp = await getDbChampionshipById(id);
  if (!camp) notFound();
  if (camp.organizadorId !== user.id) notFound();

  const allList = await getCheckinDirectory(id, user.id);
  if (!allList) notFound();

  const total = allList.reduce((sum, item) => sum + item.members.length, 0);
  const confirmados = allList.reduce(
    (sum, item) => sum + item.members.filter((member) => member.checkedIn).length,
    0,
  );
  const pendentes = total - confirmados;
  const duplas = allList.filter((item) => item.kind === "pair" && item.members.length === 2);
  const duplasConfirmadas = duplas.filter((item) => item.members.every((member) => member.checkedIn)).length;
  const duplasPendentes = duplas.length - duplasConfirmadas;
  const filteredList =
    filtroAtivo === "confirmadas"
      ? allList.filter((item) => item.members.every((member) => member.checkedIn))
      : filtroAtivo === "pendentes"
        ? allList.filter((item) => item.members.some((member) => !member.checkedIn))
        : allList;
  const filteredTotal = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  if (page > totalPages) redirect(checkinHref(id, filtroAtivo, totalPages));
  const lista = filteredList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const FILTROS = [
    { key: "todos",       label: `Todas (${allList.length})` },
    { key: "pendentes",   label: "Pendentes" },
    { key: "confirmadas", label: "Confirmadas" },
  ];

  return (
    <PageContainer width="wide" className="space-y-6 pb-32 pt-8 lg:pb-8">
      <PageHeader title="Check-in" description="Portaria · credenciamento e controle de presença." />

      <div className="grid gap-4 lg:grid-cols-2">
        <MetricGroup
          title="Atletas"
          icon={Users}
          items={[
            { label: "Total de atletas", value: total, tone: "text-blue-700" },
            { label: "Atletas presentes", value: confirmados, tone: "text-success" },
            { label: "Atletas pendentes", value: pendentes, tone: pendentes > 0 ? "text-warning" : "text-ink" },
          ]}
        />
        <MetricGroup
          title="Duplas"
          icon={UserRoundCheck}
          items={[
            { label: "Duplas totais", value: duplas.length, tone: "text-blue-700" },
            { label: "Duplas pendentes", value: duplasPendentes, tone: duplasPendentes > 0 ? "text-warning" : "text-ink" },
            { label: "Duplas confirmadas", value: duplasConfirmadas, tone: "text-success" },
          ]}
        />
      </div>

      <Surface padding="md">
        <CheckinClient championshipId={id} />
      </Surface>

      <section>
        <SectionHeader title="Lista de presença" />

        {total > 0 && (
          <div className="mb-4 mt-3 flex gap-2 overflow-x-auto pb-1">
            {FILTROS.map(({ key, label }) => (
              <Link
                key={key}
                href={checkinHref(id, key, 1)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filtroAtivo === key
                    ? "bg-blue-600 text-white"
                    : "bg-surface-2 text-ink-muted hover:bg-border/60"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        {total === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhuma credencial emitida ainda"
            description="As credenciais são geradas após o pagamento da inscrição."
            className="mt-3"
          />
        ) : lista.length === 0 ? (
          <EmptyState
            icon={filtroAtivo === "confirmadas" ? UserCheck : UserX}
            title={filtroAtivo === "confirmadas" ? "Nenhuma dupla confirmada ainda" : "Todos confirmados!"}
            className="mt-3"
          />
        ) : (
          <Surface padding="none" className="mt-3 overflow-hidden">
            <ol className="divide-y divide-border">
              {lista.map((item) => {
                if (item.kind === "pair") {
                  return <PairPresenceItem key={item.id} members={item.members} />;
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
          <nav className="mt-4 flex items-center justify-between border-t border-border pt-4" aria-label="Paginacao do check-in">
            <span className="text-sm text-ink-muted">Pagina {page} de {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={checkinHref(id, filtroAtivo, page - 1)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-ink">
                  <ChevronLeft className="size-4" /> Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link href={checkinHref(id, filtroAtivo, page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-ink">
                  Proxima <ChevronRight className="size-4" />
                </Link>
              )}
            </div>
          </nav>
        )}
      </section>
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
        <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
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
