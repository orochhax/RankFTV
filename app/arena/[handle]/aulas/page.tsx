import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AulasManager } from "@/components/arena/AulasManager";
import { EquipeManager } from "@/components/arena/EquipeManager";
import { salvarCancelHoras } from "@/app/arena/aulas/actions";
import { hhmm } from "@/lib/arena-dates";

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
    .select("id, nome, cancel_horas_antes, dono_id")
    .eq("handle", handle)
    .maybeSingle();
  if (!arena) redirect("/arena");

  const isDono = arena.dono_id === user.id;
  if (!isDono) {
    const { data: staffAuth } = await supabase
      .from("arena_staff")
      .select("id")
      .eq("arena_id", arena.id)
      .eq("user_id", user.id)
      .eq("papel", "gerente")
      .eq("status", "aceito")
      .maybeSingle();
    if (!staffAuth) redirect("/arena");
  }

  const [{ data: aulas }, { data: staffRows }] = await Promise.all([
    supabase
      .from("arena_classes")
      .select("id, titulo, hora_inicio, hora_fim, dias_semana, ativo, nivel, publico, max_alunos, valor_avulso, professor_id")
      .eq("arena_id", arena.id)
      .eq("ativo", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("arena_staff")
      .select("id, user_id, papel, profiles(nome, username)")
      .eq("arena_id", arena.id)
      .eq("status", "aceito"),
  ]);

  type StaffProfile = { nome: string; username: string };
  function perfilDe(raw: unknown): StaffProfile | null {
    if (!raw) return null;
    return Array.isArray(raw) ? (raw[0] as StaffProfile) ?? null : (raw as StaffProfile);
  }
  const staffList = (staffRows ?? []).map((s) => ({
    id: s.id,
    userId: s.user_id as string,
    papel: s.papel as "professor" | "gerente",
    nome: perfilDe(s.profiles)?.nome ?? "—",
    username: perfilDe(s.profiles)?.username ?? "",
  }));
  const professorOpcoes = staffList.map((s) => ({ userId: s.userId, nome: s.nome }));

  const cancelHoras = arena.cancel_horas_antes ?? 2;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Aulas e treinos</h1>
        <p className="text-sm text-gray-400">Horários recorrentes usados na Agenda do painel.</p>
      </div>

      <AulasManager
        aulas={(aulas ?? []).map((a) => ({ ...a, hora_inicio: hhmm(a.hora_inicio), hora_fim: hhmm(a.hora_fim) }))}
        arenaId={arena.id}
        staff={professorOpcoes}
      />

      {/* Equipe: professores e gerentes autorizados — só o dono gerencia */}
      {isDono && <EquipeManager arenaId={arena.id} equipe={staffList} />}

      {/* Regras de presença */}
      {isDono && (
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
      )}
    </div>
  );
}
