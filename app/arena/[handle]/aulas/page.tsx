import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AulasManager } from "@/components/arena/AulasManager";
import { salvarCancelHoras } from "@/app/arena/aulas/actions";

export default async function AulasPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}/aulas`);

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, cancel_horas_antes")
    .eq("handle", handle)
    .eq("dono_id", user.id)
    .maybeSingle();
  if (!arena) redirect("/arena");

  const { data: aulas } = await supabase
    .from("arena_classes")
    .select("id, titulo, horario, duracao_minutos, dias_semana, ativo, nivel, max_alunos")
    .eq("arena_id", arena.id)
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  const cancelHoras = arena.cancel_horas_antes ?? 2;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Aulas e treinos</h1>
        <p className="text-sm text-gray-400">Horários recorrentes usados na Agenda do painel.</p>
      </div>

      <AulasManager aulas={aulas ?? []} arenaId={arena.id} />

      {/* Regras de presença */}
      <section className="rounded-2xl bg-gray-50 p-5 ring-1 ring-black/5">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-700">Regras de presença</h2>
        </div>
        <form action={salvarCancelHoras} className="mt-3 space-y-2">
          <input type="hidden" name="arena_id" value={arena.id} />
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
  );
}
