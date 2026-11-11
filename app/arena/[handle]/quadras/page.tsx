import { redirect } from "next/navigation";
import { LayoutGrid, Plus, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Gestão de Quadras — RankFTV Arena",
  description: "Cadastre e gerencie a ocupação das quadras de areia da sua arena.",
};

export default async function QuadrasArenaPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}/quadras`);

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle, dono_id")
    .eq("handle", handle)
    .maybeSingle();

  if (!arena) redirect("/arena");

  // Quadras de areia padrão da arena (ou estrutura configurável)
  const quadras = [
    { id: "1", nome: "Quadra 1 (Principal)", tipo: "Areia Especial Futevôlei", coberta: false, iluminacao: true, status: "ativa" },
    { id: "2", nome: "Quadra 2", tipo: "Areia Especial Futevôlei", coberta: false, iluminacao: true, status: "ativa" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-ink">
              <LayoutGrid className="size-3 text-brand" />
              Infraestrutura
            </span>
            <span className="text-xs font-medium text-gray-500">{arena.nome}</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
            Gestão de Quadras
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Configure as quadras de areia disponíveis para aulas, treinos e locações avulsas.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover active:scale-95"
        >
          <Plus className="size-4" />
          Adicionar Quadra
        </button>
      </div>

      {/* Grid de Quadras */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quadras.map((q) => (
          <div
            key={q.id}
            className="flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="size-3" />
                  Disponível para aulas
                </span>
                <span className="text-xs font-semibold text-gray-400">ID #{q.id}</span>
              </div>

              <h2 className="mt-3 text-lg font-bold text-gray-900">{q.nome}</h2>
              <p className="mt-1 text-xs text-gray-500">{q.tipo}</p>

              <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-semibold text-gray-600">
                <span className="rounded-md bg-gray-100 px-2 py-1">
                  {q.coberta ? "Quadra Coberta" : "Céu Aberto"}
                </span>
                <span className="rounded-md bg-gray-100 px-2 py-1">
                  {q.iluminacao ? "Com Iluminação Noturna" : "Sem Refletores"}
                </span>
              </div>
            </div>

            <div className="mt-5 border-t border-gray-100 pt-3 flex items-center justify-between text-xs">
              <span className="text-gray-500">Grade semanal:</span>
              <span className="font-bold text-brand-ink">Turmas ativas vinculadas</span>
            </div>
          </div>
        ))}

        {/* Card Adicionar Nova */}
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 text-center transition hover:border-brand hover:bg-brand-soft/40">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gray-200/80 text-gray-600">
            <Plus className="size-5" />
          </div>
          <p className="mt-2 text-sm font-bold text-gray-800">Nova Quadra de Areia</p>
          <p className="text-xs text-gray-500">Aumente a capacidade de turmas simultâneas</p>
        </div>
      </div>
    </div>
  );
}
