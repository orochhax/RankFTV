import { redirect, notFound } from "next/navigation";
import { Users, Clock, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayISOArena, dayLabel, NIVEL_LABEL, horarioLabel, PUBLICO_LABEL, hhmm, type PublicoAula } from "@/lib/arena-dates";
import { RosterAula, type RosterAluno } from "@/components/arena/RosterAula";

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

  // Aula + arena (para validar autorização: dono, professor da aula ou gerente)
  const { data: aula } = await supabase
    .from("arena_classes")
    .select("id, titulo, hora_inicio, hora_fim, nivel, publico, max_alunos, valor_avulso, professor_id, arena_id, arenas(nome, handle, dono_id)")
    .eq("id", classId)
    .maybeSingle();

  if (!aula) notFound();

  const arena = arenaDe(aula.arenas);
  if (!arena) redirect("/arena");

  let autorizado = arena.dono_id === user.id || aula.professor_id === user.id;
  if (!autorizado) {
    const { data: staffAuth } = await supabase
      .from("arena_staff")
      .select("id")
      .eq("arena_id", aula.arena_id)
      .eq("user_id", user.id)
      .eq("papel", "gerente")
      .eq("status", "aceito")
      .maybeSingle();
    autorizado = !!staffAuth;
  }
  if (!autorizado) redirect("/arena");

  // O handle na URL precisa ser o da arena dona da aula — evita mostrar a
  // contexto de uma arena diferente daquela à qual a aula pertence quando o
  // dono/gerente tem várias arenas e chega aqui com o handle errado.
  if (arena.handle !== handle) {
    const qs = dataParam ? `?data=${dataParam}` : "";
    redirect(`/arena/${arena.handle}/aula/${classId}${qs}`);
  }

  const hoje = todayISOArena();
  const dataAula = dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam) ? dataParam : hoje;

  // Lista completa via admin — RLS de arena_attendance esconde presença de
  // outros alunos entre eles, mas quem está autorizado aqui já foi
  // verificado acima e precisa ver a lista inteira da aula.
  const admin = createAdminClient();
  const { data: presencas } = await admin
    .from("arena_attendance")
    .select("id, user_id, created_at, status, tipo_cobranca, valor_avulso, pagamento_status, pagamento_erro, finalized_at")
    .eq("class_id", classId)
    .eq("data", dataAula)
    .order("created_at", { ascending: true });

  const userIds = (presencas ?? []).map((p) => p.user_id);
  const { data: perfis } = userIds.length > 0
    ? await admin
        .from("profiles")
        .select("id, nome, username, foto_url")
        .in("id", userIds)
    : { data: [] as { id: string; nome: string; username: string; foto_url: string | null }[] };

  const perfilMap = new Map((perfis ?? []).map((p) => [p.id, p]));

  const alunos: RosterAluno[] = (presencas ?? []).map((p) => {
    const perfil = perfilMap.get(p.user_id);
    const hora = new Date(p.created_at).toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });
    return {
      attendanceId: p.id,
      userId:       p.user_id,
      nome:         perfil?.nome ?? "Aluno",
      username:     perfil?.username ?? null,
      fotoUrl:      perfil?.foto_url ?? null,
      horaReserva:  hora,
      status:       p.status as RosterAluno["status"],
      tipoCobranca: p.tipo_cobranca as RosterAluno["tipoCobranca"],
      valorAvulso:  p.valor_avulso != null ? Number(p.valor_avulso) : null,
      pagamentoStatus: p.pagamento_status as RosterAluno["pagamentoStatus"],
      pagamentoErro: p.pagamento_erro,
      finalizada:   p.finalized_at != null,
    };
  });

  const dataLabel = dayLabel(dataAula);
  const ativos = alunos.filter((a) => a.status === "reservado" || a.status === "presente");
  const total = ativos.length;
  const temLimite = aula.max_alunos != null;
  const lotada = temLimite && total >= (aula.max_alunos as number);
  const nivelLabel = aula.nivel ? NIVEL_LABEL[aula.nivel] ?? aula.nivel : null;
  const publico = (aula.publico ?? "misto") as PublicoAula;

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
          {publico !== "misto" && (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-600">
              {PUBLICO_LABEL[publico]}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" /> {dataLabel}
          </span>
          {hhmm(aula.hora_inicio) && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" /> {horarioLabel(hhmm(aula.hora_inicio), hhmm(aula.hora_fim))}
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

      <RosterAula alunos={alunos} />
    </div>
  );
}
