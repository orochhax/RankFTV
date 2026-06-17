import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, Plus, Tag } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getMyChampionships } from "@/lib/supabase/championships";
import { formatDateRangeBR } from "@/lib/format";

// Áreas de gestão que ainda são só visuais (ficam funcionais na Fase 1).
const AREAS_DE_GESTAO = [
  "Inscrições",
  "Credenciamento/check-in",
  "Camisas/kit",
  "Comunicação",
  "Destaque pago",
];

// Painel do organizador — ver ftv.md seção 8.7. Lê os campeonatos REAIS criados
// pelo usuário logado (Supabase). Financeiro/duplas entram na Fase 1.
export default async function PainelOrganizadorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const campeonatos = await getMyChampionships(user.id);
  const publicados = campeonatos.filter((c) => c.status !== "rascunho").length;
  const rascunhos = campeonatos.filter((c) => c.status === "rascunho").length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Painel do organizador</h1>
        <Link
          href="/painel/novo-campeonato"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="size-4" /> Criar campeonato
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs text-gray-500">Campeonatos</p>
          <p className="text-2xl font-bold text-gray-900">{campeonatos.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs text-gray-500">Publicados</p>
          <p className="text-2xl font-bold text-gray-900">{publicados}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs text-gray-500">Rascunhos</p>
          <p className="text-2xl font-bold text-gray-900">{rascunhos}</p>
        </div>
      </div>

      {campeonatos.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
          <p className="text-sm text-gray-600">
            Você ainda não criou nenhum campeonato.
          </p>
          <Link
            href="/painel/novo-campeonato"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="size-4" /> Criar o primeiro
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {campeonatos.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/campeonatos/${c.id}`}
                    className="font-semibold text-gray-900 hover:text-blue-600"
                  >
                    {c.nome}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-4" />
                      {formatDateRangeBR(c.dataInicio, c.dataFim)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-4" />
                      {c.cidade}-{c.estado}
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag className="size-4" />
                      {c.categorias.length}{" "}
                      {c.categorias.length === 1 ? "categoria" : "categorias"}
                    </span>
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                {AREAS_DE_GESTAO.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        🚧 Inscrições, pagamento, credenciamento, camisas e comunicação ficam
        funcionais na Fase 1 (ftv.md). Por enquanto o campeonato é criado com 0
        inscritos.
      </p>
    </div>
  );
}
