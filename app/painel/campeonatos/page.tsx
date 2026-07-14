import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight, MapPin, Plus, Tag, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyChampionships } from "@/lib/supabase/championships";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateRangeBR } from "@/lib/format";

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

  const abertos   = todos.filter((c) => c.status === "inscricoes_abertas" || c.status === "em_andamento");
  const rascunhos = todos.filter((c) => c.status === "rascunho");
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

  const FILTROS = [
    { key: "todos",     label: `Todos (${todos.length})` },
    { key: "aberto",    label: `Abertos (${abertos.length})` },
    { key: "rascunho",  label: `Rascunhos (${rascunhos.length})` },
    { key: "encerrado", label: `Encerrados (${encerrados.length})` },
  ];

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <Link
            href="/painel"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Painel
          </Link>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Meus campeonatos</h1>
            <Link
              href="/painel/novo-campeonato"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <Plus className="size-4" /> Criar campeonato
            </Link>
          </div>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-4xl space-y-4">

          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTROS.map(({ key, label }) => (
              <Link
                key={key}
                href={key === "aberto" ? "/painel/campeonatos" : `/painel/campeonatos?filtro=${key}`}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filtroAtivo === key
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {lista.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center ring-1 ring-black/5">
              <p className="text-sm text-gray-500">
                {filtroAtivo === "aberto"   ? "Nenhum campeonato aberto no momento." :
                 filtroAtivo === "rascunho" ? "Nenhum rascunho salvo." :
                 filtroAtivo === "todos"    ? "Nenhum campeonato criado ainda." :
                                             "Nenhum campeonato encerrado."}
              </p>
              {filtroAtivo === "aberto" && (
                <Link
                  href="/painel/novo-campeonato"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus className="size-4" /> Criar campeonato
                </Link>
              )}
            </div>
          ) : (
            <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              {lista.map((c) => (
                <li key={c.id}>
                  <Link
                    href={
                      c.status === "rascunho"
                        ? `/painel/campeonatos/${c.id}/criado`
                        : `/painel/campeonatos/${c.id}`
                    }
                    className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900">{c.nome}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {formatDateRangeBR(c.dataInicio, c.dataFim)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {c.cidade}-{c.estado}
                        </span>
                        <span className="flex items-center gap-1">
                          <Tag className="size-3" />
                          {c.categorias.length}{" "}
                          {c.categorias.length === 1 ? "categoria" : "categorias"}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                    <ChevronRight className="size-4 shrink-0 text-gray-300" />
                  </Link>
                </li>
              ))}
            </ol>
          )}

          <Link
            href="/termos"
            className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5 transition-colors hover:bg-gray-100"
          >
            <FileText className="size-5 shrink-0 text-gray-400" />
            <span className="flex-1 text-sm font-medium text-gray-700">Termos de uso</span>
            <ChevronRight className="size-4 shrink-0 text-gray-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}
