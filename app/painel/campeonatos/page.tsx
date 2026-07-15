import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FileText, ChevronRight, Trophy, CalendarCheck, FilePenLine, Archive } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyChampionships } from "@/lib/supabase/championships";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/shell/StatCard";
import { EmptyState } from "@/components/shell/EmptyState";
import { MeusCampeonatosGrid, type OrganizerChampSummary } from "@/components/painel/MeusCampeonatosGrid";

export default async function MeusCampeonatosPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { filtro } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const todos = await getMyChampionships(user.id);

  const abertos    = todos.filter((c) => c.status === "inscricoes_abertas" || c.status === "em_andamento");
  const rascunhos  = todos.filter((c) => c.status === "rascunho");
  const encerrados = todos.filter((c) => c.status === "encerrado");

  const filtroAtivo =
    filtro === "rascunho"  ? "rascunho"  :
    filtro === "encerrado" ? "encerrado" :
    filtro === "todos"     ? "todos"     : "aberto";

  const lista =
    filtroAtivo === "rascunho"  ? rascunhos :
    filtroAtivo === "encerrado" ? [...encerrados].sort((a, b) => b.dataInicio.localeCompare(a.dataInicio)) :
    filtroAtivo === "todos"     ? [...todos].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio)) :
    [...abertos].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));

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
    { key: "aberto",    label: "Abertos",    count: abertos.length },
    { key: "todos",     label: "Todos",      count: todos.length },
    { key: "rascunho",  label: "Rascunhos",  count: rascunhos.length },
    { key: "encerrado", label: "Encerrados", count: encerrados.length },
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
        <StatCard label="Total de campeonatos" value={todos.length} icon={Trophy} />
        <StatCard label="Inscrições abertas / em andamento" value={abertos.length} icon={CalendarCheck} tone="success" />
        <StatCard label="Rascunhos" value={rascunhos.length} icon={FilePenLine} tone="warning" />
        <StatCard label="Encerrados" value={encerrados.length} icon={Archive} />
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

      <Link
        href="/termos"
        className="inline-flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-blue-600"
      >
        <FileText className="size-3.5" /> Termos de uso <ChevronRight className="size-3" />
      </Link>
    </PageContainer>
  );
}
