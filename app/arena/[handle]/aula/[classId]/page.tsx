import { redirect, notFound } from "next/navigation";
import { Users, Clock, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/Avatar";
import { todayISOArena, dayLabel, NIVEL_LABEL } from "@/lib/arena-dates";

type ArenaRel = { nome: string; handle: string; dono_id: string };
function arenaDe(raw: unknown): ArenaRel | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return (raw[0] as ArenaRel) ?? null;
  return raw as ArenaRel;
}

export default async function AulaDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string; classId: string }>;
  searchParams: Promise<{ data?: string }>;
}) {
  const { handle, classId } = await params;
  const { data: dataParam } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}/aula/${classId}`);

  // Aula + arena (para validar que o dono é o usuário logado)
  const { data: aula } = await supabase
    .from("arena_classes")
    .select("id, titulo, horario, nivel, max_alunos, arena_id, arenas(nome, handle, dono_id)")
    .eq("id", classId)
    .maybeSingle();

  if (!aula) notFound();

  const arena = arenaDe(aula.arenas);
  if (!arena || arena.dono_id !== user.id) redirect("/arena");

  // O handle na URL precisa ser o da arena dona da aula — evita mostrar a
  // contexto de uma arena diferente daquela à qual a aula pertence quando o
  // dono tem várias arenas e chega aqui com o handle errado.
  if (arena.handle !== handle) {
    const qs = dataParam ? `?data=${dataParam}` : "";
    redirect(`/arena/${arena.handle}/aula/${classId}${qs}`);
  }

  const hoje = todayISOArena();
  const dataAula = dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam) ? dataParam : hoje;

  const { data: presencas } = await supabase
    .from("arena_attendance")
    .select("user_id, created_at")
    .eq("class_id", classId)
    .eq("data", dataAula)
    .order("created_at", { ascending: true });

  const userIds = (presencas ?? []).map((p) => p.user_id);
  const { data: perfis } = userIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, nome, username, foto_url")
        .in("id", userIds)
    : { data: [] as { id: string; nome: string; username: string; foto_url: string | null }[] };

  const perfilMap = new Map((perfis ?? []).map((p) => [p.id, p]));

  const confirmados = (presencas ?? []).map((p) => {
    const perfil = perfilMap.get(p.user_id);
    const hora = new Date(p.created_at).toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });
    return {
      id:       p.user_id,
      nome:     perfil?.nome ?? "Aluno",
      username: perfil?.username ?? null,
      fotoUrl:  perfil?.foto_url ?? null,
      hora,
    };
  });

  const dataLabel = dayLabel(dataAula);

  const total     = confirmados.length;
  const temLimite = aula.max_alunos != null;
  const lotada    = temLimite && total >= (aula.max_alunos as number);
  const nivelLabel = aula.nivel ? NIVEL_LABEL[aula.nivel] ?? aula.nivel : null;

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-6 md:px-8 md:py-8">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">{aula.titulo}</h1>
          {nivelLabel && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
              {nivelLabel}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" /> {dataLabel}
          </span>
          {aula.horario && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" /> {aula.horario}
            </span>
          )}
        </div>
      </div>

      {/* Contador de vagas */}
      <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 ring-1 ring-black/5">
        <div className="flex items-center gap-2.5">
          <Users className="size-5 text-blue-500" />
          <span className="text-sm font-semibold text-gray-700">Alunos confirmados</span>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-bold ${
            lotada ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"
          }`}
        >
          {temLimite ? `${total}/${aula.max_alunos}` : total}
          {lotada && " · lotada"}
        </span>
      </div>

      {/* Lista de confirmados */}
      {total === 0 ? (
        <div className="rounded-2xl bg-gray-50 p-8 text-center ring-1 ring-black/5">
          <Users className="mx-auto mb-2 size-8 text-gray-200" />
          <p className="text-sm text-gray-400">
            Nenhum aluno confirmou presença nesse horário ainda.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {confirmados.map((aluno) => (
            <li
              key={aluno.id}
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5"
            >
              <Avatar nome={aluno.nome} color="bg-blue-500" size="md" fotoUrl={aluno.fotoUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{aluno.nome}</p>
                {aluno.username && (
                  <p className="truncate text-xs text-gray-400">@{aluno.username}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-gray-400">
                confirmou {aluno.hora}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
