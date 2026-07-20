import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronRight, Clock, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AceitarAlunoButton } from "@/components/arena/AceitarAlunoButton";
import { CopyCodeButton } from "@/components/arena/CopyCodeButton";
import {
  generateOccurrences, todayISOArena, weekRangeISO, weekLabel, dayLabelShort, addDaysISO,
  NIVEL_LABEL, hhmm, type ArenaClassRow, type ClassOccurrence,
} from "@/lib/arena-dates";

type ProfileRow = { nome: string; username: string; foto_url: string | null };
function perfil(raw: unknown): ProfileRow | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return (raw[0] as ProfileRow) ?? null;
  return raw as ProfileRow;
}

function AulaCard({
  aula,
  confirmados,
  handle,
  discreta,
}: {
  aula: ClassOccurrence;
  confirmados: number;
  handle: string;
  discreta: boolean;
}) {
  const nivelLabel = aula.nivel ? NIVEL_LABEL[aula.nivel] ?? aula.nivel : "Todos os níveis";
  const temLimite = aula.maxAlunos != null;
  const lotada = temLimite && confirmados >= (aula.maxAlunos as number);
  return (
    <Link
      href={`/arena/${handle}/aula/${aula.classId}?data=${aula.date}`}
      className={`flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-black/5 transition-colors hover:bg-blue-50 hover:ring-blue-200 ${discreta ? "opacity-60" : ""}`}
    >
      <div className="min-w-0">
        {aula.horaInicio && (
          <span className="flex items-center gap-1 text-xs font-bold text-blue-600">
            <Clock className="size-3.5" />
            {aula.horaInicio}
            {aula.horaFim && `–${aula.horaFim}`}
          </span>
        )}
        <p className="truncate text-sm font-medium text-gray-900">{aula.titulo}</p>
        <p className="text-xs text-gray-400">{nivelLabel}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${lotada ? "bg-red-50 text-red-600" : "bg-white text-gray-500 ring-1 ring-black/5"}`}>
        {temLimite ? `${confirmados}/${aula.maxAlunos}` : confirmados}
        {lotada && " · lotada"}
      </span>
    </Link>
  );
}

export default async function ArenaPainelPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: arenaPublica } = await supabase
    .from("arenas")
    .select("id, nome, handle, cidade, estado")
    .eq("handle", handle)
    .eq("dono_id", user.id)
    .maybeSingle();

  if (!arenaPublica) redirect("/arena");

  // invite_code não possui grant de leitura para anon/authenticated.
  const { data: arenaPrivada } = await createAdminClient()
    .from("arenas")
    .select("invite_code")
    .eq("id", arenaPublica.id)
    .single();
  if (!arenaPrivada) redirect("/arena");
  const arena = { ...arenaPublica, invite_code: arenaPrivada.invite_code };

  const [alunosRes, aulasRes] = await Promise.all([
    supabase
      .from("arena_students")
      .select("id, status, data_entrada, valor_mensalidade, profiles(nome, username, foto_url)")
      .eq("arena_id", arena.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("arena_classes")
      .select("id, titulo, hora_inicio, hora_fim, dias_semana, nivel, publico, max_alunos, ativo")
      .eq("arena_id", arena.id)
      .eq("ativo", true)
      .order("hora_inicio", { ascending: true }),
  ]);

  const alunos    = alunosRes.data ?? [];
  const ativos    = alunos.filter((a) => a.status === "ativo");
  const pendentes = alunos.filter((a) => a.status === "pendente");

  const classes: ArenaClassRow[] = (aulasRes.data ?? []).map((c) => ({
    id: c.id,
    titulo: c.titulo,
    horaInicio: hhmm(c.hora_inicio),
    horaFim: hhmm(c.hora_fim),
    diasSemana: c.dias_semana ?? [],
    nivel: c.nivel,
    maxAlunos: c.max_alunos,
    ativo: c.ativo,
    publico: (c.publico ?? "misto") as ArenaClassRow["publico"],
  }));

  const hoje = todayISOArena();
  const { start: inicioSemana, end: fimSemana } = weekRangeISO(hoje);
  const aulasSemana = generateOccurrences(classes, inicioSemana, fimSemana);

  // Chave composta (aula + data), não só class_id — a mesma aula recorrente
  // acontece em vários dias da semana, cada um com sua própria ocupação.
  const presencasMap = new Map<string, number>();
  if (aulasSemana.length > 0) {
    const { data: presencas } = await supabase
      .from("arena_attendance")
      .select("class_id, data")
      .eq("arena_id", arena.id)
      .gte("data", inicioSemana)
      .lte("data", fimSemana);
    for (const p of presencas ?? []) {
      const chave = `${p.class_id}|${p.data}`;
      presencasMap.set(chave, (presencasMap.get(chave) ?? 0) + 1);
    }
  }

  // Sete dias, segunda a domingo, cada um com suas ocorrências já ordenadas
  // (generateOccurrences ordena por data e depois por horário).
  const diasDaSemana = Array.from({ length: 7 }, (_, i) => addDaysISO(inicioSemana, i));
  const aulasPorDia = new Map<string, ClassOccurrence[]>(diasDaSemana.map((d) => [d, []]));
  for (const aula of aulasSemana) {
    aulasPorDia.get(aula.date)?.push(aula);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs text-gray-400">Alunos ativos</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{ativos.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs text-gray-400">Pendentes</p>
          <p className={`mt-1 text-2xl font-bold ${pendentes.length > 0 ? "text-amber-600" : "text-gray-900"}`}>
            {pendentes.length}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs text-gray-400">Aulas ativas</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{classes.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs text-gray-400">Aulas na semana</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{aulasSemana.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* ── Aulas da semana ── */}
          <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-700">Aulas da semana</h2>
              </div>
              <Link
                href={`/arena/${arena.handle}/agenda`}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Ver agenda completa <ChevronRight className="size-3.5" />
              </Link>
            </div>
            <p className="mb-3 text-xs text-gray-400">{weekLabel(hoje)}</p>

            {aulasSemana.length === 0 ? (
              <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
                Nenhuma aula cadastrada nesta semana.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {diasDaSemana.map((dia) => {
                  const aulasDoDia = aulasPorDia.get(dia) ?? [];
                  const isHoje = dia === hoje;
                  const isPassado = dia < hoje;
                  return (
                    <div
                      key={dia}
                      className={`rounded-xl p-3 ring-1 ${
                        isHoje ? "bg-blue-50 ring-blue-200" : "bg-gray-50/60 ring-black/5"
                      } ${isPassado && !isHoje ? "opacity-60" : ""}`}
                    >
                      <p className={`mb-2 text-xs font-semibold ${isHoje ? "text-blue-700" : "text-gray-500"}`}>
                        {dayLabelShort(dia)}
                        {isHoje && <span className="ml-1.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">HOJE</span>}
                      </p>
                      {aulasDoDia.length === 0 ? (
                        <p className="text-xs text-gray-400">Nenhuma aula</p>
                      ) : (
                        <ul className="space-y-2">
                          {aulasDoDia.map((aula) => (
                            <li key={`${aula.classId}-${aula.date}`}>
                              <AulaCard
                                aula={aula}
                                confirmados={presencasMap.get(`${aula.classId}|${aula.date}`) ?? 0}
                                handle={arena.handle}
                                discreta={isPassado && !isHoje}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Pedidos pendentes ── */}
          {pendentes.length > 0 && (
            <section className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-100">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="size-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-700">
                  Pedidos de entrada ({pendentes.length})
                </h2>
              </div>
              <ul className="space-y-2">
                {pendentes.map((a) => {
                  const p = perfil(a.profiles);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-amber-100"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p?.nome ?? "—"}</p>
                        <p className="text-xs text-gray-400">@{p?.username}</p>
                      </div>
                      <AceitarAlunoButton alunoId={a.id} arenaId={arena.id} />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-6">
          {/* ── Código de convite ── */}
          <div className="rounded-2xl bg-blue-50 px-5 py-4 ring-1 ring-blue-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Código de convite
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className="font-mono text-2xl font-bold tracking-widest text-blue-900">
                {arena.invite_code}
              </span>
              <CopyCodeButton code={arena.invite_code} />
            </div>
            <p className="mt-1 text-xs text-blue-600">
              Alunos acessam <strong>/arenas/{arena.handle}</strong> e usam o código para entrar.
            </p>
          </div>

          {/* ── Alunos ativos ── */}
          <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-700">
                  Alunos ativos ({ativos.length})
                </h2>
              </div>
              <Link
                href={`/arena/${arena.handle}/alunos`}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Ver todos
              </Link>
            </div>
            {ativos.length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
                Nenhum aluno ainda. Compartilhe o código de convite.
              </p>
            ) : (
              <ul className="space-y-2">
                {ativos.slice(0, 5).map((a) => {
                  const p = perfil(a.profiles);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-black/5"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-blue-500" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{p?.nome ?? "—"}</p>
                          <p className="truncate text-xs text-gray-400">@{p?.username}</p>
                        </div>
                      </div>
                      {a.valor_mensalidade && (
                        <span className="shrink-0 text-xs font-medium text-gray-500">
                          R$ {Number(a.valor_mensalidade).toFixed(2).replace(".", ",")}
                        </span>
                      )}
                    </li>
                  );
                })}
                {ativos.length > 5 && (
                  <Link
                    href={`/arena/${arena.handle}/alunos`}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500 ring-1 ring-black/5 hover:bg-gray-100"
                  >
                    Ver mais {ativos.length - 5} alunos
                    <ChevronRight className="size-4 text-gray-300" />
                  </Link>
                )}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
