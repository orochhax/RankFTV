import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PresencaClient } from "@/components/arena/PresencaClient";

export default async function PresencaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Encontra a arena do aluno (pega a primeira arena ativa)
  const { data: vinculo } = await supabase
    .from("arena_students")
    .select("arena_id, arenas(id, nome)")
    .eq("user_id", user.id)
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();

  if (!vinculo) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <CalendarCheck className="mx-auto mb-4 size-12 text-gray-200" />
        <p className="font-semibold text-gray-700">Você não está matriculado em nenhuma arena</p>
        <p className="mt-2 text-sm text-gray-400">
          Entre em uma arena para marcar presenças.
        </p>
        <Link
          href="/arenas"
          className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Ver arenas
        </Link>
      </div>
    );
  }

  const arenaRaw = vinculo.arenas;
  const arena = Array.isArray(arenaRaw) ? (arenaRaw[0] as { id: string; nome: string } | undefined) ?? null : (arenaRaw as { id: string; nome: string } | null);
  if (!arena) redirect("/arenas");

  // Dia da semana atual (0=Dom … 6=Sáb), horário de Brasília
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const diaSemana = new Date(hoje + "T12:00:00").getDay();

  // Aulas ativas desta arena que ocorrem hoje
  const { data: aulasHoje } = await supabase
    .from("arena_classes")
    .select("id, titulo, horario")
    .eq("arena_id", arena.id)
    .eq("ativo", true)
    .contains("dias_semana", [diaSemana])
    .order("horario", { ascending: true });

  // Presenças que o aluno já registrou hoje
  const classIds = (aulasHoje ?? []).map((a) => a.id);
  const { data: presencasHoje } = classIds.length > 0
    ? await supabase
        .from("arena_attendance")
        .select("class_id")
        .eq("user_id", user.id)
        .eq("data", hoje)
        .in("class_id", classIds)
    : { data: [] };

  const presencasSet = new Set((presencasHoje ?? []).map((p) => p.class_id));
  const inicioHistorico = new Date(`${hoje}T12:00:00`);
  inicioHistorico.setDate(inicioHistorico.getDate() - 30);
  const inicioHistoricoISO = inicioHistorico.toISOString().split("T")[0];

  // Histórico de presença dos últimos 30 dias
  const { data: historico } = await supabase
    .from("arena_attendance")
    .select("class_id, data, arena_classes(titulo)")
    .eq("user_id", user.id)
    .eq("arena_id", arena.id)
    .gte("data", inicioHistoricoISO)
    .order("data", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen">
      <div className="bg-black px-6 pb-16 pt-6">
        <div className="mx-auto max-w-xl space-y-2">
          <Link
            href="/perfil"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Perfil
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Marcar presença</h1>
          <p className="text-sm text-white/50">{arena.nome}</p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-xl">
          <PresencaClient
            arenaId={arena.id}
            aulasHoje={(aulasHoje ?? []).map((a) => ({
              id:      a.id,
              titulo:  a.titulo,
              horario: a.horario,
              jaFez:   presencasSet.has(a.id),
            }))}
            historico={(historico ?? []).map((h) => ({
              data:    h.data,
              titulo:  (h.arena_classes as { titulo?: string } | null)?.titulo ?? "Treino",
            }))}
            hoje={hoje}
          />
        </div>
      </div>
    </div>
  );
}
