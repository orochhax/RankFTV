import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Users, UserCheck, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CheckinClient } from "@/components/checkin/CheckinClient";
import { PresenceItem } from "@/components/checkin/PresenceItem";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/shell/StatCard";
import { SectionHeader } from "@/components/shell/SectionHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { Surface } from "@/components/shell/Surface";

type CredentialRow = {
  id: string;
  user_id: string;
  role: string;
  qr_token: string;
  code: string | null;
  checked_in: boolean;
  checkin_at: string | null;
  checked_in_by: string | null;
};

type CredentialDisplay = CredentialRow & {
  nome: string;
  username: string;
  scannerNome: string | null;
};

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
    filtro === "presentes" ? "presentes" :
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

  const { data: directoryData } = await supabase.rpc("organizer_credential_directory", {
    p_championship_id: id,
    p_filter: filtroAtivo,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  type CredentialDirectoryRow = CredentialRow & {
    nome: string;
    username: string;
    scanner_nome: string | null;
  };
  const directory = (directoryData ?? {}) as unknown as {
    items?: CredentialDirectoryRow[];
    total?: number;
    confirmed?: number;
    filteredTotal?: number;
  };
  const lista: CredentialDisplay[] = (directory.items ?? []).map((item) => ({
    ...item,
    scannerNome: item.scanner_nome,
  }));
  const total = Number(directory.total ?? 0);
  const confirmados = Number(directory.confirmed ?? 0);
  const pendentes   = total - confirmados;
  const filteredTotal = Number(directory.filteredTotal ?? 0);
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  if (page > totalPages) redirect(checkinHref(id, filtroAtivo, totalPages));

  const FILTROS = [
    { key: "todos",     label: `Todos (${total})` },
    { key: "pendentes", label: `Pendentes (${pendentes})` },
    { key: "presentes", label: `Presentes (${confirmados})` },
  ];

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader title="Check-in" description="Portaria · credenciamento e controle de presença." />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total" value={total} icon={Users} />
        <StatCard label="Confirmados" value={confirmados} icon={UserCheck} tone="success" />
        <StatCard label="Pendentes" value={pendentes} icon={UserX} tone={pendentes > 0 ? "warning" : "default"} />
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
            icon={filtroAtivo === "presentes" ? UserCheck : UserX}
            title={filtroAtivo === "presentes" ? "Nenhum atleta confirmado ainda" : "Todos confirmados!"}
            className="mt-3"
          />
        ) : (
          <Surface padding="none" className="mt-3 overflow-hidden">
            <ol className="divide-y divide-border">
              {lista.map((c) =>
                c.checked_in && c.checkin_at ? (
                  // Presente — clicável, mostra quem escaneou
                  <PresenceItem
                    key={c.id}
                    nome={c.nome}
                    username={c.username}
                    checkinAt={c.checkin_at}
                    scannerNome={c.scannerNome}
                  />
                ) : (
                  // Pendente — linha simples
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2">
                      <span className="text-xs font-bold text-ink-muted">?</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{c.nome}</p>
                      {c.username && (
                        <p className="text-xs text-ink-muted">@{c.username}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-muted">
                      Pendente
                    </span>
                  </li>
                )
              )}
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
