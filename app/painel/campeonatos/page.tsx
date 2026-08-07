import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FileText, ChevronLeft, ChevronRight, Trophy, CalendarCheck, FilePenLine, Archive } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyChampionshipsPage, type OrganizerChampionshipFilter } from "@/lib/supabase/championships";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/shell/StatCard";
import { EmptyState } from "@/components/shell/EmptyState";
import { MeusCampeonatosGrid, type OrganizerChampSummary } from "@/components/painel/MeusCampeonatosGrid";

export default async function MeusCampeonatosPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; page?: string }>;
}) {
  const { filtro, page: pageParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const filtroAtivo: OrganizerChampionshipFilter =
    filtro === "rascunho"  ? "rascunho"  :
    filtro === "encerrado" ? "encerrado" :
    filtro === "todos"     ? "todos"     : "aberto";

  const parsedPage = Number.parseInt(String(pageParam ?? "1"), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = 12;
  const result = await getMyChampionshipsPage(user.id, filtroAtivo, page, pageSize);
  const lista = result.items;
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  if (page > totalPages) {
    redirect(`/painel/campeonatos?filtro=${filtroAtivo}&page=${totalPages}`);
  }

  const resumo: OrganizerChampSummary[] = lista.map((c) => ({
    id: c.id,
    nome: c.nome,
    dataInicio: c.dataInicio,
    dataFim: c.dataFim,
    cidade: c.cidade,
    estado: c.estado,
    status: c.status,
    categoriasCount: c.categorias.length,
    bannerUrl: c.bannerUrl ?? null,
    bannerFrom: c.bannerFrom,
    bannerTo: c.bannerTo,
  }));

  const FILTROS = [
    { key: "aberto",    label: "Abertos",    count: result.counts.open },
    { key: "todos",     label: "Todos",      count: result.counts.all },
    { key: "rascunho",  label: "Rascunhos",  count: result.counts.draft },
    { key: "encerrado", label: "Encerrados", count: result.counts.closed },
  ];

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader
        title="Meus campeonatos"
        description="Crie, publique e acompanhe todos os seus campeonatos em um só lugar."
        actions={
          <Link
            href="/painel/novo-campeonato"
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            <Plus className="size-4" /> Criar campeonato
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total de campeonatos" value={result.counts.all} icon={Trophy} />
        <StatCard label="Inscrições abertas / em andamento" value={result.counts.open} icon={CalendarCheck} tone="success" />
        <StatCard label="Rascunhos" value={result.counts.draft} icon={FilePenLine} tone="warning" />
        <StatCard label="Encerrados" value={result.counts.closed} icon={Archive} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map(({ key, label, count }) => (
          <Link
            key={key}
            href={key === "aberto" ? "/painel/campeonatos" : `/painel/campeonatos?filtro=${key}`}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filtroAtivo === key
                ? "bg-blue-600 text-white"
                : "bg-surface-2 text-ink-muted hover:bg-border/60"
            }`}
          >
            {label} ({count})
          </Link>
        ))}
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={
            filtroAtivo === "aberto"   ? "Nenhum campeonato aberto no momento" :
            filtroAtivo === "rascunho" ? "Nenhum rascunho salvo" :
            filtroAtivo === "todos"    ? "Nenhum campeonato criado ainda" :
                                          "Nenhum campeonato encerrado"
          }
          actionLabel={filtroAtivo === "aberto" || filtroAtivo === "todos" ? "Criar campeonato" : undefined}
          actionHref={filtroAtivo === "aberto" || filtroAtivo === "todos" ? "/painel/novo-campeonato" : undefined}
        />
      ) : (
        <MeusCampeonatosGrid campeonatos={resumo} />
      )}

      {result.total > 0 && (
        <nav className="flex items-center justify-between border-t border-border pt-4" aria-label="Paginacao dos campeonatos">
          <span className="text-sm text-ink-muted">Pagina {Math.min(page, totalPages)} de {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/painel/campeonatos?filtro=${filtroAtivo}&page=${page - 1}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-ink">
                <ChevronLeft className="size-4" /> Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/painel/campeonatos?filtro=${filtroAtivo}&page=${page + 1}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-ink">
                Proxima <ChevronRight className="size-4" />
              </Link>
            )}
          </div>
        </nav>
      )}

      <Link
        href="/termos"
        className="inline-flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-blue-600"
      >
        <FileText className="size-3.5" /> Termos de uso <ChevronRight className="size-3" />
      </Link>
    </PageContainer>
  );
}
