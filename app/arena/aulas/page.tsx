import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AulasManager } from "@/components/arena/AulasManager";
import { salvarCancelHoras } from "@/app/arena/aulas/actions";

export default async function AulasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome")
    .eq("dono_id", user.id)
    .maybeSingle();

  if (!arena) redirect("/perfil/ativar-arena");

  const { data: aulas } = await supabase
    .from("arena_classes")
    .select("id, titulo, horario, dias_semana, ativo, nivel, max_alunos")
    .eq("arena_id", arena.id)
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  // Antecedência de cancelamento — query separada e tolerante: se a migração
  // add-arena-presenca-planos.sql ainda não rodou, cai no padrão de 2h.
  let cancelHoras = 2;
  const { data: cfg } = await supabase
    .from("arenas")
    .select("cancel_horas_antes")
    .eq("id", arena.id)
    .maybeSingle();
  if (typeof cfg?.cancel_horas_antes === "number") cancelHoras = cfg.cancel_horas_antes;

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-xl space-y-3">
          <Link
            href="/arena"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {arena.nome}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Aulas e treinos</h1>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-xl space-y-8">
          <AulasManager aulas={aulas ?? []} />

          {/* Regras de presença */}
          <section className="rounded-2xl bg-gray-50 p-5 ring-1 ring-black/5">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-gray-700">Regras de presença</h2>
            </div>
            <form action={salvarCancelHoras} className="mt-3 space-y-2">
              <label className="block text-sm text-gray-600">
                O aluno pode desmarcar presença até quantas horas antes da aula?
              </label>
              <div className="flex items-center gap-2">
                <input
                  name="cancel_horas_antes"
                  type="number"
                  min={0}
                  max={72}
                  defaultValue={cancelHoras}
                  className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">horas antes</span>
                <button
                  type="submit"
                  className="ml-auto rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Salvar
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Desmarcar devolve o crédito da semana e libera a vaga pra outro aluno. Padrão: 2 horas.
              </p>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
