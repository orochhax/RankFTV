import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronRight, Clock, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AceitarAlunoButton } from "@/components/arena/AceitarAlunoButton";
import { CopyCodeButton } from "@/components/arena/CopyCodeButton";
import { generateOccurrences, todayISOArena, NIVEL_LABEL, type ArenaClassRow } from "@/lib/arena-dates";

type ProfileRow = { nome: string; username: string; foto_url: string | null };
function perfil(raw: unknown): ProfileRow | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return (raw[0] as ProfileRow) ?? null;
  return raw as ProfileRow;
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
      .select("id, titulo, horario, duracao_minutos, dias_semana, nivel, max_alunos, ativo")
      .eq("arena_id", arena.id)
      .eq("ativo", true)
      .order("horario", { ascending: true }),
  ]);

  const alunos    = alunosRes.data ?? [];
  const ativos    = alunos.filter((a) => a.status === "ativo");
  const pendentes = alunos.filter((a) => a.status === "pendente");

  const classes: ArenaClassRow[] = (aulasRes.data ?? []).map((c) => ({
    id: c.id,
    titulo: c.titulo,
    horario: c.horario,
    duracaoMinutos: c.duracao_minutos ?? 60,
    diasSemana: c.dias_semana ?? [],
    nivel: c.nivel,
    maxAlunos: c.max_alunos,
    ativo: c.ativo,
  }));

  const hoje = todayISOArena();
  const aulasHoje = generateOccurrences(classes, hoje, hoje);

  const presencasMap = new Map<string, number>();
  if (aulasHoje.length > 0) {
    const { data: presencas } = await supabase
      .from("arena_attendance")
      .select("class_id")
      .eq("arena_id", arena.id)
      .eq("data", hoje);
    for (const p of presencas ?? []) {
      presencasMap.set(p.class_id, (presencasMap.get(p.class_id) ?? 0) + 1);
    }
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
          <p className="text-xs text-gray-400">Aulas hoje</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{aulasHoje.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* ── Hoje ── */}
          <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-700">Hoje</h2>
              </div>
              <Link
                href={`/arena/${arena.handle}/agenda`}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Ver agenda completa <ChevronRight className="size-3.5" />
              </Link>
            </div>

            {aulasHoje.length === 0 ? (
              <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
                Nenhuma aula hoje.
              </p>
            ) : (
              <ul className="space-y-2">
                {aulasHoje.map((aula) => {
                  const confirmados = presencasMap.get(aula.classId) ?? 0;
                  const nivelLabel = aula.nivel ? NIVEL_LABEL[aula.nivel] ?? aula.nivel : "Todos os níveis";
                  const temLimite = aula.maxAlunos != null;
                  const lotada = temLimite && confirmados >= (aula.maxAlunos as number);
                  return (
                    <li key={`${aula.classId}-${aula.date}`}>
                      <Link
                        href={`/arena/${arena.handle}/aula/${aula.classId}?data=${aula.date}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-black/5 transition-colors hover:bg-blue-50 hover:ring-blue-200"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {aula.horaInicio && (
                              <span className="flex items-center gap-1 text-xs font-bold text-blue-600">
                                <Clock className="size-3.5" />
                                {aula.horaInicio}
                                {aula.horaFim && `–${aula.horaFim}`}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-sm font-medium text-gray-900">{aula.titulo}</p>
                          <p className="text-xs text-gray-400">{nivelLabel}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${lotada ? "bg-red-50 text-red-600" : "bg-white text-gray-500 ring-1 ring-black/5"}`}>
                          {temLimite ? `${confirmados}/${aula.maxAlunos}` : confirmados}
                          {lotada && " · lotada"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
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
